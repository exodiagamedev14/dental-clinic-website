import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import sharp from 'sharp'
import { currentClinicId, withClinic } from './clinic-context.js'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const patientContent = new Set(['patient_portrait', 'before_after', 'intraoral_clinical'])
const clinicalContent = new Set(['before_after', 'intraoral_clinical'])
const promotionalPattern = /(?:₱|\bphp\b|\bpromo\b|\bdiscount\b|\bfree\b|\d+\s*%\s*off\b)/iu
const guaranteePattern = /\b(?:guaranteed?|perfect results?|permanent results?|best dentist|pain[- ]?free|100% effective)\b/iu

export class SocialBlockedError extends Error {}
export class SocialPermanentError extends Error {}

export const medicalSafeguardsDisabled = (config, job) => Boolean(config.socialDebugMedicalBypassPageId)
  && config.socialDebugMedicalBypassPageId === job.connection?.pageId

const xml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

const openRouterError = async (label, response) => {
  const payload = await response.json().catch(() => null)
  const message = payload?.error?.message || `HTTP ${response.status}`
  const ErrorType = response.status === 429 || response.status >= 500 ? Error : SocialPermanentError
  return new ErrorType(`${label} failed: ${message}`)
}

const openRouterText = (payload) => {
  const message = payload?.choices?.[0]?.message
  if (message?.refusal) throw new SocialBlockedError('OpenRouter safety filters blocked this image or caption.')
  return typeof message?.content === 'string' ? message.content : null
}

const privateOpenRouterProvider = {
  only: ['google-vertex'],
  zdr: true,
  data_collection: 'deny',
  require_parameters: true,
  allow_fallbacks: false,
}

const parseJsonOutput = (text) => {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/u, '').replace(/\s*```$/u, '')
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('OpenRouter returned an invalid content validation result.')
  }
}

async function openRouterJson({ config, fetchFn, label, prompt, mimeType, imageBytes, schema }) {
  const response = await fetchFn('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.openRouterApiKey}`,
      'content-type': 'application/json',
      'http-referer': config.publicOrigin,
      'x-openrouter-title': 'SmileCare Dental Clinic',
    },
    body: JSON.stringify({
      model: config.openRouterTextModel,
      messages: [{ role: 'user', content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBytes.toString('base64')}` } },
      ] }],
      provider: privateOpenRouterProvider,
      max_tokens: 4096,
      response_format: { type: 'json_schema', json_schema: { name: 'social_review', strict: true, schema } },
    }),
  })
  if (!response.ok) throw await openRouterError(label, response)
  return parseJsonOutput(openRouterText(await response.json()))
}

export const encryptSocialToken = (token, key, randomBytesFn = randomBytes) => {
  if (!key || key.length !== 32) throw new SocialPermanentError('Social token encryption is not configured.')
  const iv = randomBytesFn(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((value) => value.toString('base64url')).join('.')
}

export const decryptSocialToken = (value, key) => {
  if (!key || key.length !== 32) throw new SocialPermanentError('Social token encryption is not configured.')
  try {
    const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64url'))
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  } catch {
    throw new SocialPermanentError('The saved Facebook connection could not be decrypted.')
  }
}

export async function normalizeSocialImage(bytes) {
  for (const quality of [84, 76, 68, 58]) {
    const output = await sharp(bytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality, progressive: true })
      .toBuffer()
    if (output.length <= MAX_IMAGE_BYTES) return output
  }
  throw new SocialBlockedError('The selected photo could not be compressed below 2 MB.')
}

export const assertSocialPostPublishable = (job, analysis, caption, { skipMedicalSafeguards = false } = {}) => {
  const { settings, consent } = job
  if (!settings.automaticPublishingEnabled) throw new SocialBlockedError('Automatic publishing is disabled by the super admin.')
  if (!job.connection || job.connection.status !== 'connected' || !job.connection.encryptedAccessToken) {
    throw new SocialPermanentError('The clinic Facebook Page is not connected.')
  }
  if (patientContent.has(job.contentType)) {
    if (!settings.patientPostsEnabled) throw new SocialBlockedError('Patient-related Facebook posts are disabled.')
    if (!consent?.coversPublicSocialMedia || !consent?.coversAiProcessing) {
      throw new SocialBlockedError('Signed paper consent for public Facebook posting and AI processing must be confirmed.')
    }
  }
  if (analysis.patient_visible && (!consent?.coversPublicSocialMedia || !consent?.coversAiProcessing)) {
    throw new SocialBlockedError('A possible patient is visible but valid social-media and AI consent was not recorded.')
  }
  if ((analysis.minor_possible || consent?.subjectIsMinor) && (!settings.minorPostsEnabled || !consent?.coversPublicSocialMedia)) {
    throw new SocialBlockedError('A possible minor is visible and guardian paper consent must be confirmed.')
  }
  if (analysis.personal_data_visible) throw new SocialBlockedError('Possible patient records or personal identifiers are visible in the photo.')
  if (!skipMedicalSafeguards) {
    if (analysis.unsupported_claims?.length) throw new SocialBlockedError('The generated post contains an unsupported treatment or business claim.')
    if (analysis.promotional_rate || promotionalPattern.test(caption)) throw new SocialBlockedError('Promotional prices, discounts, or rates are not allowed by the clinic publishing policy.')
    if (guaranteePattern.test(caption)) throw new SocialBlockedError('The generated caption contains a guarantee or misleading outcome claim.')
  }
  const prohibited = settings.prohibitedPhrases.find((phrase) => phrase && caption.toLocaleLowerCase().includes(phrase.toLocaleLowerCase()))
  if (prohibited) throw new SocialBlockedError(`The generated caption contains the prohibited phrase “${prohibited}”.`)
  if (job.patientName && caption.toLocaleLowerCase().includes(job.patientName.toLocaleLowerCase())) {
    throw new SocialBlockedError('The generated caption contains the patient’s name.')
  }
}

async function analyzeAndWrite({ config, fetchFn, job, imageBytes }) {
  if (!config.openRouterApiKey) throw new SocialPermanentError('OpenRouter is not configured for automatic social publishing.')
  const prompt = `${job.settings.captionPrompt}

Dentist request: ${job.description}.
Available clinic facts: clinic name ${job.settings.clinicName}; language ${job.settings.defaultLanguage}; brand voice ${job.settings.brandVoice}; call to action ${job.settings.defaultCallToAction || 'none'}; contact ${job.settings.contactPhone || 'none'}; address ${job.settings.address || 'none'}; hashtags ${job.settings.defaultHashtags.join(' ') || 'none'}; disclaimer ${job.settings.requiredDisclaimer || 'none'}.
Use the attached source photo as context. Return only valid JSON with these exact keys:
{"caption":"string","patient_visible":false,"minor_possible":false,"personal_data_visible":false,"clinical_image":false,"unsupported_claims":[],"promotional_rate":false,"safe_to_publish":true,"reasons":[]}

Put the requested Facebook caption in caption. Inspect the photo and fill the remaining fields accurately for the publishing workflow.`
  const analysis = await openRouterJson({
    config, fetchFn, label: 'OpenRouter caption generation', prompt,
    mimeType: job.originalImage.mimeType, imageBytes,
    schema: {
      type: 'object', additionalProperties: false,
      properties: {
        caption: { type: 'string' }, patient_visible: { type: 'boolean' },
        minor_possible: { type: 'boolean' }, personal_data_visible: { type: 'boolean' },
        clinical_image: { type: 'boolean' }, unsupported_claims: { type: 'array', items: { type: 'string' } },
        promotional_rate: { type: 'boolean' }, safe_to_publish: { type: 'boolean' },
        reasons: { type: 'array', items: { type: 'string' } },
      },
      required: ['caption', 'patient_visible', 'minor_possible', 'personal_data_visible', 'clinical_image', 'unsupported_claims', 'promotional_rate', 'safe_to_publish', 'reasons'],
    },
  })
  if (typeof analysis.caption !== 'string' || !analysis.caption.trim()) {
    throw new Error('OpenRouter returned no usable Facebook caption.')
  }
  analysis.caption = analysis.caption.trim()
  if (analysis.caption.length > 5000) throw new SocialBlockedError('The generated caption is too long for this workflow.')
  return analysis
}

async function moderate({ config, fetchFn, caption, mimeType, imageBytes }) {
  const result = await openRouterJson({
    config, fetchFn, label: 'OpenRouter safety review', mimeType, imageBytes,
    prompt: `Classify this dental-clinic Facebook post into exactly one category: none, personal_data, sexual_content, hate_or_harassment, graphic_violence, or instructions_for_harm. Use instructions_for_harm only for explicit instructions encouraging immediate physical harm. Do not flag environmental safety concerns, potential fire or electrical hazards, clutter, infrastructure, equipment condition, general best-practice concerns, or a perceived contradiction between the photo and caption. Use personal_data only for clearly readable private identifiers. Caption: ${caption}`,
    schema: {
      type: 'object', additionalProperties: false,
      properties: {
        category: { type: 'string', enum: ['none', 'personal_data', 'sexual_content', 'hate_or_harassment', 'graphic_violence', 'instructions_for_harm'] },
        reason: { type: 'string' },
      },
      required: ['category', 'reason'],
    },
  })
  if (result.category !== 'none') {
    throw new SocialBlockedError(result.reason || 'The post contains content that cannot be published automatically.')
  }
}

async function enhanceImage({ config, fetchFn, storage, job, analysis, imageBytes }) {
  const mayUseGenerativeEdit = !analysis.patient_visible
    && !analysis.clinical_image
    && !clinicalContent.has(job.contentType)
  if (!mayUseGenerativeEdit) return imageBytes
  const templates = (job.settings.templates || []).slice(0, 5)
  try {
    const templateReferences = await Promise.all(templates.map(async (template) => ({
      type: 'image_url',
      image_url: { url: `data:${template.mimeType};base64,${(await storage.download(template.driveFileId, MAX_IMAGE_BYTES)).toString('base64')}` },
    })))
    const response = await fetchFn('https://openrouter.ai/api/v1/images', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.openRouterApiKey}`,
        'content-type': 'application/json',
        'http-referer': config.publicOrigin,
        'x-openrouter-title': 'SmileCare Dental Clinic',
      },
      body: JSON.stringify({
        model: config.openRouterImageModel,
        prompt: `${job.settings.imagePrompt}\n\nInput reference order: the first image is the dentist's source photo; the remaining ${templates.length} image(s) are the Super Admin's posting templates.`,
        input_references: [{
          type: 'image_url',
          image_url: { url: `data:${job.originalImage.mimeType};base64,${imageBytes.toString('base64')}` },
        }, ...templateReferences],
        provider: { ...privateOpenRouterProvider, only: ['google-vertex/global'] },
      }),
    })
    if (!response.ok) throw await openRouterError('OpenRouter image enhancement', response)
    const encoded = (await response.json())?.data?.[0]?.b64_json
    const edited = encoded ? Buffer.from(encoded, 'base64') : null
    return edited?.length && edited.length <= 12 * 1024 * 1024 ? edited : imageBytes
  } catch (error) {
    if (templates.length) throw error
    return imageBytes
  }
}

async function applyBranding({ storage, settings, imageBytes }) {
  const base = sharp(imageBytes, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(1080, 1080, { fit: 'cover', position: 'attention' })
  const textX = settings.hasLogo ? 190 : 48
  const details = [settings.contactPhone, settings.defaultCallToAction].filter(Boolean).join(' · ')
  const overlay = Buffer.from(`<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="850" width="1080" height="230" fill="${xml(settings.primaryColor)}" fill-opacity="0.94"/>
    <text x="${textX}" y="930" fill="#fff" font-family="${xml(settings.fontFamily)}, sans-serif" font-size="45" font-weight="700">${xml(settings.clinicName.slice(0, 42))}</text>
    <text x="${textX}" y="985" fill="#fff" fill-opacity="0.88" font-family="${xml(settings.fontFamily)}, sans-serif" font-size="27">${xml(details.slice(0, 70))}</text>
  </svg>`)
  const composites = [{ input: overlay, left: 0, top: 0 }]
  if (settings.logoDriveFileId) {
    const logo = await storage.download(settings.logoDriveFileId, MAX_IMAGE_BYTES)
    composites.push({
      input: await sharp(logo).rotate().resize(120, 120, { fit: 'contain' }).png().toBuffer(),
      left: 45,
      top: 900,
    })
  }
  const branded = await base.composite(composites).jpeg({ quality: 82, progressive: true }).toBuffer()
  if (branded.length > MAX_IMAGE_BYTES) {
    return sharp(branded).jpeg({ quality: 68, progressive: true }).toBuffer()
  }
  return branded
}

const graphError = async (label, response) => {
  const payload = await response.json().catch(() => null)
  if (String(payload?.error?.code) === '190') {
    return new SocialPermanentError(`${label} failed: the Facebook access token is invalid or expired. Reconnect the Page with a long-lived Page token.`)
  }
  const message = payload?.error?.message || `HTTP ${response.status}`
  const ErrorType = response.status === 429 || response.status >= 500 ? Error : SocialPermanentError
  return new ErrorType(`${label} failed: ${message}`)
}

export function createSocialPublisher({ config, store, storage, fetchFn = globalThis.fetch, now = () => new Date() }) {
  let timer
  let running = false

  const pageToken = (encrypted) => decryptSocialToken(encrypted, config.socialTokenEncryptionKey)
  const graphBase = `https://graph.facebook.com/${config.metaGraphVersion}`

  const readPage = async (pageId, accessToken, fields = 'id,name') => {
    const response = await fetchFn(`${graphBase}/${encodeURIComponent(pageId)}?fields=${fields}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) throw await graphError('Facebook Page verification', response)
    return response.json()
  }

  const exchangeForLongLivedPageToken = async (pageId, userToken) => {
    if (!config.metaAppId || !config.metaAppSecret) return null
    const exchangeUrl = new URL(`${graphBase}/oauth/access_token`)
    exchangeUrl.searchParams.set('grant_type', 'fb_exchange_token')
    exchangeUrl.searchParams.set('client_id', config.metaAppId)
    exchangeUrl.searchParams.set('client_secret', config.metaAppSecret)
    exchangeUrl.searchParams.set('fb_exchange_token', userToken)
    const exchanged = await fetchFn(exchangeUrl, { method: 'GET' })
    if (!exchanged.ok) return null
    const longLivedUserToken = (await exchanged.json())?.access_token
    if (!longLivedUserToken) return null
    const page = await readPage(pageId, longLivedUserToken, 'id,name,access_token')
    return page.access_token ? { page, accessToken: page.access_token } : null
  }

  const verifyPage = async ({ pageId, accessToken }) => {
    if (!config.socialTokenEncryptionKey) throw new SocialPermanentError('Configure SOCIAL_TOKEN_ENCRYPTION_KEY before connecting Facebook.')
    let page
    let tokenToStore = accessToken
    try {
      const longLived = await exchangeForLongLivedPageToken(pageId, accessToken)
      if (longLived) {
        page = longLived.page
        tokenToStore = longLived.accessToken
      }
    } catch (error) {
      if (error instanceof SocialPermanentError && /invalid or expired/u.test(error.message)) throw error
    }
    page ||= await readPage(pageId, accessToken)
    if (String(page.id) !== String(pageId) || !page.name) throw new SocialPermanentError('Facebook did not return the requested Page.')
    return { pageId: String(page.id), pageName: page.name, encryptedAccessToken: encryptSocialToken(tokenToStore, config.socialTokenEncryptionKey) }
  }

  const publish = async ({ job, imageBytes, caption }) => {
    const form = new FormData()
    form.append('source', new Blob([imageBytes], { type: 'image/jpeg' }), 'clinic-post.jpg')
    form.append('caption', caption)
    form.append('published', 'true')
    const response = await fetchFn(`${graphBase}/${encodeURIComponent(job.connection.pageId)}/photos`, {
      method: 'POST',
      headers: { authorization: `Bearer ${pageToken(job.connection.encryptedAccessToken)}` },
      body: form,
    })
    if (!response.ok) throw await graphError('Facebook publishing', response)
    const result = await response.json()
    const id = String(result.post_id || result.id || '')
    if (!id) throw new Error('Facebook returned no post ID.')
    return { id, url: `https://www.facebook.com/${encodeURIComponent(id)}` }
  }

  const processPost = async (id) => {
    const job = await store.getSocialPostForProcessing(id)
    if (!job) return
    let finalDriveFileId
    try {
      const original = await storage.download(job.originalImage.driveFileId, MAX_IMAGE_BYTES)
      const analysis = await analyzeAndWrite({ config, fetchFn, job, imageBytes: original })
      const skipMedicalSafeguards = medicalSafeguardsDisabled(config, job)
      assertSocialPostPublishable(job, analysis, analysis.caption, { skipMedicalSafeguards })
      await moderate({ config, fetchFn, caption: analysis.caption, mimeType: job.originalImage.mimeType, imageBytes: original })
      const enhanced = await enhanceImage({ config, fetchFn, storage, job, analysis, imageBytes: original })
      const branded = await applyBranding({ storage, settings: job.settings, imageBytes: enhanced })
      if (!branded.length || branded.length > MAX_IMAGE_BYTES) throw new SocialBlockedError('The final branded image could not be compressed below 2 MB.')
      finalDriveFileId = await storage.upload({ bytes: branded, mimeType: 'image/jpeg', prefix: 'social-final' })
      await store.saveSocialPostGenerated({
        id, caption: analysis.caption,
        finalImage: { driveFileId: finalDriveFileId, mimeType: 'image/jpeg' },
        now: now(),
      })
      const limit = await store.canPublishSocialPost(now())
      if (!limit.allowed && limit.retryAt) {
        await store.deferSocialPost(id, limit.reason, limit.retryAt, now())
        return
      }
      if (!limit.allowed) throw new SocialBlockedError(limit.reason)
      await store.markSocialPostPublishing(id, now())
      const published = await publish({ job, imageBytes: branded, caption: analysis.caption })
      await store.markSocialPostPublished({ id, externalPostId: published.id, externalPostUrl: published.url, now: now() })
    } catch (error) {
      const reason = String(error?.message || 'The automatic publishing job failed.').slice(0, 1000)
      if (error instanceof SocialBlockedError) {
        await store.markSocialPostBlocked(id, reason, now())
      } else {
        const retryAt = error instanceof SocialPermanentError ? null : new Date(now().getTime() + 5 * 60_000)
        await store.markSocialPostFailed(id, reason, retryAt, now())
      }
    }
  }

  const run = async () => {
    if (running || !storage) return
    running = true
    try {
      const clinics = store.listSocialClinicIds ? await store.listSocialClinicIds() : [currentClinicId()]
      for (const clinicId of clinics) {
        await withClinic(clinicId, async () => {
          for (let count = 0; count < 5; count += 1) {
            const id = await store.claimNextSocialPost(now())
            if (!id) break
            await processPost(id)
          }
        })
      }
    } finally {
      running = false
    }
  }

  return {
    configured: Boolean(storage && config.openRouterApiKey && config.socialTokenEncryptionKey),
    verifyPage,
    wake: () => setImmediate(run),
    start() {
      if (timer || !storage) return
      timer = setInterval(run, 30_000)
      timer.unref?.()
      setImmediate(run)
    },
    stop() {
      if (timer) clearInterval(timer)
      timer = null
    },
    async removePost(id) {
      const post = await store.getPublishedSocialPost(id)
      if (!post) return false
      const response = await fetchFn(`${graphBase}/${encodeURIComponent(post.externalPostId)}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${pageToken(post.encryptedAccessToken)}` },
      })
      if (!response.ok) throw await graphError('Facebook post removal', response)
      return store.markSocialPostRemoved(id, now())
    },
  }
}
