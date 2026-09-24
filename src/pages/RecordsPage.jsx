import { clinicUrl } from '../clinic'
import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, CalendarDays, FileCheck2, FileText, Pill, ReceiptText, ShieldCheck, Stethoscope } from 'lucide-react'
import { api } from '../api'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import { formatCurrency, formatDate, formatDateTime, titleCase } from '../format'
import { listFrom, recordView } from '../portalData'

export default function RecordsPage() {
  const [records, setRecords] = useState([])
  const [charges, setCharges] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [recordData, billingData, appointmentData] = await Promise.all([
        api.getRecords(),
        api.getBilling(),
        api.getAppointments('upcoming'),
      ])
      setRecords(listFrom(recordData, 'records'))
      setCharges(listFrom(billingData, 'charges'))
      setPrescriptions(listFrom(recordData, 'prescriptions'))
      setFollowUps(listFrom(recordData, 'followUps'))
      setAppointments(listFrom(appointmentData, 'appointments'))
    } catch (requestError) {
      setError(requestError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const viewedRecords = records.map(recordView)
  const pendingFollowUps = followUps.filter(({ status }) => status === 'pending')
  const linkedAppointments = new Set(viewedRecords.map(({ appointmentId }) => appointmentId).filter(Boolean))
  const history = [
    ...viewedRecords.map((record) => ({
      key: `record-${record.id}`,
      record,
      charge: charges.find(({ appointmentId }) => appointmentId === record.appointmentId),
      date: record.treatedOn,
    })),
    ...charges.filter(({ appointmentId }) => !linkedAppointments.has(appointmentId)).map((charge) => ({
      key: `charge-${charge.id}`,
      record: null,
      charge,
      date: charge.appointmentStartsAt || charge.createdAt,
    })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)))

  return <>
    <section className="mb-8">
      <p className="text-xs font-extrabold uppercase tracking-[.18em] text-brand/60">Your clinic history</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">My records & payments</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/50">Treatment details and related payments are combined into one clear history card for each visit.</p>
    </section>

    <div className="mb-6 flex gap-3 rounded-2xl border border-brand/10 bg-mint/60 p-4">
      <ShieldCheck className="mt-0.5 shrink-0 text-brand" size={19} />
      <p className="text-xs leading-5 text-ink/60">Only patient-safe treatment summaries and clinic-issued payment records appear here. Contact the clinic if you need a complete official copy or invoice.</p>
    </div>

    {loading ? <LoadingState label="Loading your history…" />
      : error ? <ErrorState error={error} onRetry={load} />
        : <div className="space-y-7">
          {(appointments.length || pendingFollowUps.length) && <section className="rounded-3xl bg-white p-5 soft-shadow sm:p-6" aria-label="Upcoming care">
            <div className="flex items-center gap-3"><CalendarClock className="text-brand" size={21} /><div><h2 className="text-xl font-extrabold">Upcoming care</h2><p className="mt-1 text-xs text-ink/45">Confirmed clinic visits and dates recommended by your dentist.</p></div></div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {appointments.map((appointment) => <article className="rounded-2xl bg-mint/45 p-4" key={`appointment-${appointment.id}`}><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-brand/60">Confirmed appointment</p><h3 className="mt-1 font-extrabold">{appointment.typeName}</h3><p className="mt-2 text-xs font-bold text-ink/50">{formatDateTime(appointment.startsAt)} · {appointment.dentistName}</p></article>)}
              {pendingFollowUps.map((item) => <article className="rounded-2xl bg-cream/80 p-4" key={`follow-up-${item.id}`}><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-ink/40">Dentist recommendation · {titleCase(item.status)}</p><h3 className="mt-1 font-extrabold">{item.serviceName || 'Follow-up visit'}</h3><p className="mt-2 text-xs font-bold text-ink/50">Recommended for {formatDate(item.recommendedOn)} · {item.dentistName}</p>{item.notes && <p className="mt-2 text-xs leading-5 text-ink/55">{item.notes}</p>}<p className="mt-2 text-[11px] text-ink/40">Reception will confirm the exact time.</p></article>)}
            </div>
          </section>}

          {!!prescriptions.length && <section className="rounded-3xl bg-white p-5 soft-shadow sm:p-6" aria-label="Prescription history">
            <div className="flex items-center gap-3"><Pill className="text-brand" size={21} /><div><h2 className="text-xl font-extrabold">Written prescriptions</h2><p className="mt-1 text-xs text-ink/45">Photos uploaded by your dentist are kept with your clinic history.</p></div></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{prescriptions.map((item) => <article className="overflow-hidden rounded-2xl border border-ink/8" key={item.id}><a href={clinicUrl(`/api/me/prescriptions/${item.id}/image`)} target="_blank" rel="noreferrer"><img alt="Written prescription" className="h-48 w-full bg-cream object-contain" src={clinicUrl(`/api/me/prescriptions/${item.id}/image`)} /></a><div className="p-4"><p className="text-sm font-extrabold">Written prescription</p><p className="mt-2 text-xs font-bold text-ink/40">{formatDate(item.prescribedOn)} · {item.dentistName}</p></div></article>)}</div>
          </section>}

          {history.length ? <section className="grid gap-5 xl:grid-cols-2" aria-label="Treatment and payment history">
          {history.map(({ key, record, charge, date }) => <article className="rounded-3xl bg-white p-5 soft-shadow sm:p-6" key={key}>
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint text-brand"><FileCheck2 size={22} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-brand/60">Completed treatment</p>{charge && <span className="rounded-full bg-cream px-2 py-1 text-[10px] font-extrabold uppercase text-ink/55">{titleCase(charge.status)}</span>}</div>
                <h2 className="mt-1 text-lg font-extrabold">{record?.procedureName || charge?.description || 'Dental treatment'}</h2>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 rounded-2xl bg-cream/65 p-4 sm:grid-cols-2">
              <div><dt className="flex items-center gap-1.5 text-[10px] font-bold text-ink/40"><CalendarDays size={13} />Treatment date</dt><dd className="mt-1 text-xs font-extrabold">{formatDate(date)}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-[10px] font-bold text-ink/40"><Stethoscope size={13} />Dentist</dt><dd className="mt-1 text-xs font-extrabold">{record?.dentistName || charge?.dentistName}</dd></div>
            </dl>

            {record && <div className="mt-5"><h3 className="text-xs font-extrabold uppercase tracking-[.14em] text-ink/40">Treatment summary</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/65">{record.summary || 'No additional patient summary was provided.'}</p></div>}

            {charge && <div className="mt-5 border-t border-ink/5 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.14em] text-ink/40"><ReceiptText size={15} />Billing & payments</h3><span className="text-[10px] font-bold text-ink/40">PAY-{String(charge.recordNumber).padStart(6, '0')}</span></div>
              <dl className="mt-3 grid grid-cols-3 gap-3 rounded-2xl bg-mint/45 p-4 text-xs"><div><dt className="text-ink/40">Total</dt><dd className="mt-1 font-extrabold">{formatCurrency(charge.totalCents)}</dd></div><div><dt className="text-ink/40">Paid</dt><dd className="mt-1 font-extrabold">{formatCurrency(charge.paidCents)}</dd></div><div><dt className="text-ink/40">Balance</dt><dd className="mt-1 font-extrabold text-brand">{formatCurrency(charge.balanceCents)}</dd></div></dl>
              {!!charge.payments.length && <div className="mt-4 space-y-2">{charge.payments.map((payment) => <div className="flex flex-wrap justify-between gap-2 text-xs text-ink/55" key={payment.id}><span>{formatDate(payment.receivedAt)} · {titleCase(payment.method)}</span><span className="font-extrabold">{formatCurrency(payment.amountCents)}</span></div>)}</div>}
            </div>}
          </article>)}
          </section> : !prescriptions.length && !pendingFollowUps.length && !appointments.length
            ? <EmptyState icon={FileText} title="No history yet" message="Completed treatments, prescriptions, follow-up recommendations, and payment records will appear here." />
            : null}
        </div>}
  </>
}
