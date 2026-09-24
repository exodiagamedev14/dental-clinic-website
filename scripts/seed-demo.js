import { existsSync } from 'node:fs'
import pg from 'pg'
import { normalizeName } from '../server/auth.js'
import {
  databaseClientOptions,
  isSupabaseDatabaseHost,
} from '../server/db-options.js'

if (existsSync('.env')) process.loadEnvFile('.env')

const databaseUrl =
  process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('MIGRATION_DATABASE_URL or DATABASE_URL is required')
}

let isSupabase = false
try {
  isSupabase = isSupabaseDatabaseHost(new URL(databaseUrl).hostname.toLowerCase())
} catch {
  throw new Error('MIGRATION_DATABASE_URL or DATABASE_URL must be valid')
}

if (
  (process.env.NODE_ENV === 'production' || isSupabase) &&
  process.env.ALLOW_PRODUCTION_DEMO_SEED !== 'true'
) {
  throw new Error(
    'Demo seed is disabled for production or Supabase. Set ALLOW_PRODUCTION_DEMO_SEED=true only for an approved fictional-data environment.',
  )
}

const { Client } = pg
const client = new Client(databaseClientOptions(databaseUrl))
const ids = {
  patient: '10000000-0000-4000-8000-000000000001',
  dentist: '20000000-0000-4000-8000-000000000001',
  futureAppointment: '30000000-0000-4000-8000-000000000001',
  pastAppointment: '30000000-0000-4000-8000-000000000002',
  plan: '40000000-0000-4000-8000-000000000001',
  hiddenPlan: '40000000-0000-4000-8000-000000000002',
  record: '50000000-0000-4000-8000-000000000001',
  hiddenRecord: '50000000-0000-4000-8000-000000000002',
}

await client.connect()
try {
  await client.query('BEGIN')
  await client.query("SELECT set_config('app.clinic_id', '00000000-0000-4000-8000-000000000001', true)")
  await client.query(
    `INSERT INTO patients (
       id, patient_number, display_name, normalized_name, phone_e164,
       phone_verified_at, portal_enabled
     ) VALUES ($1, 'PT-DEMO01', 'Patricia Portal Demo', $2, '+639000000001', now(), true)
     ON CONFLICT (id) DO UPDATE SET
       patient_number = EXCLUDED.patient_number,
       display_name = EXCLUDED.display_name,
       normalized_name = EXCLUDED.normalized_name,
       phone_e164 = EXCLUDED.phone_e164,
       phone_verified_at = EXCLUDED.phone_verified_at,
       portal_enabled = true,
       updated_at = now()`,
    [ids.patient, normalizeName('Patricia Portal Demo')],
  )
  await client.query(
    `INSERT INTO dentists (id, display_name, specialty, active)
     VALUES ($1, 'Dr. Andrea Sample', 'General Dentistry and Orthodontics', true)
     ON CONFLICT (id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       specialty = EXCLUDED.specialty,
       active = true`,
    [ids.dentist],
  )

  const appointmentTypes = [
    ['60000000-0000-4000-8000-000000000001', 'Cleaning', 45, 'Routine dental cleaning.'],
    ['60000000-0000-4000-8000-000000000002', 'Brace Adjustment', 30, 'Scheduled orthodontic adjustment.'],
    ['60000000-0000-4000-8000-000000000003', 'Routine Checkup', 30, 'Routine oral health check.'],
    ['60000000-0000-4000-8000-000000000004', 'Consultation', 30, 'Consultation with a dentist.'],
    ['60000000-0000-4000-8000-000000000005', 'Extraction', 60, 'Planned tooth extraction.'],
    ['60000000-0000-4000-8000-000000000006', 'Filling', 45, 'Restorative filling appointment.'],
  ]
  for (const type of appointmentTypes) {
    await client.query(
      `INSERT INTO appointment_types (
         id, name, default_duration_minutes, patient_description
       ) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         default_duration_minutes = EXCLUDED.default_duration_minutes,
         patient_description = EXCLUDED.patient_description`,
      type,
    )
  }

  const futureStart = new Date(Date.now() + 7 * 86_400_000)
  futureStart.setUTCHours(2, 0, 0, 0)
  const futureEnd = new Date(futureStart.getTime() + 30 * 60_000)
  const pastStart = new Date(Date.now() - 30 * 86_400_000)
  pastStart.setUTCHours(1, 0, 0, 0)
  const pastEnd = new Date(pastStart.getTime() + 45 * 60_000)

  await client.query(
    `INSERT INTO appointments (
       id, patient_id, dentist_id, appointment_type_id, starts_at, ends_at,
       status, patient_instructions
     ) VALUES ($1, $2, $3, $4, $5, $6, 'confirmed',
       'Please arrive 10 minutes early.')
     ON CONFLICT (id) DO UPDATE SET
       starts_at = EXCLUDED.starts_at,
       ends_at = EXCLUDED.ends_at,
       status = EXCLUDED.status,
       patient_instructions = EXCLUDED.patient_instructions,
       updated_at = now()`,
    [
      ids.futureAppointment,
      ids.patient,
      ids.dentist,
      appointmentTypes[1][0],
      futureStart,
      futureEnd,
    ],
  )
  await client.query(
    `INSERT INTO appointments (
       id, patient_id, dentist_id, appointment_type_id, starts_at, ends_at,
       status, patient_instructions
     ) VALUES ($1, $2, $3, $4, $5, $6, 'completed', null)
     ON CONFLICT (id) DO UPDATE SET
       starts_at = EXCLUDED.starts_at,
       ends_at = EXCLUDED.ends_at,
       status = EXCLUDED.status,
       updated_at = now()`,
    [
      ids.pastAppointment,
      ids.patient,
      ids.dentist,
      appointmentTypes[0][0],
      pastStart,
      pastEnd,
    ],
  )

  await client.query(
    `INSERT INTO treatment_plans (
       id, patient_id, title, patient_summary, status, started_on,
       recommended_interval_days, next_recommended_on, published_at
     ) VALUES (
       $1, $2, 'Orthodontic Care Plan',
       'Continue regular brace adjustments and follow the cleaning instructions provided by the clinic.',
       'active', current_date - 90, 30, current_date + 7, now()
     )
     ON CONFLICT (id) DO UPDATE SET
       patient_summary = EXCLUDED.patient_summary,
       status = EXCLUDED.status,
       next_recommended_on = EXCLUDED.next_recommended_on,
       published_at = EXCLUDED.published_at,
       updated_at = now()`,
    [ids.plan, ids.patient],
  )
  await client.query(
    `INSERT INTO treatment_plans (
       id, patient_id, title, patient_summary, status, published_at
     ) VALUES ($1, $2, 'Unpublished Demo Plan', 'Not visible to the patient.', 'active', null)
     ON CONFLICT (id) DO UPDATE SET published_at = null, updated_at = now()`,
    [ids.hiddenPlan, ids.patient],
  )
  await client.query(
    `INSERT INTO clinical_records (
       id, patient_id, dentist_id, appointment_id, procedure_name,
       treated_on, patient_summary, published_at
     ) VALUES (
       $1, $2, $3, $4, 'Dental Cleaning', current_date - 30,
       'Routine cleaning was completed. Continue brushing and flossing as advised.',
       now()
     )
     ON CONFLICT (id) DO UPDATE SET
       patient_summary = EXCLUDED.patient_summary,
       published_at = EXCLUDED.published_at,
       updated_at = now()`,
    [ids.record, ids.patient, ids.dentist, ids.pastAppointment],
  )
  await client.query(
    `INSERT INTO clinical_records (
       id, patient_id, dentist_id, procedure_name, treated_on,
       patient_summary, published_at
     ) VALUES (
       $1, $2, $3, 'Unpublished Demo Procedure', current_date,
       'Not visible to the patient.', null
     )
     ON CONFLICT (id) DO UPDATE SET published_at = null, updated_at = now()`,
    [ids.hiddenRecord, ids.patient, ids.dentist],
  )
  await client.query('COMMIT')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  await client.end()
}
