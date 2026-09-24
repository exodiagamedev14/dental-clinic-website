import { clinicUrl } from '../clinic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Camera, ExternalLink, ImageUp, Megaphone, RefreshCw, Send } from 'lucide-react'
import { api } from '../api'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import { formatDateTime, titleCase } from '../format'
import { prepareSocialImage } from '../socialImage'
import { randomUuid } from '../uuid'

const patientTypes = new Set(['patient_portrait', 'before_after', 'intraoral_clinical'])
const activeStatuses = new Set(['confirmed', 'ai_processing', 'branding', 'automatic_validation', 'publishing'])

const emptyForm = () => ({
  contentType: 'clinic_team', description: '', file: null, afterFile: null,
})

const statusStyle = (status) => ({
  published: 'bg-mint text-brand',
  blocked: 'bg-[#fff0e7] text-[#914b22]',
  failed: 'bg-[#fff0e7] text-[#914b22]',
  removed: 'bg-ink/5 text-ink/45',
}[status] || 'bg-[#edf3ff] text-[#315c9a]')

export default function DentistSocialPage() {
  const [state, setState] = useState({ loading: true, posts: [], publishing: null, error: null })
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const preview = useMemo(() => form.file ? URL.createObjectURL(form.file) : null, [form.file])
  const afterPreview = useMemo(() => form.afterFile ? URL.createObjectURL(form.afterFile) : null, [form.afterFile])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  useEffect(() => () => { if (afterPreview) URL.revokeObjectURL(afterPreview) }, [afterPreview])

  const load = useCallback((quiet = false) => {
    if (!quiet) setState((current) => ({ ...current, loading: true, error: null }))
    api.getDentistSocialPosts()
      .then(({ posts = [], publishing }) => setState({ loading: false, posts, publishing, error: null }))
      .catch((error) => setState((current) => ({ ...current, loading: false, error })))
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!state.posts.some(({ status }) => activeStatuses.has(status))) return undefined
    const timer = setInterval(() => load(true), 5000)
    return () => clearInterval(timer)
  }, [state.posts, load])

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    setMessage('')
    const beforeAfter = form.contentType === 'before_after'
    const files = beforeAfter ? [form.file, form.afterFile] : [form.file]
    if (files.some((file) => !file)) { setFormError(beforeAfter ? 'Choose both the before and after photos.' : 'Take or choose a photo first.'); return }
    const patientPost = patientTypes.has(form.contentType)
    if (!window.confirm(`${patientPost ? 'By continuing, you confirm the signed patient or guardian paper consent is on file. ' : ''}This photo will be processed using AI, branded for the clinic, automatically validated, and published to ${state.publishing?.pageName || 'the connected Facebook Page'}. Continue?`)) return
    setBusy(true)
    try {
      const images = await Promise.all(files.map((file) => prepareSocialImage(file)))
      await api.createDentistSocialPost({
        submissionId: randomUuid(),
        contentType: form.contentType,
        description: form.description.trim(),
        image: images[0],
        ...(beforeAfter ? { images } : {}),
      })
      setForm(emptyForm())
      setMessage('Confirmed. The system is now processing and will publish automatically after validation.')
      await load(true)
    } catch (error) {
      setFormError(error.message || 'The post could not be submitted.')
    } finally {
      setBusy(false)
    }
  }

  if (state.loading && !state.publishing) return <LoadingState label="Opening the Facebook content studio…" />
  if (state.error && !state.publishing) return <ErrorState error={state.error} onRetry={load} />

  const ready = state.publishing?.configured && state.publishing?.enabled && state.publishing?.pageName
  const patientPost = patientTypes.has(form.contentType)
  const beforeAfter = form.contentType === 'before_after'

  return <>
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-brand/60">AI content studio</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight">Facebook publishing</h1><p className="mt-2 text-sm text-ink/50">Confirm once, then branding, validation, and publishing happen automatically.</p></div>
      <div className={`rounded-2xl px-4 py-3 text-xs font-extrabold ${ready ? 'bg-mint text-brand' : 'bg-[#fff0e7] text-[#914b22]'}`}><Megaphone className="mr-2 inline" size={16} />{ready ? `Connected to ${state.publishing.pageName}` : 'Setup incomplete or publishing disabled'}</div>
    </div>

    {message && <p className="mb-5 rounded-2xl bg-mint p-4 text-sm font-bold text-brand" role="status">{message}</p>}
    {formError && <p className="mb-5 rounded-2xl bg-[#fff0e7] p-4 text-sm font-bold text-[#914b22]" role="alert">{formError}</p>}

    <form className="rounded-3xl bg-white p-5 soft-shadow sm:p-7" onSubmit={submit}>
      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <div>
          <label className="block text-sm font-extrabold">{beforeAfter ? 'Before photo' : 'Take or upload a photo'}<input accept="image/jpeg,image/png,image/webp" capture="environment" className="mt-3 block w-full text-xs text-ink/55" required type="file" onChange={(event) => setForm({ ...form, file: event.target.files?.[0] || null })} /></label>
          <div className="mt-4 grid aspect-square place-items-center overflow-hidden rounded-3xl bg-cream text-ink/35">{preview ? <img alt={beforeAfter ? 'Before photo preview' : 'Selected post preview'} className="h-full w-full object-cover" decoding="async" src={preview} /> : <div className="text-center"><Camera className="mx-auto" size={34} /><p className="mt-2 text-xs font-bold">{beforeAfter ? 'Before photo preview' : 'Photo preview'}</p></div>}</div>
          {beforeAfter && <><label className="mt-5 block text-sm font-extrabold">After photo<input accept="image/jpeg,image/png,image/webp" capture="environment" className="mt-3 block w-full text-xs text-ink/55" required type="file" onChange={(event) => setForm({ ...form, afterFile: event.target.files?.[0] || null })} /></label><div className="mt-4 grid aspect-square place-items-center overflow-hidden rounded-3xl bg-cream text-ink/35">{afterPreview ? <img alt="After photo preview" className="h-full w-full object-cover" decoding="async" src={afterPreview} /> : <div className="text-center"><Camera className="mx-auto" size={34} /><p className="mt-2 text-xs font-bold">After photo preview</p></div>}</div></>}
          <p className="mt-3 text-xs leading-5 text-ink/45">Photos are normalized, stripped of location metadata, and compressed to 2 MB or less.</p>
        </div>
        <div>
          <label className="flex items-center gap-3 rounded-2xl bg-cream p-4 text-sm font-extrabold"><input checked={beforeAfter} type="checkbox" onChange={(event) => setForm({ ...form, contentType: event.target.checked ? 'before_after' : 'clinic_team', afterFile: null })} /> This is a before-and-after post</label>
          <label className="mt-5 block text-sm font-extrabold">What should the post say?<textarea className="input-field mt-2 min-h-32" maxLength="2000" placeholder="Example: Welcome our new dental chair and invite patients to book a consultation." required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          {patientPost && <section className="mt-5 rounded-2xl border border-[#d9a57f]/35 bg-[#fff8f2] p-4">
            <p className="text-xs font-bold leading-5 text-[#783e1c]">Keep the signed patient or guardian paper consent at the clinic. Publishing confirms that the signed copy covers Facebook posting and AI processing.</p>
            {!state.publishing?.patientPostsEnabled && <p className="mt-2 text-xs font-bold text-[#914b22]">The super admin has disabled patient posts.</p>}
          </section>}
          <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-sm font-extrabold text-white disabled:opacity-50" disabled={busy || !ready || (patientPost && !state.publishing?.patientPostsEnabled)} type="submit"><Send size={17} />{busy ? 'Confirming…' : 'Confirm and publish automatically'}</button>
        </div>
      </div>
    </form>

    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand/60">Publishing history</p><h2 className="mt-1 text-xl font-extrabold">Your posts</h2></div><button aria-label="Refresh post history" className="rounded-xl bg-white p-3 text-brand shadow-sm" onClick={() => load(true)}><RefreshCw size={17} /></button></div>
      {state.posts.length ? <div className="grid gap-4 lg:grid-cols-2">{state.posts.map((post) => <article className="overflow-hidden rounded-3xl bg-white soft-shadow" key={post.id}><div className="grid grid-cols-[120px_1fr]"><img alt="Facebook post" className="h-full min-h-36 w-full object-cover" decoding="async" loading="lazy" src={clinicUrl(`/api/dentist/social/posts/${post.id}/image`)} /><div className="p-4"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase ${statusStyle(post.status)}`}>{titleCase(post.status.replaceAll('_', ' '))}</span><span className="text-[10px] font-bold text-ink/35">{formatDateTime(post.createdAt)}</span></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/60">{post.caption || post.description}</p>{post.blockingReason && <p className="mt-2 text-xs font-bold text-[#914b22]">{post.blockingReason}</p>}{post.externalPostUrl && <a className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-brand" href={post.externalPostUrl} rel="noreferrer" target="_blank">Open Facebook post <ExternalLink size={13} /></a>}</div></div></article>)}</div> : <EmptyState icon={ImageUp} title="No Facebook posts yet" message="Your confirmed posts and automatic publishing results will appear here." />}
    </section>
  </>
}
