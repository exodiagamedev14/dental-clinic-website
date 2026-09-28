import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import { randomBytes, randomUUID } from 'node:crypto'
import { authRequiredError, SESSION_COOKIE, STAFF_SESSION_COOKIE, sessionCookieOptions, sha256 } from './auth.js'
import { loadConfig } from './config.js'
import { createDatabase } from './db.js'
import { createStore } from './store.js'
import authRoutes from './routes/auth.js'
import healthRoutes from './routes/health.js'
import patientRoutes from './routes/patient.js'
import staffRoutes from './routes/staff.js'
import dentistRoutes from './routes/dentist.js'
import adminRoutes from './routes/admin.js'
import { createStaffCredentialVerifier } from './staff-auth.js'
import { createGoogleDriveStorage } from './google-drive.js'
import { createSocialPublisher } from './social-publishing.js'

const defaultStaticDirectory = fileURLToPath(new URL('../dist/', import.meta.url))
const stateChangingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export async function buildApp({
  config = loadConfig(),
  db,
  store,
  now = () => new Date(),
  randomBytesFn = randomBytes,
  randomUUIDFn = randomUUID,
  staticDir = defaultStaticDirectory,
  logger = config.nodeEnv !== 'test',
  verifyStaffCredentials,
  prescriptionStorage,
  socialStorage,
  socialPublisher,
} = {}) {
  const app = Fastify({
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
    logger:
      logger === true
        ? {
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body',
                'res.headers.set-cookie',
              ],
              censor: '[REDACTED]',
            },
          }
        : logger,
    trustProxy: 1,
    bodyLimit: 32 * 1024,
  })

  let ownedDatabase
  if (!store) {
    ownedDatabase = db || createDatabase(config)
    store = createStore(ownedDatabase)
  }
  prescriptionStorage ??= createGoogleDriveStorage(config)
  socialStorage ??= prescriptionStorage
  // Previews sharing the production database must not claim or publish live jobs.
  if (config.socialPublisherEnabled === false) {
    socialPublisher = undefined
  } else if (!socialPublisher && socialStorage && typeof store.claimNextSocialPost === 'function') {
    socialPublisher = createSocialPublisher({ config, store, storage: socialStorage, now })
  }

  await app.register(cookie)
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
      },
    },
  })
  await app.register(rateLimit, { global: false })

  app.decorateRequest('patient', null)
  app.decorateRequest('staff', null)
  app.decorate('authenticate', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    if (!token) return reply.code(401).send(authRequiredError)
    const currentTime = now()
    const idleCutoff = new Date(
      currentTime.getTime() - config.sessionIdleMinutes * 60_000,
    )
    const patient = await store.authenticateSession(
      sha256(token),
      currentTime,
      idleCutoff,
    )
    if (!patient) {
      reply.clearCookie(SESSION_COOKIE, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
      })
      return reply.code(401).send(authRequiredError)
    }
    request.patient = patient
  })
  app.decorate('authenticateStaff', async (request, reply) => {
    const token = request.cookies[STAFF_SESSION_COOKIE]
    if (!token) return reply.code(401).send(authRequiredError)
    const currentTime = now()
    const idleCutoff = new Date(
      currentTime.getTime() - config.sessionIdleMinutes * 60_000,
    )
    const staff = await store.authenticateStaffSession(
      sha256(token),
      currentTime,
      idleCutoff,
    )
    if (!staff) {
      reply.clearCookie(STAFF_SESSION_COOKIE, sessionCookieOptions)
      return reply.code(401).send(authRequiredError)
    }
    request.staff = staff
  })

  app.addHook('onRequest', async (request, reply) => {
    if (
      request.url.startsWith('/api/') &&
      stateChangingMethods.has(request.method) &&
      request.headers.origin !== config.publicOrigin
    ) {
      return reply.code(403).send({
        error: {
          code: 'INVALID_ORIGIN',
          message: 'This request was not accepted.',
        },
      })
    }
  })

  app.addHook('onSend', async (request, reply, payload) => {
    if (
      request.url.startsWith('/api/auth/') ||
      request.url.startsWith('/api/staff/') ||
      request.url.startsWith('/api/dentist/') ||
      request.url.startsWith('/api/admin/') ||
      request.url === '/api/me' ||
      request.url.startsWith('/api/me/')
    ) {
      reply.header('cache-control', 'no-store')
    }
    return payload
  })

  await app.register(healthRoutes, { store })
  await app.register(authRoutes, {
    store,
    config,
    now,
    randomBytes: randomBytesFn,
    randomUUID: randomUUIDFn,
  })
  await app.register(patientRoutes, { store, config, now, prescriptionStorage })
  await app.register(staffRoutes, {
    store,
    config,
    now,
    randomBytes: randomBytesFn,
    randomUUID: randomUUIDFn,
    verifyStaffCredentials:
      verifyStaffCredentials || createStaffCredentialVerifier(config),
  })
  await app.register(dentistRoutes, {
    store, config, now, prescriptionStorage, socialStorage, socialPublisher,
  })
  await app.register(adminRoutes, {
    store,
    config,
    now,
    randomBytes: randomBytesFn,
    randomUUID: randomUUIDFn,
    socialStorage,
    socialPublisher,
  })

  socialPublisher?.start?.()

  const hasStaticFiles = Boolean(staticDir && existsSync(path.join(staticDir, 'index.html')))
  if (hasStaticFiles) {
    await app.register(fastifyStatic, {
      root: staticDir,
      prefix: '/',
      wildcard: false,
      decorateReply: true,
    })
  }

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'The requested endpoint was not found.' },
      })
    }
    if (
      hasStaticFiles &&
      request.method === 'GET' &&
      (request.url === '/' ||
        request.url.startsWith('/login') ||
        request.url.startsWith('/portal') ||
        request.url.startsWith('/reception') ||
        request.url.startsWith('/dentist') ||
        request.url.startsWith('/admin'))
    ) {
      return reply.type('text/html').sendFile('index.html')
    }
    return reply.code(404).send('Not Found')
  })

  app.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      return reply.code(400).send({
        error: { code: 'INVALID_REQUEST', message: 'Please check the submitted details.' },
      })
    }
    if (error.statusCode === 429) {
      return reply.code(429).send({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many attempts. Please wait and try again.',
        },
      })
    }
    request.log.error({ err: error }, 'Request failed')
    return reply.code(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.' },
    })
  })

  if (ownedDatabase) {
    app.addHook('onClose', async () => {
      socialPublisher?.stop?.()
      await ownedDatabase.close()
    })
  } else if (socialPublisher?.stop) {
    app.addHook('onClose', async () => socialPublisher.stop())
  }

  return app
}
