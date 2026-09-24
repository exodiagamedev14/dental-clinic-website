import { clinicUrl } from '../clinic'
import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Image, Megaphone, Power, RefreshCw, Save, ShieldAlert, Trash2 } from 'lucide-react'
import { api } from '../api'
import { ErrorState, LoadingState } from '../components/PageState'
import { formatDateTime, titleCase } from '../format'
import { preparePrescriptionImage } from '../prescriptionImage'

const formFrom = (settings) => ({
  clinicName: settings.clinicName || '',
  primaryColor: settings.primaryColor || '#176B68',
  secondaryColor: settings.secondaryColor || '#DFF3EF',
  fontFamily: settings.fontFamily || 'Arial',
  brandVoice: settings.brandVoice || '',
  captionPrompt: settings.captionPrompt || '',
  imagePrompt: settings.imagePrompt || '',
  defaultLanguage: settings.defaultLanguage || 'taglish',
  contactPhone: settings.contactPhone || '',
  address: settings.address || '',
  defaultCallToAction: settings.defaultCallToAction || '',
  defaultHashtags: (settings.defaultHashtags || []).join(' '),
  requiredDisclaimer: settings.requiredDisclaimer || '',
  prohibitedPhrases: (settings.prohibitedPhrases || []).join('\n'),
  patientPostsEnabled: Boolean(settings.patientPostsEnabled),
  minorPostsEnabled: Boolean(settings.minorPostsEnabled),
  automaticPublishingEnabled: Boolean(settings.automaticPublishingEnabled),
  dailyPostLimit: settings.dailyPostLimit || 3,
  weeklyPostLimit: settings.weeklyPostLimit || 12,
  postingStartHour: settings.postingStartHour ?? 7,
  postingEndHour: settings.postingEndHour ?? 21,
  logoFile: null,
})

const statusStyle = (status) => ({
  published: 'bg-mint text-brand',
  blocked: 'bg-[#fff0e7] text-[#914b22]',
  failed: 'bg-[#fff0e7] text-[#914b22]',
  removed: 'bg-ink/5 text-ink/45',
}[status] || 'bg-[#edf3ff] text-[#315c9a]')

export default function AdminSocialPage() {
  const [state, setState] = useState({ loading: true, settings: null, posts: [], error: null })
  const [form, setForm] = useState(null)
  const [connection, setConnection] = useState({ pageId: '', accessToken: '' })
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }))
    try {
      const [{ settings }, { posts = [] }] = await Promise.all([api.getAdminSocialSettings(), api.getAdminSocialPosts()])
      setState({ loading: false, settings, posts, error: null })
      setForm((current) => current || formFrom(settings))
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }))
    }
  }, [])
  useEffect(() => { load() }, [load])

  const save = async (event, override = null) => {
    event?.preventDefault()
    setBusy('save'); setActionError(''); setMessage('')
    try {
      const next = { ...form, ...override }
      const logo = next.logoFile ? await preparePrescriptionImage(next.logoFile) : null
      const { settings } = await api.updateAdminSocialSettings({
        clinicName: next.clinicName.trim(),
        primaryColor: next.primaryColor,
        secondaryColor: next.secondaryColor,
        fontFamily: next.fontFamily,
        brandVoice: next.brandVoice.trim(),
        captionPrompt: next.captionPrompt.trim(),
        imagePrompt: next.imagePrompt.trim(),
        defaultLanguage: next.defaultLanguage,
        contactPhone: next.contactPhone.trim() || null,
        address: next.address.trim() || null,
        defaultCallToAction: next.defaultCallToAction.trim() || null,
        defaultHashtags: next.defaultHashtags.split(/\s+/u).map((value) => value.trim()).filter(Boolean),
        requiredDisclaimer: next.requiredDisclaimer.trim() || null,
        prohibitedPhrases: next.prohibitedPhrases.split('\n').map((value) => value.trim()).filter(Boolean),
        patientPostsEnabled: next.patientPostsEnabled,
        minorPostsEnabled: next.minorPostsEnabled,
        automaticPublishingEnabled: next.automaticPublishingEnabled,
        dailyPostLimit: Number(next.dailyPostLimit),
        weeklyPostLimit: Number(next.weeklyPostLimit),
        postingStartHour: Number(next.postingStartHour),
        postingEndHour: Number(next.postingEndHour),
        logo: logo ? { imageBase64: logo.imageBase64, imageMimeType: logo.imageMimeType } : null,
      })
      setState((current) => ({ ...current, settings }))
      setForm(formFrom(settings))
      setMessage(override?.automaticPublishingEnabled === false ? 'Emergency stop enabled. New posts cannot publish.' : 'Social publishing settings saved.')
    } catch (error) {
      setActionError(error.message || 'Settings could not be saved.')
    } finally { setBusy('') }
  }

  const connect = async (event) => {
    event.preventDefault(); setBusy('connect'); setActionError(''); setMessage('')
    try {
      await api.connectAdminFacebookPage({ pageId: connection.pageId.trim(), accessToken: connection.accessToken.trim() })
      setConnection({ pageId: '', accessToken: '' })
      setMessage('Facebook Page connected. The access token is encrypted and is never shown again.')
      setForm(null); await load()
    } catch (error) { setActionError(error.message || 'Facebook could not be connected.') } finally { setBusy('') }
  }

  const disconnect = async () => {
    if (!window.confirm('Disconnect the clinic Facebook Page and stop automatic publication?')) return
    setBusy('disconnect'); setActionError('')
    try { await api.disconnectAdminFacebookPage(); setMessage('Facebook Page disconnected.'); setForm(null); await load() }
    catch (error) { setActionError(error.message) } finally { setBusy('') }
  }

  const addTemplates = async (event) => {
    const files = [...(event.target.files || [])]
    event.target.value = ''
    const remaining = 5 - settings.templates.length
    if (!files.length) return
    if (files.length > remaining) {
      setActionError(`You can add ${remaining} more template photo${remaining === 1 ? '' : 's'}.`)
      return
    }
    setBusy('templates'); setActionError(''); setMessage('')
    try {
      for (const file of files) {
        const image = await preparePrescriptionImage(file)
        await api.addAdminSocialTemplate({ imageBase64: image.imageBase64, imageMimeType: image.imageMimeType })
      }
      setMessage('AI posting templates saved.')
    } catch (error) {
      setActionError(error.message || 'The template photos could not be saved.')
    } finally {
      await load()
      setBusy('')
    }
  }

  const removeTemplate = async (id) => {
    setBusy(id); setActionError(''); setMessage('')
    try {
      await api.removeAdminSocialTemplate(id)
      setMessage('Template photo removed.')
      await load()
    } catch (error) { setActionError(error.message) } finally { setBusy('') }
  }

  const remove = async (post) => {
    if (!window.confirm('Remove this post from Facebook? Its internal audit history will be kept.')) return
    setBusy(post.id); setActionError('')
    try { await api.removeAdminSocialPost(post.id); setMessage('Facebook post removed; its audit record was retained.'); await load() }
    catch (error) { setActionError(error.message) } finally { setBusy('') }
  }

  const retry = async (post) => {
    setBusy(post.id); setActionError(''); setMessage('')
    try { await api.retryAdminSocialPost(post.id); setMessage('Failed post queued for automatic publishing.'); await load() }
    catch (error) { setActionError(error.message) } finally { setBusy('') }
  }

  if (state.loading && !state.settings) return <LoadingState label="Loading social publishing settings…" />
  if (state.error && !state.settings) return <ErrorState error={state.error} onRetry={load} />
  if (!form) return null
  const settings = state.settings

  return <>
    <div className="mb-8"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-brand/60">Automatic marketing</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight">Facebook publishing</h1><p className="mt-2 text-sm text-ink/50">Control the connected Page, brand rules, safety policy, and automatic publication.</p></div>
    {message && <p className="mb-5 rounded-2xl bg-mint p-4 text-sm font-bold text-brand" role="status">{message}</p>}
    {actionError && <p className="mb-5 rounded-2xl bg-[#fff0e7] p-4 text-sm font-bold text-[#914b22]" role="alert">{actionError}</p>}

    <section className="mb-6 rounded-3xl bg-white p-5 soft-shadow sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="flex items-center gap-2 text-xl font-extrabold"><Megaphone className="text-brand" size={21} /> Facebook Page</h2><p className="mt-1 text-xs text-ink/45">Use a Meta user token so the server can exchange it for a long-lived Page token. Never enter a Facebook password.</p></div>{settings.page?.status === 'connected' && <div className="rounded-2xl bg-mint px-4 py-3 text-sm font-extrabold text-brand">{settings.page.name}</div>}</div>
      {!settings.tokenEncryptionConfigured && <p className="mt-4 rounded-2xl bg-[#fff0e7] p-4 text-xs font-bold text-[#914b22]">Set SOCIAL_TOKEN_ENCRYPTION_KEY in Coolify before connecting a Page.</p>}
      {!settings.aiConfigured && <p className="mt-4 rounded-2xl bg-[#fff0e7] p-4 text-xs font-bold text-[#914b22]">Set OPENROUTER_API_KEY in Coolify before enabling automatic publishing.</p>}
      {settings.page?.status === 'connected' ? <button className="mt-5 rounded-xl bg-[#fff0e7] px-4 py-2.5 text-xs font-extrabold text-[#914b22]" disabled={Boolean(busy)} onClick={disconnect}>Disconnect Page</button> : <form className="mt-5 grid gap-4 lg:grid-cols-[1fr_2fr_auto] lg:items-end" onSubmit={connect}><label className="text-xs font-extrabold">Facebook Page ID<input className="input-field mt-2" maxLength="100" required value={connection.pageId} onChange={(event) => setConnection({ ...connection, pageId: event.target.value })} /></label><label className="text-xs font-extrabold">Meta user or Page access token<input autoComplete="off" className="input-field mt-2" maxLength="2000" minLength="20" required type="password" value={connection.accessToken} onChange={(event) => setConnection({ ...connection, accessToken: event.target.value })} /></label><button className="rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white disabled:opacity-50" disabled={busy === 'connect' || !settings.tokenEncryptionConfigured} type="submit">{busy === 'connect' ? 'Checking…' : 'Connect Page'}</button></form>}
    </section>

    <form className="rounded-3xl bg-white p-5 soft-shadow sm:p-6" onSubmit={save}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Brand and publishing rules</h2><p className="mt-1 text-xs text-ink/45">The logo and exact contact details are applied after AI enhancement.</p></div><button className="inline-flex items-center gap-2 rounded-xl bg-[#8b3029] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50" disabled={!form.automaticPublishingEnabled || Boolean(busy)} type="button" onClick={() => save(null, { automaticPublishingEnabled: false })}><Power size={15} /> Emergency stop</button></div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="text-xs font-extrabold">Clinic name<input className="input-field mt-2" maxLength="160" minLength="2" required value={form.clinicName} onChange={(event) => setForm({ ...form, clinicName: event.target.value })} /></label>
        <label className="text-xs font-extrabold">Logo image<input accept="image/jpeg,image/png,image/webp" className="mt-3 block w-full text-xs text-ink/55" type="file" onChange={(event) => setForm({ ...form, logoFile: event.target.files?.[0] || null })} /><span className="mt-1 block font-normal text-ink/40">{settings.hasLogo ? 'A logo is saved. Upload only to replace it.' : 'No logo saved yet.'}</span></label>
        <div className="rounded-2xl bg-cream p-4 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold">AI posting templates</p><p className="mt-1 text-xs text-ink/45">Add up to 5 style references. Do not upload patient records or private information.</p></div><label className="cursor-pointer rounded-xl bg-brand px-4 py-2.5 text-xs font-extrabold text-white has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">{busy === 'templates' ? 'Uploading…' : 'Add photos'}<input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={Boolean(busy) || settings.templates.length >= 5} multiple type="file" onChange={addTemplates} /></label></div>
          <p className="mt-3 text-[11px] font-bold text-ink/40">{settings.templates.length}/5 photos</p>
          {settings.templates.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">{settings.templates.map((template) => <div className="relative overflow-hidden rounded-xl bg-white" key={template.id}><img alt="AI posting template" className="aspect-square w-full object-cover" src={clinicUrl(`/api/admin/social/templates/${template.id}/image`)} /><button aria-label="Remove template photo" className="absolute right-1.5 top-1.5 rounded-lg bg-white/95 p-2 text-[#914b22] shadow" disabled={Boolean(busy)} onClick={() => removeTemplate(template.id)} type="button"><Trash2 size={14} /></button></div>)}</div>}
        </div>
        <label className="text-xs font-extrabold">Primary color<input className="mt-2 h-12 w-full rounded-xl border border-ink/10 bg-white p-1" type="color" value={form.primaryColor} onChange={(event) => setForm({ ...form, primaryColor: event.target.value })} /></label>
        <label className="text-xs font-extrabold">Secondary color<input className="mt-2 h-12 w-full rounded-xl border border-ink/10 bg-white p-1" type="color" value={form.secondaryColor} onChange={(event) => setForm({ ...form, secondaryColor: event.target.value })} /></label>
        <label className="text-xs font-extrabold">Brand font<select className="input-field mt-2" value={form.fontFamily} onChange={(event) => setForm({ ...form, fontFamily: event.target.value })}><option>Arial</option><option>Georgia</option><option>Verdana</option></select></label>
        <label className="text-xs font-extrabold md:col-span-2">Brand voice<textarea className="input-field mt-2 min-h-20" maxLength="500" required value={form.brandVoice} onChange={(event) => setForm({ ...form, brandVoice: event.target.value })} /></label>
        <label className="text-xs font-extrabold md:col-span-2">Caption AI prompt<textarea className="input-field mt-2 min-h-28" maxLength="3000" placeholder="Example: Write two short Taglish paragraphs with a friendly question at the end." value={form.captionPrompt} onChange={(event) => setForm({ ...form, captionPrompt: event.target.value })} /><span className="mt-1 block font-normal text-ink/40">Applied to every generated caption.</span></label>
        <label className="text-xs font-extrabold md:col-span-2">Image generation AI prompt<textarea className="input-field mt-2 min-h-28" maxLength="3000" placeholder="Example: Use a clean teal-and-white layout with soft natural lighting and generous spacing." value={form.imagePrompt} onChange={(event) => setForm({ ...form, imagePrompt: event.target.value })} /><span className="mt-1 block font-normal text-ink/40">Applied with the saved template photos when AI image editing is safe.</span></label>
        <label className="text-xs font-extrabold">Caption language<select className="input-field mt-2" value={form.defaultLanguage} onChange={(event) => setForm({ ...form, defaultLanguage: event.target.value })}><option value="english">English</option><option value="filipino">Filipino</option><option value="taglish">Taglish</option></select></label>
        <label className="text-xs font-extrabold">Contact number<input className="input-field mt-2" maxLength="80" value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} /></label>
        <label className="text-xs font-extrabold">Address<input className="input-field mt-2" maxLength="300" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
        <label className="text-xs font-extrabold">Default call to action<input className="input-field mt-2" maxLength="300" value={form.defaultCallToAction} onChange={(event) => setForm({ ...form, defaultCallToAction: event.target.value })} /></label>
        <label className="text-xs font-extrabold md:col-span-2">Default hashtags<input className="input-field mt-2" placeholder="#DentalCare #ClinicName" value={form.defaultHashtags} onChange={(event) => setForm({ ...form, defaultHashtags: event.target.value })} /></label>
        <label className="text-xs font-extrabold md:col-span-2">Required disclaimer<textarea className="input-field mt-2 min-h-20" maxLength="500" value={form.requiredDisclaimer} onChange={(event) => setForm({ ...form, requiredDisclaimer: event.target.value })} /></label>
        <label className="text-xs font-extrabold md:col-span-2">Prohibited phrases — one per line<textarea className="input-field mt-2 min-h-28" value={form.prohibitedPhrases} onChange={(event) => setForm({ ...form, prohibitedPhrases: event.target.value })} /></label>
      </div>
      <div className="mt-6 grid gap-3 rounded-2xl bg-cream p-4 sm:grid-cols-3"><label className="flex gap-2 text-xs font-bold"><input checked={form.patientPostsEnabled} type="checkbox" onChange={(event) => setForm({ ...form, patientPostsEnabled: event.target.checked })} /> Allow patient posts with specific consent</label><label className="flex gap-2 text-xs font-bold"><input checked={form.minorPostsEnabled} type="checkbox" onChange={(event) => setForm({ ...form, minorPostsEnabled: event.target.checked })} /> Allow approved guardian-consent workflow</label><label className="flex gap-2 text-xs font-bold"><input checked={form.automaticPublishingEnabled} type="checkbox" onChange={(event) => setForm({ ...form, automaticPublishingEnabled: event.target.checked })} /> Enable automatic publishing</label></div>
      <button className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white disabled:opacity-50" disabled={busy === 'save'} type="submit"><Save size={16} />{busy === 'save' ? 'Saving…' : 'Save settings'}</button>
    </form>

    <section className="mt-8"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand/60">Audit and recovery</p><h2 className="mt-1 text-xl font-extrabold">Publishing history</h2></div><button aria-label="Refresh history" className="rounded-xl bg-white p-3 text-brand shadow-sm" onClick={load}><RefreshCw size={17} /></button></div><div className="grid gap-4 lg:grid-cols-2">{state.posts.map((post) => <article className="overflow-hidden rounded-3xl bg-white soft-shadow" key={post.id}><div className="grid grid-cols-[120px_1fr]"><img alt="Published content" className="h-full min-h-40 w-full object-cover" src={clinicUrl(`/api/admin/social/posts/${post.id}/image`)} /><div className="p-4"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase ${statusStyle(post.status)}`}>{titleCase(post.status.replaceAll('_', ' '))}</span><span className="text-[10px] text-ink/40">{post.dentistName} · {formatDateTime(post.createdAt)}</span></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/60">{post.caption || post.description}</p>{post.blockingReason && <p className="mt-2 flex gap-1.5 text-xs font-bold text-[#914b22]"><ShieldAlert size={14} />{post.blockingReason}</p>}<div className="mt-3 flex flex-wrap gap-2">{post.externalPostUrl && <a className="inline-flex items-center gap-1 text-xs font-extrabold text-brand" href={post.externalPostUrl} rel="noreferrer" target="_blank">Open post <ExternalLink size={12} /></a>}{post.status === 'failed' && <button className="inline-flex items-center gap-1 text-xs font-extrabold text-brand" disabled={busy === post.id} onClick={() => retry(post)}><RefreshCw size={12} /> Retry</button>}{post.status === 'published' && <button className="inline-flex items-center gap-1 text-xs font-extrabold text-[#914b22]" disabled={busy === post.id} onClick={() => remove(post)}><Trash2 size={12} /> Remove</button>}</div></div></div></article>)}{!state.posts.length && <div className="col-span-full rounded-3xl bg-white p-8 text-center text-sm text-ink/45"><Image className="mx-auto mb-3" size={26} />No publishing activity yet.</div>}</div></section>
  </>
}
