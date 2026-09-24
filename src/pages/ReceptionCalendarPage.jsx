import { clinicUrl } from '../clinic'
import { useCallback, useEffect, useState } from 'react'
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  IdCard,
  Phone,
  Search,
  Stethoscope,
  UserRound,
  X,
} from 'lucide-react'
import { api } from '../api'
import { ErrorState, LoadingState } from '../components/PageState'
import { calendarWeek, formatDate, formatTime, titleCase } from '../format'

const manilaToday = () => new Date(Date.now() + 8 * 60 * 60_000).toISOString().slice(0, 10)
const shiftDate = (date, days) => {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
const hourlyTimes = Array.from({ length: 8 }, (_, index) => `${String(index + 9).padStart(2, '0')}:00`)
const manilaDateTime = (value) => {
  const local = new Date(new Date(value).getTime() + 8 * 60 * 60_000).toISOString()
  return { date: local.slice(0, 10), time: local.slice(11, 16) }
}
const clinicTimeForDate = (date) =>
  new Date(`${date}T00:00:00Z`).getUTCDay() === 0
    ? ''
    : hourlyTimes.find((value) => new Date(`${date}T${value}:00+08:00`) > new Date()) || ''

const dayItems = (day) => [
  ...(day.appointments || []).map((item) => ({
    ...item,
    kind: 'appointment',
    kindLabel: `${titleCase(item.status)} appointment`,
    time: item.startsAt,
  })),
  ...(day.appointmentRequests || []).map((item) => ({
    ...item,
    kind: 'request',
    kindLabel: 'Pending request',
    time: item.requestedStartAt,
  })),
].sort((a, b) => String(a.time).localeCompare(String(b.time)))

function BookingDetails({ booking, close, dentists, onRescheduled }) {
  const initialSchedule = manilaDateTime(booking.time)
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState(initialSchedule.date)
  const [time, setTime] = useState(initialSchedule.time)
  const [dentistId, setDentistId] = useState(booking.dentistId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && close()
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [close])

  const serviceName = booking.typeName || booking.serviceName
  const endTime = booking.endsAt || booking.requestedEndAt
  const canReschedule = booking.kind === 'appointment' && ['scheduled', 'confirmed'].includes(booking.status)

  const submitReschedule = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.rescheduleReceptionAppointment(booking.id, {
        startsAt: new Date(`${date}T${time}:00+08:00`).toISOString(),
        dentistId,
      })
      await onRescheduled()
    } catch (requestError) {
      setError(requestError.message || 'The appointment could not be rescheduled.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <section aria-labelledby="booking-details-title" aria-modal="true" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[30px] bg-white p-6 soft-shadow sm:p-8" role="dialog">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand/60">{booking.kindLabel}</p>
          <h2 className="mt-2 text-2xl font-extrabold" id="booking-details-title">{serviceName}</h2>
        </div>
        <button aria-label="Close booking details" className="rounded-xl bg-cream p-2.5 text-ink/55 hover:bg-mint hover:text-brand" onClick={close} type="button"><X size={19} /></button>
      </div>

      <div className="mt-6 rounded-2xl bg-brand p-5 text-white">
        <p className="text-sm font-extrabold">{formatDate(booking.time, { weekday: 'long' })}</p>
        <p className="mt-1 flex items-center gap-2 text-sm text-white/75"><Clock3 size={16} />{formatTime(booking.time)}{endTime ? ` – ${formatTime(endTime)}` : ''}</p>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div><dt className="text-xs font-bold text-ink/40">Patient</dt><dd className="mt-1 font-extrabold">{booking.patient.displayName}</dd></div>
        <div><dt className="flex items-center gap-1.5 text-xs font-bold text-ink/40"><IdCard size={14} /> Patient ID</dt><dd className="mt-1 font-extrabold">{booking.patient.patientNumber}</dd></div>
        <div><dt className="flex items-center gap-1.5 text-xs font-bold text-ink/40"><Stethoscope size={14} /> Dentist</dt><dd className="mt-1 font-extrabold">{booking.dentistName || 'To be assigned'}</dd></div>
        <div><dt className="flex items-center gap-1.5 text-xs font-bold text-ink/40"><Phone size={14} /> Phone</dt><dd className="mt-1 font-extrabold">{booking.patient.phone || 'Not provided'}</dd></div>
      </dl>

      {(booking.patientNote || booking.clinicNote) && <div className="mt-6 space-y-3 border-t border-ink/8 pt-5">
        {booking.patientNote && <div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-ink/40">Patient note</p><p className="mt-1 text-sm leading-6 text-ink/65">{booking.patientNote}</p></div>}
        {booking.clinicNote && <div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-ink/40">Clinic note</p><p className="mt-1 text-sm leading-6 text-ink/65">{booking.clinicNote}</p></div>}
      </div>}

      {canReschedule && !editing && <button className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark" type="button" onClick={() => setEditing(true)}><CalendarClock size={17} /> Change schedule</button>}
      {editing && <form className="mt-6 rounded-2xl bg-cream/70 p-4" onSubmit={submitReschedule}>
        <p className="text-sm font-extrabold">Choose a new one-hour schedule</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-xs font-extrabold text-ink/55">Dentist
            <select className="mt-2 w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold text-ink" required value={dentistId} onChange={(event) => setDentistId(event.target.value)}>
              {dentists.map((dentist) => <option key={dentist.id} value={dentist.id}>{dentist.displayName}</option>)}
            </select>
          </label>
          <label className="text-xs font-extrabold text-ink/55">Date
            <input className="mt-2 w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold text-ink" type="date" min={manilaToday()} required value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="text-xs font-extrabold text-ink/55">Time
            <select className="mt-2 w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold text-ink" required value={time} onChange={(event) => setTime(event.target.value)}>
              {hourlyTimes.map((value) => <option key={value} value={value}>{formatTime(new Date(`2000-01-01T${value}:00+08:00`))}</option>)}
            </select>
          </label>
        </div>
        {error && <p className="mt-3 rounded-xl bg-[#fff0e7] p-3 text-sm text-[#914b22]" role="alert">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button className="rounded-xl bg-brand px-4 py-2.5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || (dentistId === booking.dentistId && date === initialSchedule.date && time === initialSchedule.time)} type="submit">{busy ? 'Saving…' : 'Save new schedule'}</button>
          <button className="rounded-xl px-4 py-2.5 text-xs font-extrabold text-ink/50" disabled={busy} type="button" onClick={() => { setEditing(false); setError('') }}>Cancel</button>
        </div>
      </form>}
    </section>
  </div>
}

function CreateSchedule({ close, dentists, services, initialDate, onCreated }) {
  const [query, setQuery] = useState('')
  const [patients, setPatients] = useState([])
  const [patient, setPatient] = useState(null)
  const [searched, setSearched] = useState(false)
  const [dentistId, setDentistId] = useState(dentists[0]?.id || '')
  const [serviceId, setServiceId] = useState(services[0]?.id || '')
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState(clinicTimeForDate(initialDate))
  const [availability, setAvailability] = useState({ loading: true, slots: [], error: '' })
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && close()
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [close])

  useEffect(() => {
    let active = true
    setAvailability({ loading: true, slots: [], error: '' })
    api.getReceptionAvailability(date)
      .then(({ slots = [] }) => active && setAvailability({ loading: false, slots, error: '' }))
      .catch((requestError) => active && setAvailability({ loading: false, slots: [], error: requestError.message || 'Availability could not be loaded.' }))
    return () => { active = false }
  }, [date])

  const availableTimes = availability.slots
    .filter((slot) => slot.dentistId === dentistId && slot.available)
    .map((slot) => ({ startsAt: slot.startsAt, time: manilaDateTime(slot.startsAt).time }))

  useEffect(() => {
    if (!availability.loading && !availableTimes.some((slot) => slot.time === time)) {
      setTime(availableTimes[0]?.time || '')
    }
  }, [availability.loading, availability.slots, dentistId, time])

  const searchPatients = async () => {
    if (query.trim().length < 2) {
      setError('Enter at least two letters of the patient name or their patient ID.')
      return
    }
    setSearching(true)
    setError('')
    try {
      const data = await api.searchReceptionPatients(query.trim())
      setPatients(data.patients || [])
      setPatient(null)
      setSearched(true)
    } catch (requestError) {
      setError(requestError.message || 'Patient search failed.')
    } finally {
      setSearching(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!patient) {
      setError('Search for and select the patient first.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api.createReceptionAppointment({
        patientId: patient.id,
        dentistId,
        appointmentTypeId: serviceId,
        startsAt: new Date(`${date}T${time}:00+08:00`).toISOString(),
      })
      await onCreated(date)
    } catch (requestError) {
      setError(requestError.message || 'The appointment could not be scheduled.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <form aria-labelledby="create-schedule-title" aria-modal="true" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[30px] bg-white p-6 soft-shadow sm:p-8" onSubmit={submit} role="dialog">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand/60">Reception calendar</p><h2 className="mt-2 text-2xl font-extrabold" id="create-schedule-title">Add schedule</h2><p className="mt-1 text-sm text-ink/45">{formatDate(initialDate, { weekday: 'long' })}</p></div>
        <button aria-label="Close schedule form" className="rounded-xl bg-cream p-2.5 text-ink/55 hover:bg-mint" onClick={close} type="button"><X size={19} /></button>
      </div>

      <div className="mt-6">
        <label className="text-sm font-extrabold">Find registered patient</label>
        <div className="mt-2 flex gap-2">
          <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" size={17} /><input className="input-field !pl-11" placeholder="Patient name or ID" value={query} onChange={(event) => { setQuery(event.target.value); setPatients([]); setPatient(null); setSearched(false) }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); searchPatients() } }} /></div>
          <button className="rounded-xl bg-brand px-4 text-xs font-extrabold text-white disabled:opacity-50" disabled={searching} onClick={searchPatients} type="button">{searching ? 'Searching…' : 'Search'}</button>
        </div>
        {!!patients.length && <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">{patients.map((item) => <button className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm ${patient?.id === item.id ? 'border-brand bg-mint' : 'border-ink/8 hover:bg-cream'}`} key={item.id} onClick={() => { setPatient(item); setError('') }} type="button"><UserRound className="shrink-0 text-brand" size={17} /><span className="min-w-0 flex-1"><strong className="block truncate">{item.displayName}</strong><span className="text-xs text-ink/45">{item.patientNumber}</span></span></button>)}</div>}
        {searched && !patients.length && !searching && <p className="mt-3 text-xs text-ink/45">No registered patient found. <a className="font-extrabold text-brand" href={clinicUrl('/reception/patients')}>Create an account in the Patients tab</a>, then return here.</p>}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-extrabold">Service<select className="input-field mt-2" required value={serviceId} onChange={(event) => setServiceId(event.target.value)}>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
        <label className="text-sm font-extrabold">Dentist<select className="input-field mt-2" required value={dentistId} onChange={(event) => setDentistId(event.target.value)}>{dentists.map((dentist) => <option key={dentist.id} value={dentist.id}>{dentist.displayName}</option>)}</select></label>
        <label className="text-sm font-extrabold">Date<input className="input-field mt-2" type="date" min={manilaToday()} required value={date} onChange={(event) => { setDate(event.target.value); setTime('') }} /></label>
        <label className="text-sm font-extrabold">Available time<select className="input-field mt-2" disabled={availability.loading || !availableTimes.length} required value={time} onChange={(event) => setTime(event.target.value)}><option value="">{availability.loading ? 'Checking hours…' : availableTimes.length ? 'Choose time' : 'No available hours'}</option>{availableTimes.map((slot) => <option key={slot.startsAt} value={slot.time}>{formatTime(slot.startsAt)}</option>)}</select></label>
      </div>
      {availability.error && <p className="mt-4 rounded-xl bg-[#fff0e7] p-3 text-sm text-[#914b22]" role="alert">{availability.error}</p>}
      {error && <p className="mt-4 rounded-xl bg-[#fff0e7] p-3 text-sm text-[#914b22]" role="alert">{error}</p>}
      <button className="mt-6 rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || !patient || !dentistId || !serviceId || !time} type="submit">{busy ? 'Scheduling…' : 'Create appointment'}</button>
    </form>
  </div>
}

export default function ReceptionCalendarPage() {
  const today = manilaToday()
  const [weekStart, setWeekStart] = useState(() => calendarWeek(today)[0])
  const [selected, setSelected] = useState(null)
  const [scheduleDate, setScheduleDate] = useState(null)
  const [message, setMessage] = useState('')
  const [state, setState] = useState({ loading: true, days: [], dentists: [], services: [], error: null })

  const load = useCallback(async () => {
    setState({ loading: true, days: [], dentists: [], services: [], error: null })
    try {
      const dates = calendarWeek(weekStart)
      const [calendars, dentistData, serviceData] = await Promise.all([
        Promise.all(dates.map((date) => api.getReceptionCalendar(date))),
        api.getReceptionDentists(),
        api.getReceptionServices(),
      ])
      setState({
        loading: false,
        error: null,
        dentists: dentistData.dentists || [],
        services: serviceData.services || [],
        days: calendars.map((calendar, index) => ({ date: dates[index], items: dayItems(calendar) })),
      })
    } catch (error) {
      setState({ loading: false, days: [], dentists: [], services: [], error })
    }
  }, [weekStart])
  useEffect(() => { load() }, [load])

  const weekDates = calendarWeek(weekStart)
  const weekEnd = weekDates[6]

  return <>
    <div className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(460px,0.8fr)] xl:items-end">
      <div className="max-w-2xl">
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-brand/60">Clinic schedule</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Weekly appointment calendar</h1>
        <p className="mt-2 text-sm text-ink/50">Sunday to Saturday · Click an available day to add a schedule, or select a booking to view details.</p>
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-[auto_minmax(190px,1fr)] sm:items-end xl:w-auto xl:justify-self-end">
        <div>
          <p className="mb-2 text-xs font-extrabold text-ink/50">Week navigation</p>
          <div className="inline-flex h-11 items-center rounded-xl bg-white p-1 shadow-sm">
            <button aria-label="Previous week" className="grid h-9 w-9 place-items-center rounded-lg text-brand hover:bg-mint" onClick={() => setWeekStart(shiftDate(weekStart, -7))} type="button"><ChevronLeft size={19} /></button>
            <button className="h-9 rounded-lg px-4 text-xs font-extrabold text-brand hover:bg-mint" onClick={() => setWeekStart(calendarWeek(today)[0])} type="button">This week</button>
            <button aria-label="Next week" className="grid h-9 w-9 place-items-center rounded-lg text-brand hover:bg-mint" onClick={() => setWeekStart(shiftDate(weekStart, 7))} type="button"><ChevronRight size={19} /></button>
          </div>
        </div>
        <label className="block text-xs font-extrabold text-ink/50">Jump to date
          <input className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm font-semibold text-ink shadow-sm" type="date" value={weekStart} onChange={(event) => setWeekStart(calendarWeek(event.target.value)[0] || weekStart)} />
        </label>
      </div>
    </div>

    <div className="mb-5 flex items-center gap-2 text-sm font-extrabold text-ink/65">
      <CalendarDays className="text-brand" size={19} />
      {formatDate(weekStart)} – {formatDate(weekEnd)}
    </div>

    {message && <p className="mb-5 rounded-2xl bg-mint p-4 text-sm font-bold text-brand" role="status">{message}</p>}

    {state.loading ? <LoadingState label="Loading this week’s clinic calendar…" />
      : state.error ? <ErrorState error={state.error} onRetry={load} />
        : <div className="space-y-4" aria-label="Weekly schedule">
          {state.days.map((day) => {
            const firstAvailableTime = clinicTimeForDate(day.date)
            const canCreate = Boolean(firstAvailableTime && state.dentists.length && state.services.length)
            return <section className={`rounded-3xl border bg-white p-4 soft-shadow sm:p-5 ${day.date === today ? 'border-brand/25' : 'border-transparent'}`} key={day.date}>
            <button className={`mb-4 flex w-full flex-wrap items-center justify-between gap-2 border-b border-ink/6 pb-4 text-left ${canCreate ? 'group cursor-pointer hover:text-brand' : 'cursor-default'}`} disabled={!canCreate} onClick={() => { setScheduleDate(day.date); setMessage('') }} type="button">
              <div><h2 className="text-lg font-extrabold">{formatDate(day.date, { weekday: 'long' })}</h2><p className="mt-1 text-xs text-ink/40">{day.items.length} booking{day.items.length === 1 ? '' : 's'}</p></div>
              <div className="flex items-center gap-2">{canCreate && <span className="text-[10px] font-extrabold uppercase tracking-wide text-brand/60 group-hover:text-brand">Click day to add schedule</span>}{day.date === today && <span className="rounded-full bg-mint px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-brand">Today</span>}</div>
            </button>
            {day.items.length ? <div className="space-y-2">
              {day.items.map((item) => <button aria-haspopup="dialog" className={`group flex w-full flex-col gap-3 rounded-2xl p-4 text-left transition hover:bg-mint/60 focus:outline-none focus:ring-4 focus:ring-brand/10 sm:flex-row sm:items-center ${item.status === 'completed' ? 'bg-[#edf7f1]' : 'bg-cream/55'}`} key={`${item.kind}-${item.id}`} onClick={() => setSelected(item)} type="button">
                <div className={`flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-extrabold sm:w-28 ${item.status === 'completed' ? 'bg-[#3f8060] text-white' : item.kind === 'appointment' ? 'bg-brand text-white' : 'bg-white text-brand'}`}><Clock3 size={15} />{formatTime(item.time)}</div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold group-hover:text-brand">{item.patient.displayName}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase ${item.status === 'completed' ? 'bg-[#d7ecdf] text-[#2f6b4d]' : 'bg-white text-ink/45'}`}>{item.kindLabel}</span></div><p className="mt-1 text-sm text-ink/50">{item.typeName || item.serviceName} · {item.dentistName}</p></div>
                <span className="text-xs font-bold text-ink/35">View details</span>
              </button>)}
            </div> : <p className="rounded-2xl bg-cream/40 px-4 py-5 text-center text-sm text-ink/40">No bookings scheduled.</p>}
          </section>})}
        </div>}

    {selected && <BookingDetails booking={selected} close={() => setSelected(null)} dentists={state.dentists} onRescheduled={async () => { setSelected(null); setMessage('Appointment schedule and dentist updated.'); await load() }} />}
    {scheduleDate && <CreateSchedule close={() => setScheduleDate(null)} dentists={state.dentists} services={state.services} initialDate={scheduleDate} onCreated={async (date) => { setScheduleDate(null); setMessage('Appointment added to the calendar.'); const targetWeek = calendarWeek(date)[0]; if (targetWeek === weekStart) await load(); else setWeekStart(targetWeek) }} />}
  </>
}
