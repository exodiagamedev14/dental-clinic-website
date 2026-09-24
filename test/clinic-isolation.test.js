import assert from 'node:assert/strict'
import { test } from 'node:test'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { migrate } from '../server/migrate.js'
import { createDatabase } from '../server/db.js'
import { loadConfig } from '../server/config.js'
import { buildApp } from '../server/app.js'
import { hashStaffPassword } from '../server/staff-auth.js'
import { createStore } from '../server/store.js'
import { LEGACY_CLINIC_ID, withClinic } from '../server/clinic-context.js'

test('clinic isolation survives login, concurrent requests, forged references, and pooled connections', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'dental-isolation-test-'))
  const bin = process.env.PG_BIN || (existsSync('/opt/homebrew/bin/initdb') ? '/opt/homebrew/bin' : '')
  const command = (name, args) => execFileSync(bin ? join(bin, name) : name, args, { stdio: 'pipe', timeout: 30000, env: { ...process.env, LC_ALL: 'C' } })
  let started = false, owner, app, db
  t.after(async () => {
    await app?.close()
    await db?.close()
    await owner?.end()
    try { if (started) command('pg_ctl', ['-D', directory, '-m', 'immediate', '-w', 'stop']) }
    finally { rmSync(directory, { recursive: true, force: true }) }
  })
  const listener = createServer()
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve))
  const port = listener.address().port
  await new Promise(resolve => listener.close(resolve))
  command('initdb', ['-D', directory, '--username=dental_test', '--auth=trust', '--no-locale', '--encoding=UTF8'])
  command('pg_ctl', ['-D', directory, '-l', join(directory, 'server.log'), '-w', 'start', '-o', `-h 127.0.0.1 -p ${port} -k ''`])
  started = true
  const ownerUrl = `postgresql://dental_test@127.0.0.1:${port}/postgres`
  await migrate(ownerUrl)
  owner = new pg.Client({ connectionString: ownerUrl })
  await owner.connect()
  await owner.query('CREATE ROLE dental_test_app LOGIN IN ROLE dental_portal_backend')
  const runtimeUrl = ownerUrl.replace('dental_test@', 'dental_test_app@')
  const config = loadConfig({ NODE_ENV: 'test', DATABASE_URL: runtimeUrl, PUBLIC_ORIGIN: 'https://dental.test', SESSION_PEPPER: 'a'.repeat(64), LOGIN_MAX_ATTEMPTS: '100' })
  app = await buildApp({ config, staticDir: new URL('./fixtures/static/', import.meta.url).pathname })
  db = createDatabase(config)
  const store = createStore(db)
  const password = '123456789012'
  const credentials = await hashStaffPassword(password)
  const clinics = [LEGACY_CLINIC_ID, randomUUID(), randomUUID()]
  const patients = [], staff = [], dentists = [], appointments = []
  for (const [index, id] of clinics.entries()) {
    if (index) {
      await owner.query('INSERT INTO dental_portal.clinics(id,name) VALUES ($1,$2)', [id, `Clinic ${index}`])
      await owner.query('INSERT INTO dental_portal.social_brand_settings(clinic_id,clinic_name) VALUES ($1,$2)', [id, `Clinic ${index}`])
    }
    const staffId = randomUUID(), patientId = randomUUID(), dentistId = randomUUID(), typeId = randomUUID(), appointmentId = randomUUID()
    staff.push(staffId); patients.push(patientId); dentists.push(dentistId); appointments.push(appointmentId)
    await owner.query("INSERT INTO dental_portal.staff_profiles(id,clinic_id,auth_user_id,email,display_name,normalized_name,role,password_salt,password_hash) VALUES ($1,$2,$3,'owner@example.test','Clinic Owner','clinic owner','super_admin',$4,$5)", [staffId,id,randomUUID(),credentials.passwordSalt,credentials.passwordHash])
    await owner.query("INSERT INTO dental_portal.patients(id,clinic_id,patient_number,display_name,normalized_name,portal_enabled) VALUES ($1,$2,'00001','Same Patient','same patient',true)", [patientId,id])
    await owner.query("INSERT INTO dental_portal.dentists(id,clinic_id,display_name) VALUES ($1,$2,'Clinic Dentist')", [dentistId,id])
    await owner.query("INSERT INTO dental_portal.appointment_types(id,clinic_id,name,default_duration_minutes) VALUES ($1,$2,'Test service',60)", [typeId,id])
    await owner.query("INSERT INTO dental_portal.appointments(id,clinic_id,patient_id,dentist_id,appointment_type_id,starts_at,ends_at,status) VALUES ($1,$2,$3,$4,$5,now()-interval '2 hours',now()-interval '1 hour','completed')", [appointmentId,id,patientId,dentistId,typeId])
    // This also exercises the SECURITY DEFINER checkout trigger.
    await owner.query("INSERT INTO dental_portal.patient_charges(clinic_id,appointment_id,patient_id,description,subtotal_cents,discount_cents,total_cents,created_by_staff_id) VALUES ($1,$2,$3,'Test treatment',10000,0,10000,$4)", [id,appointmentId,patientId,staffId])
  }
  const request = (clinicId, path, cookie, payload) => app.inject({
    url: `${clinicId === LEGACY_CLINIC_ID ? '' : `/c/${clinicId}`}${path}`,
    method: payload ? 'POST' : 'GET', payload,
    headers: { origin: config.publicOrigin, ...(cookie ? { cookie } : {}) },
  })
  const cookies = []
  for (const id of clinics) {
    const login = await request(id, '/api/staff/auth/login', null, { fullName: 'Clinic Owner', password })
    assert.equal(login.statusCode, 200, login.body)
    assert.equal(login.json().staff.role, 'super_admin')
    cookies.push(login.headers['set-cookie'].split(';')[0])
    assert.equal((await request(id, '/admin')).statusCode, 200, 'Clinic deep links serve the application')
  }
  for (let a = 0; a < clinics.length; a++) {
    for (let b = 0; b < clinics.length; b++) {
      const result = await request(clinics[b], '/api/admin/team', cookies[a])
      assert.equal(result.statusCode, a === b ? 200 : 401, result.body)
      if (a === b) assert.deepEqual(result.json().staff.map(row => row.id), [staff[a]])
    }
  }
  await Promise.all(Array.from({ length: 24 }, async (_, n) => {
    const index = n % 3
    const result = await request(clinics[index], '/api/admin/team', cookies[index])
    assert.deepEqual(result.json().staff.map(row => row.id), [staff[index]], 'Request context must not leak across connections')
  }))
  for (const [i, id] of clinics.entries()) {
    const result = await request(id, '/api/auth/login', null, { fullName: 'Same Patient', patientNumber: '00001' })
    assert.equal(result.statusCode, 200, result.body)
    const cookie = result.headers['set-cookie'].split(';')[0]
    assert.equal((await request(clinics[(i + 1) % 3], '/api/me', cookie)).statusCode, 401)
    await withClinic(id, async () => {
      assert.deepEqual((await db.query('SELECT id FROM patients')).rows, [{ id: patients[i] }])
      assert.deepEqual((await db.query('SELECT patient_id,clinic_id FROM clinical_records')).rows, [{ patient_id: patients[i], clinic_id: id }])
      assert.equal((await store.getSocialSettings()).clinicName, i ? `Clinic ${i}` : 'SmileCare Dental Clinic')
      await store.setSocialPageConnection({ pageId: String(100 + i), pageName: `Page ${i}`, encryptedAccessToken: 'test-only', staffId: staff[i], now: new Date() })
      await store.setSocialPageConnection({ pageId: String(100 + i), pageName: `Page ${i}`, encryptedAccessToken: 'test-only-updated', staffId: staff[i], now: new Date() })
      assert.equal((await store.getSocialSettings()).page.id, String(100 + i))
      assert.equal((await db.query('UPDATE patients SET display_name=$1 WHERE id=$2', ['Forged',patients[(i + 1) % 3]])).rowCount, 0)
      await assert.rejects(db.query('UPDATE appointments SET patient_id=$1 WHERE id=$2', [patients[(i + 1) % 3],appointments[i]]), { code: '23503' }, 'Foreign keys must reject cross-clinic references')
    })
  }
  const raw = new pg.Client({ connectionString: runtimeUrl })
  await raw.connect()
  try { assert.equal((await raw.query('SELECT * FROM dental_portal.patients')).rowCount, 0, 'Missing context fails closed') }
  finally { await raw.end() }
  const isolated = (await owner.query("SELECT tablename FROM pg_policies WHERE schemaname='dental_portal' AND policyname='clinic_isolation'")).rows
  assert.equal(isolated.length, 21, 'Every clinical, staff, billing, audit, and social table is isolated')
  await owner.query('UPDATE dental_portal.clinics SET active=false WHERE id=$1', [clinics[1]])
  assert.equal((await request(clinics[1], '/api/staff/me', cookies[1])).statusCode, 401)
  assert.equal((await request(randomUUID(), '/api/clinic')).statusCode, 404)
  assert.equal((await request(clinics[2], '/api/clinic')).json().clinic.name, 'Clinic 2')
})
