import { clinicUrl } from '../clinic'
import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  FileClock,
  ImageUp,
  Pill,
  ShieldAlert,
  Stethoscope,
  X,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import { formatDate, formatDateTime, formatTime, titleCase } from '../format'
import { preparePrescriptionImage } from '../prescriptionImage'

const todayInManila = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())

const toCents = (value) => Math.round(Number(value || 0) * 100)
const emptyFollowUp = { date: '', startsAt: '', appointmentTypeId: '', notes: '' }

function FollowUpScheduleFields({ followUp, setFollowUp, services }) {
  const [availability, setAvailability] = useState({ loading: false, slots: [], error: '' })

  useEffect(() => {
    if (!followUp.date) {
      setAvailability({ loading: false, slots: [], error: '' })
      return undefined
    }
    let active = true
    setAvailability({ loading: true, slots: [], error: '' })
    api.getDentistAvailability(followUp.date)
      .then(({ slots = [] }) => active && setAvailability({ loading: false, slots, error: '' }))
      .catch((error) => active && setAvailability({ loading: false, slots: [], error: error.message || 'Availability could not be loaded.' }))
    return () => { active = false }
  }, [followUp.date])

  return <>
    <label className="mt-5 block text-sm font-extrabold">Date<input className="input-field mt-2" min={todayInManila()} required type="date" value={followUp.date} onChange={(event) => setFollowUp({ ...followUp, date: event.target.value, startsAt: '' })} /></label>
    <label className="mt-4 block text-sm font-extrabold">Service<select className="input-field mt-2" required value={followUp.appointmentTypeId} onChange={(event) => setFollowUp({ ...followUp, appointmentTypeId: event.target.value })}><option value="">Choose service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
    {followUp.date && <div className="mt-4"><p className="text-sm font-extrabold">Available one-hour schedule</p>
      {availability.loading ? <p className="mt-2 text-xs text-ink/45">Checking your schedule…</p>
        : availability.error ? <p className="mt-2 text-xs text-[#914b22]">{availability.error}</p>
          : availability.slots.length ? <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{availability.slots.map((slot) => <button className={`rounded-xl border px-3 py-2.5 text-xs font-extrabold ${followUp.startsAt === slot.startsAt ? 'border-brand bg-brand text-white' : slot.available ? 'border-brand/15 bg-mint text-brand' : 'cursor-not-allowed border-ink/5 bg-ink/5 text-ink/25'}`} disabled={!slot.available} key={slot.startsAt} onClick={() => setFollowUp({ ...followUp, startsAt: slot.startsAt })} type="button">{formatTime(slot.startsAt)}{slot.available ? '' : ' · Booked'}</button>)}</div>
            : <p className="mt-2 text-xs text-ink/45">No clinic hours are available on this date.</p>}
    </div>}
    <label className="mt-4 block text-sm font-extrabold">Patient note<textarea className="input-field mt-2 min-h-24" maxLength="1000" value={followUp.notes} onChange={(event) => setFollowUp({ ...followUp, notes: event.target.value })} /></label>
  </>
}

function CompletionDialog({ appointment, patientId, services, onClose, onComplete }) {
  const [step, setStep] = useState('prescriptionQuestion')
  const [hasPrescription, setHasPrescription] = useState(null)
  const [hasFollowUp, setHasFollowUp] = useState(null)
  const [prescription, setPrescription] = useState({ file: null })
  const [followUp, setFollowUp] = useState(emptyFollowUp)
  const [fee, setFee] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const continuePrescription = () => {
    const file = prescription.file
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Take or choose a clear JPEG, PNG, or WebP photo.')
      return
    }
    setError('')
    setStep('followUpQuestion')
  }

  const continueFollowUp = () => {
    if (!followUp.startsAt || !followUp.appointmentTypeId) {
      setError('Choose the service and one available hour for the follow-up.')
      return
    }
    setError('')
    setStep('fee')
  }

  const finish = async (event) => {
    event.preventDefault()
    const proposedFeeCents = toCents(fee)
    if (proposedFeeCents <= 0) {
      setError('Enter the suggested treatment fee.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const preparedImage = hasPrescription
        ? await preparePrescriptionImage(prescription.file)
        : null
      await api.completeDentistVisit(patientId, appointment.id, {
        proposedFeeCents,
        prescription: hasPrescription ? {
          prescribedOn: todayInManila(),
          genericName: 'Written prescription',
          instructions: 'See attached written prescription image.',
          ...preparedImage,
        } : null,
        followUp: hasFollowUp ? {
          startsAt: followUp.startsAt,
          appointmentTypeId: followUp.appointmentTypeId,
          notes: followUp.notes.trim(),
        } : null,
      })
      onComplete()
    } catch (requestError) {
      setError(requestError.message || 'The visit could not be sent to reception.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
    <section aria-labelledby="complete-visit-heading" aria-modal="true" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[30px] bg-white p-5 soft-shadow sm:p-7" role="dialog">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand/60">Finish visit</p><h2 className="mt-1 text-2xl font-extrabold" id="complete-visit-heading">{appointment.typeName}</h2><p className="mt-1 text-sm text-ink/45">{formatDateTime(appointment.startsAt)}</p></div>
        <button aria-label="Close visit completion" className="rounded-xl bg-cream p-2.5 text-ink/55" disabled={busy} type="button" onClick={onClose}><X size={19} /></button>
      </div>

      {step === 'prescriptionQuestion' && <div className="mt-7"><h3 className="text-xl font-extrabold">Does the patient need a medication prescription?</h3><p className="mt-2 text-sm text-ink/50">If yes, you will upload the written prescription.</p><div className="mt-6 grid grid-cols-2 gap-3"><button className="rounded-2xl border border-ink/10 px-5 py-3 font-extrabold" type="button" onClick={() => { setHasPrescription(false); setStep('followUpQuestion') }}>No</button><button className="rounded-2xl bg-brand px-5 py-3 font-extrabold text-white" type="button" onClick={() => { setHasPrescription(true); setStep('prescription') }}>Yes</button></div></div>}

      {step === 'prescription' && <div className="mt-7"><h3 className="text-xl font-extrabold">Take a photo of the written prescription</h3><p className="mt-2 text-sm text-ink/50">Make sure the full prescription is readable and well lit. Large photos are compressed automatically to 2 MB or less.</p><label className="mt-5 block text-sm font-extrabold">Prescription photo<input accept="image/jpeg,image/png,image/webp" capture="environment" className="mt-2 block w-full text-xs text-ink/55" type="file" onChange={(event) => setPrescription({ file: event.target.files?.[0] || null })} /></label><button className="mt-6 w-full rounded-2xl bg-brand px-5 py-3 font-extrabold text-white" type="button" onClick={continuePrescription}>Next</button></div>}

      {step === 'followUpQuestion' && <div className="mt-7"><h3 className="text-xl font-extrabold">Should the patient return for a follow-up?</h3><p className="mt-2 text-sm text-ink/50">If yes, choose an open hour. The appointment will be confirmed immediately.</p><div className="mt-6 grid grid-cols-2 gap-3"><button className="rounded-2xl border border-ink/10 px-5 py-3 font-extrabold" type="button" onClick={() => { setHasFollowUp(false); setStep('fee') }}>No</button><button className="rounded-2xl bg-brand px-5 py-3 font-extrabold text-white" type="button" onClick={() => { setHasFollowUp(true); setStep('followUp') }}>Yes</button></div></div>}

      {step === 'followUp' && <div className="mt-7"><h3 className="text-xl font-extrabold">Book the follow-up</h3><FollowUpScheduleFields followUp={followUp} setFollowUp={setFollowUp} services={services} /><button className="mt-6 w-full rounded-2xl bg-brand px-5 py-3 font-extrabold text-white" type="button" onClick={continueFollowUp}>Confirm schedule</button></div>}

      {step === 'fee' && <form className="mt-7" onSubmit={finish}><h3 className="text-xl font-extrabold">What is the suggested treatment fee?</h3><p className="mt-2 text-sm text-ink/50">Reception can review and edit this amount before collecting payment.</p><label className="mt-5 block text-sm font-extrabold">Suggested fee<input autoFocus className="input-field mt-2" min="0.01" placeholder="0.00" required step="0.01" type="number" value={fee} onChange={(event) => setFee(event.target.value)} /></label><button className="mt-6 w-full rounded-2xl bg-brand px-5 py-3 font-extrabold text-white disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Sending to reception…' : 'Done — send to billing'}</button></form>}

      {error && <p className="mt-5 rounded-2xl bg-[#fff0e7] p-4 text-sm text-[#914b22]" role="alert">{error}</p>}
    </section>
  </div>
}

export default function DentistPatientPage() {
  const { id } = useParams()
  const [state, setState] = useState({ loading: true, chart: null, error: null })
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [prescription, setPrescription] = useState({ file: null })
  const [followUp, setFollowUp] = useState(emptyFollowUp)
  const [savingPrescription, setSavingPrescription] = useState(false)
  const [savingFollowUp, setSavingFollowUp] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)

  const load = useCallback(() => {
    setState({ loading: true, chart: null, error: null })
    api.getDentistPatient(id)
      .then((chart) => setState({ loading: false, chart, error: null }))
      .catch((error) => setState({ loading: false, chart: null, error }))
  }, [id])
  useEffect(load, [load])

  async function uploadPrescription(event) {
    event.preventDefault()
    const file = prescription.file
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setActionError('Choose a JPEG, PNG, or WebP prescription image.')
      return
    }
    setSavingPrescription(true)
    setActionError('')
    setMessage('')
    try {
      const preparedImage = await preparePrescriptionImage(file)
      await api.uploadDentistPrescription(id, {
        prescribedOn: todayInManila(),
        genericName: 'Written prescription',
        instructions: 'See attached written prescription image.',
        ...preparedImage,
      })
      setPrescription({ file: null })
      setMessage('Written prescription photo saved.')
      load()
    } catch (error) {
      setActionError(error.message || 'The prescription could not be saved.')
    } finally {
      setSavingPrescription(false)
    }
  }

  async function saveFollowUp(event) {
    event.preventDefault()
    setSavingFollowUp(true)
    setActionError('')
    setMessage('')
    try {
      await api.createDentistFollowUp(id, {
        startsAt: followUp.startsAt,
        appointmentTypeId: followUp.appointmentTypeId,
        notes: followUp.notes.trim(),
      })
      setFollowUp(emptyFollowUp)
      setMessage('Follow-up appointment confirmed and added to your schedule.')
      load()
    } catch (error) {
      setActionError(error.message || 'The next visit could not be saved.')
    } finally {
      setSavingFollowUp(false)
    }
  }

  if (state.loading) return <LoadingState label="Opening patient workspace…" />
  if (state.error) return <ErrorState error={state.error} onRetry={load} />

  const { patient, appointments = [], completionAppointment, records = [], treatmentPlans = [], prescriptions = [], followUps = [], services = [] } = state.chart
  const medicalAlerts = [
    ['Allergies', patient.allergies],
    ['Medical conditions', patient.medicalConditions],
    ['Current medications', patient.currentMedications],
  ]

  return <>
    <Link className="mb-5 inline-flex items-center gap-2 text-sm font-extrabold text-brand" to="/dentist/patients"><ArrowLeft size={16} /> Back to patients</Link>

    <section className="rounded-[30px] bg-brand p-6 text-white soft-shadow sm:p-8">
      <p className="text-xs font-extrabold uppercase tracking-[.18em] text-white/60">Patient workspace</p>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{patient.displayName}</h1>
          <p className="mt-2 text-sm text-white/70">Patient ID {patient.patientNumber} · Age {patient.age ?? 'not recorded'} · {titleCase(patient.gender || 'not recorded')}</p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end"><div className="rounded-2xl bg-white/10 px-4 py-3 text-xs font-bold">BP {patient.bloodPressureSystolic && patient.bloodPressureDiastolic ? `${patient.bloodPressureSystolic}/${patient.bloodPressureDiastolic} mmHg` : 'not recorded'} · Weight {patient.weightKg ? `${patient.weightKg} kg` : 'not recorded'}</div>{completionAppointment && <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-brand" type="button" onClick={() => setShowCompletion(true)}><CheckCircle2 size={18} /> Done</button>}</div>
      </div>
    </section>

    <section className="mt-5 grid gap-3 md:grid-cols-3" aria-label="Medical safety information">
      {medicalAlerts.map(([label, value]) => <article className={`rounded-2xl p-4 ${value ? 'bg-[#fff0e7] text-[#783e1c]' : 'bg-white text-ink/55'}`} key={label}>
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.12em]">{value ? <ShieldAlert size={15} /> : <AlertTriangle size={15} />}{label}</p>
        <p className="mt-2 whitespace-pre-line text-sm leading-6">{value || 'Not recorded'}</p>
      </article>)}
    </section>
    <p className="mt-3 text-xs text-ink/40">Medical history last reviewed: {formatDate(patient.medicalHistoryReviewedAt)}</p>

    {message && <p className="mt-5 rounded-2xl bg-mint p-4 text-sm font-bold text-brand" role="status">{message}</p>}
    {actionError && <p className="mt-5 rounded-2xl bg-[#fff0e7] p-4 text-sm text-[#914b22]" role="alert">{actionError}</p>}

    <div className="mt-7 grid gap-6 xl:grid-cols-[1.35fr_.8fr]">
      <div className="space-y-6">
        <section className="rounded-3xl bg-white p-5 soft-shadow sm:p-6">
          <div className="flex items-center gap-3"><FileClock className="text-brand" size={21} /><h2 className="text-xl font-extrabold">Treatment history</h2></div>
          {records.length ? <div className="mt-5 divide-y divide-ink/8">
            {records.map((record) => <article className="py-4 first:pt-0" key={record.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h3 className="font-extrabold">{record.procedureName}</h3><p className="mt-1 text-xs text-ink/45">{record.dentistName}</p></div>
                <p className="text-xs font-bold text-brand">{formatDate(record.treatedOn)}</p>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink/60">{record.patientSummary}</p>
            </article>)}
          </div> : <div className="mt-5"><EmptyState icon={Stethoscope} title="No treatment records" message="Completed clinical records will appear here." /></div>}
        </section>

        <section className="rounded-3xl bg-white p-5 soft-shadow sm:p-6">
          <div className="flex items-center gap-3"><CalendarPlus className="text-brand" size={21} /><h2 className="text-xl font-extrabold">Appointments & care plans</h2></div>
          {!!treatmentPlans.length && <div className="mt-5 space-y-3">{treatmentPlans.map((plan) => <article className="rounded-2xl bg-mint/45 p-4" key={plan.id}><div className="flex flex-wrap justify-between gap-2"><p className="font-extrabold">{plan.title}</p><span className="text-xs font-bold uppercase text-brand">{titleCase(plan.status)}</span></div><p className="mt-2 text-sm leading-6 text-ink/55">{plan.patientSummary}</p><p className="mt-2 text-xs font-bold text-brand">Next recommended: {formatDate(plan.nextRecommendedOn)}</p></article>)}</div>}
          {appointments.length ? <div className="mt-5 divide-y divide-ink/8">{appointments.map((appointment) => <div className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:justify-between" key={appointment.id}><div><p className="font-bold">{appointment.typeName}</p><p className="text-xs text-ink/45">{appointment.dentistName}</p></div><p className="text-xs font-bold text-brand">{formatDateTime(appointment.startsAt)} · {titleCase(appointment.status)}</p></div>)}</div> : <p className="mt-5 text-sm text-ink/45">No appointments recorded.</p>}
        </section>

        <section className="rounded-3xl bg-white p-5 soft-shadow sm:p-6">
          <div className="flex items-center gap-3"><Pill className="text-brand" size={21} /><h2 className="text-xl font-extrabold">Prescription records</h2></div>
          {prescriptions.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{prescriptions.map((item) => <article className="overflow-hidden rounded-2xl border border-ink/8" key={item.id}>
            <a href={clinicUrl(`/api/dentist/prescriptions/${item.id}/image`)} target="_blank" rel="noreferrer"><img alt={`Written prescription for ${item.genericName}`} className="h-44 w-full bg-cream object-contain" src={clinicUrl(`/api/dentist/prescriptions/${item.id}/image`)} /></a>
            <div className="p-4"><p className="text-sm font-extrabold">Written prescription</p><p className="mt-2 text-xs font-bold text-ink/40">{formatDate(item.prescribedOn)} · {item.dentistName}</p></div>
          </article>)}</div> : <p className="mt-5 text-sm text-ink/45">No prescription images uploaded.</p>}
        </section>
      </div>

      <aside className="space-y-6">
        <form className="rounded-3xl bg-white p-5 soft-shadow sm:p-6" onSubmit={uploadPrescription}>
          <div className="flex items-center gap-3"><ImageUp className="text-brand" size={21} /><h2 className="text-lg font-extrabold">Upload written prescription</h2></div>
          <p className="mt-2 text-xs leading-5 text-ink/45">Take a clear photo. No medication details need to be retyped. Large photos are compressed automatically to 2 MB or less.</p>
          <label className="mt-5 block text-sm font-extrabold">Prescription photo<input accept="image/jpeg,image/png,image/webp" capture="environment" className="mt-2 block w-full text-xs text-ink/55" required type="file" onChange={(event) => setPrescription({ file: event.target.files?.[0] || null })} /></label>
          <button className="mt-5 w-full rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60" disabled={savingPrescription} type="submit">{savingPrescription ? 'Uploading…' : 'Save photo'}</button>
        </form>

        <form className="rounded-3xl bg-white p-5 soft-shadow sm:p-6" onSubmit={saveFollowUp}>
          <div className="flex items-center gap-3"><CalendarPlus className="text-brand" size={21} /><h2 className="text-lg font-extrabold">Plan next visit</h2></div>
          <p className="mt-2 text-xs leading-5 text-ink/45">Choose an open one-hour slot. The appointment is confirmed immediately and blocks your schedule.</p>
          <FollowUpScheduleFields followUp={followUp} setFollowUp={setFollowUp} services={services} />
          <button className="mt-5 w-full rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60" disabled={savingFollowUp || !followUp.startsAt || !followUp.appointmentTypeId} type="submit">{savingFollowUp ? 'Scheduling…' : 'Confirm appointment'}</button>
          {!!followUps.length && <div className="mt-5 border-t border-ink/8 pt-4"><p className="text-xs font-extrabold uppercase tracking-[.12em] text-ink/40">Recent recommendations</p>{followUps.slice(0, 4).map((item) => <div className="mt-3 rounded-xl bg-cream p-3" key={item.id}><p className="text-sm font-extrabold">{item.serviceName || 'Follow-up visit'}</p><p className="mt-1 text-xs text-ink/50">{formatDate(item.recommendedOn)} · {titleCase(item.status)}</p>{item.notes && <p className="mt-2 text-xs leading-5 text-ink/55">{item.notes}</p>}</div>)}</div>}
        </form>
      </aside>
    </div>
    {showCompletion && completionAppointment && <CompletionDialog appointment={completionAppointment} patientId={patient.id} services={services} onClose={() => setShowCompletion(false)} onComplete={() => { setShowCompletion(false); setMessage('Visit finished and sent to reception for billing. Any selected follow-up was confirmed automatically.'); load() }} />}
  </>
}
