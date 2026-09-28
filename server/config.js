import { isSupabaseDatabaseHost } from './db-options.js'

const positiveInteger = (value, fallback, name, errors) => {
  const parsed = Number(value ?? fallback)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    errors.push(`${name} must be a positive integer`)
  }
  return parsed
}

const required = (value, name, errors) => {
  const result = value?.trim()
  if (!result) errors.push(`${name} is required`)
  return result
}

export function loadConfig(env = process.env) {
  const errors = []
  const nodeEnv = env.NODE_ENV || 'development'
  const port = positiveInteger(env.PORT, 3000, 'PORT', errors)
  const databaseUrl = required(env.DATABASE_URL, 'DATABASE_URL', errors)
  const sessionPepper = required(env.SESSION_PEPPER, 'SESSION_PEPPER', errors)
  const publicOriginValue = required(
    env.PUBLIC_ORIGIN || 'http://localhost:3000',
    'PUBLIC_ORIGIN',
    errors,
  )
  // ponytail: production defaults keep Coolify setup from disabling staff login;
  // override them with environment variables when deploying another project.
  const supabaseUrlValue = env.SUPABASE_URL?.trim() || (
    nodeEnv === 'production' ? 'https://csfhvyayuuvgtrbpnldq.supabase.co' : undefined
  )
  const supabasePublishableKey = env.SUPABASE_PUBLISHABLE_KEY?.trim() || (
    nodeEnv === 'production' ? 'sb_publishable_k8HnlMHTyeyY07HhOSPyPQ_aGHIvuG4' : undefined
  )
  const googleDrivePrescriptionsFolderId = env.GOOGLE_DRIVE_PRESCRIPTIONS_FOLDER_ID?.trim()
  const googleDriveCredentialsBase64 = env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_BASE64?.trim()
  const openRouterApiKey = env.OPENROUTER_API_KEY?.trim()
  const openRouterTextModel = env.OPENROUTER_TEXT_MODEL?.trim() || 'google/gemini-3.1-flash-lite'
  const openRouterImageModel = env.OPENROUTER_IMAGE_MODEL?.trim() || 'google/gemini-3.1-flash-image'
  const socialDebugMedicalBypassPageId = env.SOCIAL_DEBUG_MEDICAL_BYPASS_PAGE_ID?.trim() || null
  const metaGraphVersion = env.META_GRAPH_VERSION?.trim() || 'v25.0'
  const metaAppId = env.META_APP_ID?.trim() || null
  const metaAppSecret = env.META_APP_SECRET?.trim() || null
  const socialTokenEncryptionKeyBase64 = env.SOCIAL_TOKEN_ENCRYPTION_KEY?.trim()
  const socialPublisherEnabledValue = env.SOCIAL_PUBLISHER_ENABLED?.trim()
  if (socialPublisherEnabledValue && !['true', 'false'].includes(socialPublisherEnabledValue)) {
    errors.push('SOCIAL_PUBLISHER_ENABLED must be true or false')
  }
  let googleDriveCredentials
  let socialTokenEncryptionKey

  if (Boolean(googleDrivePrescriptionsFolderId) !== Boolean(googleDriveCredentialsBase64)) {
    errors.push('Google Drive folder ID and service account credentials must be configured together')
  }
  if (googleDriveCredentialsBase64) {
    try {
      googleDriveCredentials = JSON.parse(Buffer.from(googleDriveCredentialsBase64, 'base64').toString('utf8'))
      if (!googleDriveCredentials.client_email || !googleDriveCredentials.private_key || !googleDriveCredentials.token_uri) throw new Error()
    } catch {
      errors.push('GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_BASE64 must contain valid service account JSON')
    }
  }
  if (socialTokenEncryptionKeyBase64) {
    try {
      socialTokenEncryptionKey = Buffer.from(socialTokenEncryptionKeyBase64, 'base64')
      if (socialTokenEncryptionKey.length !== 32) throw new Error()
    } catch {
      errors.push('SOCIAL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
    }
  }
  if (!/^v\d+\.0$/u.test(metaGraphVersion)) {
    errors.push('META_GRAPH_VERSION must look like v25.0')
  }
  if (socialDebugMedicalBypassPageId && !/^\d{5,30}$/u.test(socialDebugMedicalBypassPageId)) {
    errors.push('SOCIAL_DEBUG_MEDICAL_BYPASS_PAGE_ID must be a numeric Facebook Page ID')
  }

  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    errors.push('NODE_ENV must be development, test, or production')
  }

  let publicOrigin
  try {
    const url = new URL(publicOriginValue)
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== publicOriginValue.replace(/\/$/, '')) {
      throw new Error()
    }
    publicOrigin = url.origin
  } catch {
    errors.push('PUBLIC_ORIGIN must be an origin without a path, query, or fragment')
  }

  let supabaseUrl
  if (supabaseUrlValue) {
    try {
      const url = new URL(supabaseUrlValue)
      if (url.protocol !== 'https:' || url.origin !== supabaseUrlValue.replace(/\/$/, '')) {
        throw new Error()
      }
      supabaseUrl = url.origin
    } catch {
      errors.push('SUPABASE_URL must be an HTTPS origin without a path')
    }
  }
  if (Boolean(supabaseUrlValue) !== Boolean(supabasePublishableKey)) {
    errors.push('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured together')
  }

  if (sessionPepper && Buffer.byteLength(sessionPepper) < 32) {
    errors.push('SESSION_PEPPER must contain at least 32 bytes')
  }

  const sessionIdleMinutes = positiveInteger(
    env.SESSION_IDLE_MINUTES,
    30,
    'SESSION_IDLE_MINUTES',
    errors,
  )
  const sessionAbsoluteHours = positiveInteger(
    env.SESSION_ABSOLUTE_HOURS,
    8,
    'SESSION_ABSOLUTE_HOURS',
    errors,
  )
  const loginMaxAttempts = positiveInteger(
    env.LOGIN_MAX_ATTEMPTS,
    5,
    'LOGIN_MAX_ATTEMPTS',
    errors,
  )
  const loginWindowMinutes = positiveInteger(
    env.LOGIN_WINDOW_MINUTES,
    15,
    'LOGIN_WINDOW_MINUTES',
    errors,
  )

  if (nodeEnv === 'production') {
    if (!googleDrivePrescriptionsFolderId || !googleDriveCredentials) {
      errors.push('Google Drive prescription storage is required in production')
    }
    if (databaseUrl) {
      let database
      try {
        database = new URL(databaseUrl)
        if (!['postgres:', 'postgresql:'].includes(database.protocol)) throw new Error()
      } catch {
        errors.push('DATABASE_URL must be a valid PostgreSQL URL')
      }
      if (database) {
        if (!isSupabaseDatabaseHost(database.hostname.toLowerCase())) {
          errors.push('DATABASE_URL must use a Supabase database host in production')
        }
        if (!/^dental_portal_app(?:\.[a-z]{20})?$/.test(database.username)) {
          errors.push(
            'DATABASE_URL must use the least-privilege dental_portal_app role in production',
          )
        }
        if (database.port !== '5432') {
          errors.push(
            'DATABASE_URL must use Supabase direct or session-pooler port 5432 in production',
          )
        }
      }
    }
    if (publicOrigin && !publicOrigin.startsWith('https://')) {
      errors.push('PUBLIC_ORIGIN must use HTTPS in production')
    }
    if (/replace|change|development|example/i.test(sessionPepper || '')) {
      errors.push(
        'SESSION_PEPPER must not use a development placeholder in production',
      )
    }
  }

  if (errors.length) {
    throw new Error(`Invalid configuration:\n- ${errors.join('\n- ')}`)
  }

  return Object.freeze({
    nodeEnv,
    port,
    databaseUrl,
    publicOrigin,
    sessionPepper,
    sessionIdleMinutes,
    sessionAbsoluteHours,
    loginMaxAttempts,
    loginWindowMinutes,
    supabaseUrl,
    supabasePublishableKey,
    googleDrivePrescriptionsFolderId,
    googleDriveCredentials,
    openRouterApiKey,
    openRouterTextModel,
    openRouterImageModel,
    socialDebugMedicalBypassPageId,
    metaGraphVersion,
    metaAppId,
    metaAppSecret,
    socialTokenEncryptionKey,
    socialPublisherEnabled: socialPublisherEnabledValue !== 'false',
  })
}
