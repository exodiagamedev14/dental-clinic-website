import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { buildApp } from '../server/app.js'
import { normalizeName, normalizePatientNumber, normalizePhone, sha256 } from '../server/auth.js'
import { loadConfig } from '../server/config.js'
import { hashStaffPassword } from '../server/staff-auth.js'

const config = {
  nodeEnv: 'test',
  publicOrigin: 'https://dental.test',
  databaseUrl: 'postgres://unused',
  sessionPepper: 'session-pepper-for-tests-only-000000000',
  sessionIdleMinutes: 30,
  sessionAbsoluteHours: 8,
  loginMaxAttempts: 50,
  loginWindowMinutes: 15,
}

class MemoryStore {
  constructor() {
    this.patient = {
      id: '10000000-0000-4000-8000-000000000001',
      displayName: 'Patricia Portal Demo',
      patientNumber: 'PT-DEMO01',
      phone: '+639000000001',
      enabled: true,
    }
    this.staff = {
      id: '80000000-0000-4000-8000-000000000001',
      authUserId: '90000000-0000-4000-8000-000000000001',
      displayName: 'Rina Reception',
      email: 'reception@dental.test',
      role: 'receptionist',
      dentistId: null,
      active: true,
    }
    this.staffAccounts = [this.staff]
    this.otherPatientId = '10000000-0000-4000-8000-000000000002'
    this.dentist = {
      id: '20000000-0000-4000-8000-000000000001',
      displayName: 'Dr. Andrea Sample',
      active: true,
    }
    this.dentists = [this.dentist, {
      id: '20000000-0000-4000-8000-000000000002',
      displayName: 'Dr. Marco Reyes',
      active: true,
    }]
    this.services = [
      {
        id: '60000000-0000-4000-8000-000000000001',
        name: 'Cleaning',
        durationMinutes: 45,
        patientDescription: 'Routine dental cleaning.',
      },
      {
        id: '60000000-0000-4000-8000-000000000002',
        name: 'Brace Adjustment',
        durationMinutes: 30,
        patientDescription: 'Scheduled orthodontic adjustment.',
      },
    ]
    this.appointmentRequests = []
    this.appointments = [
      {
        patientId: this.patient.id,
        id: '30000000-0000-4000-8000-000000000001',
        typeName: 'Brace Adjustment',
        startsAt: '2030-01-01T02:00:00.000Z',
        endsAt: '2030-01-01T02:30:00.000Z',
        status: 'confirmed',
        dentistId: this.dentist.id,
        dentistName: 'Dr. Andrea Sample',
        patientInstructions: 'Arrive early.',
      },
      {
        patientId: this.otherPatientId,
        id: '30000000-0000-4000-8000-000000000099',
        typeName: 'Private appointment',
      },
      {
        patientId: this.patient.id,
        id: '30000000-0000-4000-8000-000000000002',
        typeName: 'Completed future visit',
        startsAt: '2030-01-01T03:00:00.000Z',
        endsAt: '2030-01-01T04:00:00.000Z',
        status: 'completed',
        dentistId: this.dentist.id,
        dentistName: 'Dr. Andrea Sample',
      },
    ]
    this.records = [
      {
        patientId: this.patient.id,
        published: true,
        id: '50000000-0000-4000-8000-000000000001',
        appointmentId: '30000000-0000-4000-8000-000000000001',
        procedureName: 'Dental Cleaning',
        treatedOn: '2026-06-01',
        patientSummary: 'Published patient summary.',
        dentistName: 'Dr. Andrea Sample',
      },
      {
        patientId: this.patient.id,
        published: false,
        id: '50000000-0000-4000-8000-000000000002',
        procedureName: 'Unpublished treatment',
      },
      {
        patientId: this.otherPatientId,
        published: true,
        id: '50000000-0000-4000-8000-000000000099',
        procedureName: 'Other patient treatment',
      },
    ]
    this.plans = [
      {
        patientId: this.patient.id,
        published: true,
        id: '40000000-0000-4000-8000-000000000001',
        title: 'Orthodontic Care Plan',
        patientSummary: 'Published plan.',
        status: 'active',
      },
      {
        patientId: this.patient.id,
        published: false,
        id: '40000000-0000-4000-8000-000000000002',
        title: 'Unpublished plan',
      },
      {
        patientId: this.otherPatientId,
        published: true,
        id: '40000000-0000-4000-8000-000000000099',
        title: 'Other patient plan',
      },
    ]
    this.sessions = new Map()
    this.staffSessions = new Map()
    this.charges = []
    this.prescriptions = []
    this.followUps = []
    this.audits = []
    this.healthy = true
  }

  async health() {
    if (!this.healthy) throw new Error('unavailable')
  }

  async createSessionForLogin(input) {
    const credentialMatches = input.patientNumber
      ? input.patientNumber === this.patient.patientNumber
      : input.phoneDigits === normalizePhone(this.patient.phone)
    if (
      !this.patient.enabled ||
      input.normalizedName !== normalizeName(this.patient.displayName) ||
      !credentialMatches
    ) {
      this.audits.push({
        actorType: 'anonymous',
        action: 'portal.login_failed',
        ...input.audit,
      })
      return null
    }
    this.sessions.set(input.tokenDigest, {
      patient: this.patient,
      lastSeenAt: input.now,
      absoluteExpiresAt: input.absoluteExpiresAt,
      revokedAt: null,
    })
    this.audits.push({
      actorType: 'patient',
      actorId: this.patient.id,
      action: 'portal.login_succeeded',
      occurredAt: input.now,
      ...input.audit,
    })
    return this.patient
  }

  async authenticateSession(tokenDigest, now, idleCutoff) {
    const session = this.sessions.get(tokenDigest)
    if (
      !session ||
      session.revokedAt ||
      session.absoluteExpiresAt <= now ||
      session.lastSeenAt < idleCutoff ||
      !session.patient.enabled
    ) {
      return null
    }
    session.lastSeenAt = now
    return session.patient
  }

  async revokeSession(tokenDigest, now) {
    const session = this.sessions.get(tokenDigest)
    if (!session || session.revokedAt) return null
    session.revokedAt = now
    return session.patient
  }

  async updatePatientPhone(patientId, phoneE164) {
    if (patientId !== this.patient.id) return null
    this.patient.phone = phoneE164
    return phoneE164
  }

  async findActiveStaffLogin(normalizedName) {
    const storedName = normalizeName(this.staff.displayName)
    const enteredDoctorName = normalizedName.replace(/^dr\.?\s+/u, '')
    const storedDoctorName = storedName.replace(/^dr\.?\s+/u, '')
    return this.staff.active && (
      normalizedName === storedName ||
      (this.staff.role === 'dentist' && enteredDoctorName === storedDoctorName)
    )
      ? {
          email: this.staff.email,
          authUserId: this.staff.authUserId,
          passwordSalt: this.staff.passwordSalt,
          passwordHash: this.staff.passwordHash,
        }
      : null
  }

  async createStaffSessionForLogin(input) {
    if (!this.staff.active || input.authUserId !== this.staff.authUserId) return null
    this.staffSessions.set(input.tokenDigest, {
      staff: this.staff,
      lastSeenAt: input.now,
      absoluteExpiresAt: input.absoluteExpiresAt,
      revokedAt: null,
    })
    this.audits.push({
      actorType: 'staff',
      actorId: this.staff.id,
      action: this.staff.role === 'super_admin' ? 'admin.login_succeeded' : 'staff.login_succeeded',
      occurredAt: input.now,
      ...input.audit,
    })
    return this.staff
  }

  async authenticateStaffSession(tokenDigest, now, idleCutoff) {
    const session = this.staffSessions.get(tokenDigest)
    if (!session || session.revokedAt || session.absoluteExpiresAt <= now || session.lastSeenAt < idleCutoff || !session.staff.active) return null
    session.lastSeenAt = now
    return session.staff
  }

  async revokeStaffSession(tokenDigest, now) {
    const session = this.staffSessions.get(tokenDigest)
    if (!session || session.revokedAt) return null
    session.revokedAt = now
    return session.staff
  }

  async addAudit(event) {
    this.audits.push(event)
  }

  async getDashboard() {
    return {
      nextAppointment: null,
      treatmentPlan: null,
      recentRecord: null,
      services: this.services,
    }
  }

  async listServices() {
    return this.services
  }

  async listAppointmentRequests(patientId) {
    return this.appointmentRequests
      .filter((request) => request.patientId === patientId && request.status === 'requested')
      .map(({ patientId: _patientId, ...request }) => request)
  }

  async getReceptionDashboard() {
    return {
      pendingRequests: this.appointmentRequests.filter(({ status }) => status === 'requested').length,
      todayAppointments: [],
      todayRequests: [],
    }
  }

  async getAdminAnalytics({ from, comparison }) {
    const metrics = {
      grossBilledCents: 120000, discountsCents: 5000, netBilledCents: 115000,
      cashCollectedCents: 100000, outstandingCents: 15000, completedVisits: 4,
      averageBilledCents: 28750, collectionRate: 0.87, cancelledVisits: 1,
      noShowVisits: 0, cancellationRate: 0.2, noShowRate: 0,
      newPatientProfiles: 2, scheduledFutureVisits: 3, dataPoints: 5,
    }
    return {
      metrics,
      comparisonMetrics: comparison ? { ...metrics, netBilledCents: 100000, dataPoints: 4 } : null,
      comparisonAvailable: Boolean(comparison),
      trend: [{ date: from, completedVisits: 4, netBilledCents: 115000, cashCollectedCents: 100000 }],
      comparisonTrend: [],
      services: [{ id: this.services[0].id, name: 'Cleaning', completedVisits: 4, serviceMix: 1, netBilledCents: 115000, averageBilledCents: 28750 }],
      doctors: [{ id: this.dentist.id, displayName: this.dentist.displayName, specialty: null, active: true, completedVisits: 4, upcomingVisits: 3, cancelledVisits: 1, noShowVisits: 0, netBilledCents: 115000 }],
      paymentMethods: [{ method: 'cash', amountCents: 100000 }],
      aging: { currentCents: 15000, days31_60Cents: 0, days61_90Cents: 0, over90Cents: 0 },
    }
  }

  async listAdminStaff() {
    return this.staffAccounts.map(({ email: _email, authUserId: _authUserId, ...staff }) => ({ ...staff, createdAt: currentTime.toISOString(), lastLoginAt: null }))
  }

  async createAdminStaff(input) {
    if (this.staffAccounts.some((staff) => normalizeName(staff.displayName) === input.normalizedName)) return { outcome: 'already_exists' }
    const staff = {
      id: '80000000-0000-4000-8000-000000000002', authUserId: input.authUserId,
      displayName: input.displayName, email: input.email, role: input.role,
      dentistId: input.role === 'dentist' ? '20000000-0000-4000-8000-000000000003' : null,
      active: true, specialty: input.specialty, createdAt: input.now.toISOString(), lastLoginAt: null,
    }
    this.staffAccounts.push(staff)
    const { email: _email, authUserId: _authUserId, ...safe } = staff
    return { outcome: 'created', staff: safe }
  }

  async setAdminStaffActive(id, active) {
    const staff = this.staffAccounts.find((item) => item.id === id)
    if (!staff) return null
    staff.active = active
    return staff
  }

  async resetAdminStaffPassword(id) {
    return this.staffAccounts.some((item) => item.id === id)
  }

  async revokeAdminStaffSessions(id) {
    return this.staffAccounts.some((item) => item.id === id)
  }

  async listAdminAudit() {
    return this.audits
      .filter(({ action }) => ['portal.login_succeeded', 'portal.logout', 'staff.login_succeeded', 'staff.logout', 'admin.login_succeeded', 'admin.logout'].includes(action))
      .map((event, index) => {
        const staff = this.staffAccounts.find(({ id }) => id === event.actorId)
        const patient = event.actorType === 'patient' && event.actorId === this.patient.id ? this.patient : null
        return {
          id: String(index), actorName: patient?.displayName || staff?.displayName,
          category: patient ? 'patient' : staff?.role === 'dentist' ? 'doctor' : staff?.role === 'super_admin' ? 'superadmin' : 'receptionist',
          activity: event.action.endsWith('login_succeeded') ? 'login' : 'logout',
          occurredAt: event.occurredAt || currentTime,
        }
      })
  }

  async getDentistDashboard(dentistId, date) {
    const active = this.appointments
      .filter((appointment) => appointment.dentistId === dentistId &&
        ['scheduled', 'confirmed'].includes(appointment.status) && !appointment.dentistDoneAt)
    const withPatient = (appointment) => ({
      ...appointment,
      patient: {
        ...this.patient,
        age: 29,
        gender: 'female',
        allergies: 'Penicillin',
      },
    })
    return {
      appointments: active.filter(({ startsAt }) => startsAt?.slice(0, 10) === date).map(withPatient),
      upcomingAppointments: active.filter(({ startsAt }) => startsAt?.slice(0, 10) > date).map(withPatient),
    }
  }

  async searchDentistPatients(dentistId, query, now) {
    const assigned = this.appointments.some((appointment) =>
      appointment.patientId === this.patient.id && appointment.dentistId === dentistId &&
      ['scheduled', 'confirmed'].includes(appointment.status) && !appointment.dentistDoneAt &&
      appointment.startsAt.slice(0, 10) <= new Date(now.getTime() + 8 * 60 * 60_000).toISOString().slice(0, 10))
    if (!assigned || !this.patient.displayName.toLowerCase().includes(query.toLowerCase())) return []
    return [{ ...this.patient, age: 29, gender: 'female', allergies: 'Penicillin' }]
  }

  async getDentistPatient(dentistId, patientId) {
    const assigned = this.appointments.some((appointment) =>
      appointment.patientId === patientId && appointment.dentistId === dentistId)
    if (!assigned) return null
    const appointments = this.appointments.filter((appointment) => appointment.patientId === patientId)
    return {
      patient: { ...this.patient, age: 29, gender: 'female', allergies: 'Penicillin' },
      appointments,
      completionAppointment: appointments.find((appointment) =>
        appointment.dentistId === dentistId &&
        ['scheduled', 'confirmed'].includes(appointment.status) &&
        !appointment.dentistDoneAt) || null,
      records: this.records.filter((record) => record.patientId === patientId),
      treatmentPlans: this.plans.filter((plan) => plan.patientId === patientId),
      prescriptions: this.prescriptions.filter((item) => item.patientId === patientId),
      followUps: this.followUps.filter((item) => item.patientId === patientId),
      services: this.services,
    }
  }

  async completeDentistVisit(input) {
    const appointment = this.appointments.find((item) =>
      item.id === input.appointmentId && item.patientId === input.patientId &&
      item.dentistId === input.dentistId && ['scheduled', 'confirmed'].includes(item.status) &&
      !item.dentistDoneAt)
    if (!appointment) return { outcome: 'not_found' }
    if (input.followUp?.appointmentTypeId && !this.services.some(({ id }) => id === input.followUp.appointmentTypeId)) {
      return { outcome: 'invalid_service' }
    }
    if (input.followUp) {
      const scheduled = await this.createReceptionAppointment({
        patientId: input.patientId,
        dentistId: input.dentistId,
        appointmentTypeId: input.followUp.appointmentTypeId,
        startsAt: input.followUp.startsAt,
        now: input.now,
      })
      if (scheduled.outcome !== 'created') return scheduled
    }
    if (input.prescription) {
      this.prescriptions.push({
        id: 'a0000000-0000-4000-8000-000000000002', patientId: input.patientId,
        dentistName: this.dentist.displayName, ...input.prescription,
      })
    }
    appointment.dentistDoneAt = input.now
    appointment.proposedFeeCents = input.proposedFeeCents
    return { outcome: 'completed' }
  }

  async createDentistPrescription(input) {
    if (!await this.getDentistPatient(input.dentistId, input.patientId)) return null
    const id = 'a0000000-0000-4000-8000-000000000001'
    this.prescriptions.push({
      id,
      patientId: input.patientId,
      genericName: input.genericName,
      instructions: input.instructions,
      prescribedOn: input.prescribedOn,
      imageMimeType: input.imageMimeType,
      imageOriginalName: input.imageOriginalName,
      imageBytes: input.imageBytes,
      imageByteSize: input.imageByteSize,
      driveFileId: input.driveFileId,
      dentistName: this.dentist.displayName,
    })
    return id
  }

  async getDentistPrescriptionImage(dentistId, prescriptionId) {
    const item = this.prescriptions.find(({ id }) => id === prescriptionId)
    if (!item || dentistId !== this.dentist.id) return null
    return { mimeType: item.imageMimeType, originalName: item.imageOriginalName, bytes: item.imageBytes, driveFileId: item.driveFileId }
  }

  async listPatientPrescriptions(patientId) {
    return this.prescriptions.filter((item) => item.patientId === patientId)
  }

  async listPatientFollowUps(patientId) {
    return this.followUps.filter((item) => item.patientId === patientId)
  }

  async getPatientPrescriptionImage(patientId, prescriptionId) {
    const item = this.prescriptions.find(({ id }) => id === prescriptionId)
    if (!item || item.patientId !== patientId) return null
    return { mimeType: item.imageMimeType, originalName: item.imageOriginalName, bytes: item.imageBytes, driveFileId: item.driveFileId }
  }

  async createDentistFollowUp(input) {
    if (!await this.getDentistPatient(input.dentistId, input.patientId)) return { outcome: 'not_found' }
    return this.createReceptionAppointment(input)
  }

  async listReceptionRequests() {
    return this.appointmentRequests
      .filter(({ status }) => status === 'requested')
      .map(({ patientId: _patientId, ...request }) => ({
        ...request,
        patient: {
          id: this.patient.id,
          displayName: this.patient.displayName,
          patientNumber: this.patient.patientNumber,
          phone: '+639000000001',
        },
      }))
  }

  async listReceptionCalendar() {
    return {
      appointments: this.appointments.map((appointment) => ({
        ...appointment,
        patient: {
          id: appointment.patientId,
          displayName: this.patient.displayName,
          patientNumber: this.patient.patientNumber,
          phone: '+639000000001',
        },
      })),
      appointmentRequests: await this.listReceptionRequests(),
    }
  }

  async listActiveDentists() {
    return this.dentists.filter(({ active }) => active).map(({ id, displayName }) => ({ id, displayName }))
  }

  async createReceptionAppointment(input) {
    const patient = input.patientId === this.patient.id ? this.patient : null
    const dentist = this.dentists.find((item) => item.id === input.dentistId && item.active)
    const service = this.services.find((item) => item.id === input.appointmentTypeId)
    const start = new Date(input.startsAt)
    const end = new Date(start.getTime() + 60 * 60_000)
    const local = new Date(start.getTime() + 8 * 60 * 60_000)
    const valid = start > input.now && local.getUTCDay() >= 1 && local.getUTCDay() <= 6 &&
      local.getUTCHours() >= 9 && local.getUTCHours() < 17 &&
      local.getUTCMinutes() === 0 && local.getUTCSeconds() === 0
    const overlaps = this.appointments.some((item) =>
      (item.dentistId === input.dentistId || item.patientId === input.patientId) &&
      ['scheduled', 'confirmed'].includes(item.status) &&
      new Date(item.startsAt) < end && new Date(item.endsAt) > start)
    if (!patient || !dentist || !service || !valid || overlaps) return { outcome: 'slot_unavailable' }
    const appointment = {
      id: `32000000-0000-4000-8000-${String(this.appointments.length + 1).padStart(12, '0')}`,
      patientId: patient.id,
      typeName: service.name,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      status: 'confirmed',
      dentistId: dentist.id,
      dentistName: dentist.displayName,
    }
    this.appointments.push(appointment)
    return { outcome: 'created', id: appointment.id }
  }

  async rescheduleReceptionAppointment({ id, dentistId, startsAt, now }) {
    const appointment = this.appointments.find(
      (item) => item.id === id && ['scheduled', 'confirmed'].includes(item.status),
    )
    if (!appointment) return { outcome: 'not_found' }
    const start = new Date(startsAt)
    const end = new Date(start.getTime() + 60 * 60_000)
    const local = new Date(start.getTime() + 8 * 60 * 60_000)
    const valid = start > now && local.getUTCDay() >= 1 && local.getUTCDay() <= 6 &&
      local.getUTCHours() >= 9 && local.getUTCHours() < 17 &&
      local.getUTCMinutes() === 0 && local.getUTCSeconds() === 0
    const dentist = this.dentists.find((item) => item.id === dentistId && item.active)
    const overlaps = this.appointments.some((item) =>
      item.id !== id && (item.dentistId === dentistId || item.patientId === appointment.patientId) &&
      ['scheduled', 'confirmed'].includes(item.status) &&
      new Date(item.startsAt) < end && new Date(item.endsAt) > start)
    if (!valid || !dentist || overlaps) return { outcome: 'slot_unavailable' }
    appointment.dentistId = dentist.id
    appointment.dentistName = dentist.displayName
    appointment.startsAt = start.toISOString()
    appointment.endsAt = end.toISOString()
    return { outcome: 'updated' }
  }

  async listReceptionBilling(date) {
    return {
      awaitingCheckout: this.appointments
        .filter(({ status, startsAt, dentistDoneAt }) =>
          ['scheduled', 'confirmed'].includes(status) &&
          Boolean(dentistDoneAt) &&
          new Date(new Date(startsAt).getTime() + 8 * 60 * 60_000).toISOString().slice(0, 10) === date)
        .map((appointment) => ({
          ...appointment,
          patient: {
            id: appointment.patientId,
            displayName: this.patient.displayName,
            patientNumber: this.patient.patientNumber,
            phone: '+639000000001',
          },
        })),
      charges: this.charges,
      todayPayments: [],
    }
  }

  async createPatientCheckout(input) {
    const appointment = this.appointments.find(
      ({ id, status, dentistDoneAt }) => id === input.appointmentId &&
        ['scheduled', 'confirmed'].includes(status) && dentistDoneAt,
    )
    if (!appointment) return { outcome: 'not_found' }
    if (input.subtotalCents <= 0) return { outcome: 'invalid_amount' }
    appointment.status = 'completed'
    const charge = {
      id: 'a0000000-0000-4000-8000-000000000001',
      recordNumber: '1',
      appointmentId: appointment.id,
      description: input.description,
      subtotalCents: input.subtotalCents,
      discountCents: 0,
      totalCents: input.subtotalCents,
      status: 'paid',
      invoiceReference: null,
      dentistName: appointment.dentistName,
      handledBy: this.staff.displayName,
      patient: { id: this.patient.id, displayName: this.patient.displayName, patientNumber: this.patient.patientNumber },
      payments: [{
        id: 'b0000000-0000-4000-8000-000000000001',
        amountCents: input.subtotalCents,
        method: input.paymentMethod,
        reference: input.paymentReference,
        status: 'posted',
        receivedAt: input.now,
        recordedBy: this.staff.displayName,
      }],
      paidCents: input.subtotalCents,
      balanceCents: 0,
      createdAt: input.now,
    }
    this.charges.unshift(charge)
    return { outcome: 'created', charge }
  }

  async addPatientPayment(input) {
    const charge = this.charges.find(({ id }) => id === input.chargeId)
    if (!charge) return { outcome: 'not_found' }
    if (input.amountCents > charge.balanceCents) return { outcome: 'amount_exceeds_balance' }
    const payment = {
      id: 'b0000000-0000-4000-8000-000000000002',
      amountCents: input.amountCents,
      method: input.method,
      reference: input.reference,
      status: 'posted',
      receivedAt: input.now,
      recordedBy: this.staff.displayName,
    }
    charge.payments.push(payment)
    charge.paidCents += input.amountCents
    charge.balanceCents -= input.amountCents
    charge.status = charge.balanceCents ? 'partially_paid' : 'paid'
    return { outcome: 'created', paymentId: payment.id, charge }
  }

  async voidPatientPayment(input) {
    const charge = this.charges.find(({ payments }) => payments.some(({ id }) => id === input.paymentId))
    const payment = charge?.payments.find(({ id, status }) => id === input.paymentId && status === 'posted')
    if (!payment) return { outcome: 'not_found' }
    payment.status = 'voided'
    payment.voidReason = input.reason
    charge.paidCents -= payment.amountCents
    charge.balanceCents += payment.amountCents
    charge.status = charge.paidCents ? 'partially_paid' : 'unpaid'
    return { outcome: 'voided', charge }
  }

  async listPatientBilling(patientId) {
    return this.charges
      .filter(({ patient }) => patient.id === patientId)
      .map(({ handledBy: _handledBy, ...charge }) => ({
        ...charge,
        payments: charge.payments
          .filter(({ status }) => status === 'posted')
          .map(({ recordedBy: _recordedBy, ...payment }) => payment),
      }))
  }

  async updateReceptionRequest({ id, action }) {
    const request = this.appointmentRequests.find((item) => item.id === id && item.status === 'requested')
    if (!request) return { outcome: 'not_found' }
    request.status = action === 'confirm' ? 'confirmed' : 'declined'
    if (action === 'confirm') {
      this.appointments.push({
        id: '31000000-0000-4000-8000-000000000001',
        patientId: request.patientId,
        typeName: request.serviceName,
        startsAt: request.requestedStartAt,
        endsAt: request.requestedEndAt,
        status: 'confirmed',
        dentistId: request.dentistId,
        dentistName: request.dentistName,
      })
    }
    return { outcome: 'updated' }
  }

  async searchReceptionPatients(query) {
    return `${this.patient.displayName} ${this.patient.patientNumber}`.toLowerCase().includes(query.toLowerCase())
      ? [{
          id: this.patient.id,
          displayName: this.patient.displayName,
          patientNumber: this.patient.patientNumber,
          phone: this.patient.phone || '+639000000001',
          age: this.patient.age ?? 28,
          gender: this.patient.gender || 'female',
          weightKg: this.patient.weightKg ?? null,
          bloodPressureSystolic: this.patient.bloodPressureSystolic ?? null,
          bloodPressureDiastolic: this.patient.bloodPressureDiastolic ?? null,
        }]
      : []
  }

  async updateReceptionPatient(input) {
    if (input.id !== this.patient.id) return { outcome: 'not_found' }
    Object.assign(this.patient, {
      displayName: input.displayName,
      phone: input.phoneE164,
      age: input.age,
      gender: input.gender,
      weightKg: input.weightKg,
      bloodPressureSystolic: input.bloodPressureSystolic,
      bloodPressureDiastolic: input.bloodPressureDiastolic,
    })
    return { outcome: 'updated', patient: (await this.searchReceptionPatients(''))[0] }
  }

  async createReceptionPatient(input) {
    if (input.normalizedName === normalizeName(this.patient.displayName)) return { outcome: 'already_exists' }
    const patient = {
      id: '10000000-0000-4000-8000-000000000003',
      displayName: input.displayName,
      patientNumber: '00001',
      phone: input.phoneE164,
      age: input.age,
      gender: input.gender,
      enabled: true,
    }
    this.createdPatient = patient
    return { outcome: 'created', patient }
  }

  async listAvailability(date, now) {
    const day = new Date(`${date}T00:00:00Z`).getUTCDay()
    if (day === 0) return []
    return Array.from({ length: 8 }, (_, index) => {
      const startsAt = new Date(`${date}T${String(index + 1).padStart(2, '0')}:00:00.000Z`)
      const endsAt = new Date(startsAt.getTime() + 60 * 60_000)
      const busyAppointment = this.appointments.some((appointment) =>
        appointment.dentistId === this.dentist.id &&
        ['scheduled', 'confirmed'].includes(appointment.status) &&
        new Date(appointment.startsAt) < endsAt &&
        new Date(appointment.endsAt) > startsAt)
      const busyRequest = this.appointmentRequests.some((request) =>
        request.dentistId === this.dentist.id &&
        ['requested', 'confirmed'].includes(request.status) &&
        request.requestedStartAt === startsAt.toISOString())
      return {
        dentistId: this.dentist.id,
        dentistName: this.dentist.displayName,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        available: startsAt > now && !busyAppointment && !busyRequest,
      }
    })
  }

  async createAppointmentRequest(input) {
    const service = this.services.find((item) => item.id === input.appointmentTypeId)
    const slot = (await this.listAvailability(input.startsAt.slice(0, 10), input.now))
      .find((item) =>
        item.dentistId === input.dentistId &&
        item.startsAt === input.startsAt &&
        item.available)
    if (!service || !slot) return null
    const request = {
      patientId: input.patientId,
      id: '70000000-0000-4000-8000-000000000001',
      serviceId: service.id,
      serviceName: service.name,
      dentistId: slot.dentistId,
      dentistName: slot.dentistName,
      requestedStartAt: slot.startsAt,
      requestedEndAt: slot.endsAt,
      preferredDate: new Date(new Date(slot.startsAt).getTime() + 8 * 60 * 60_000).toISOString().slice(0, 10),
      timePreference: new Date(slot.startsAt).getUTCHours() < 4 ? 'morning' : 'afternoon',
      patientNote: input.patientNote,
      status: 'requested',
      clinicNote: null,
      createdAt: input.now,
    }
    this.appointmentRequests.unshift(request)
    const { patientId: _patientId, ...result } = request
    return result
  }

  async listAppointments(patientId, scope, now) {
    const upcoming = scope === 'upcoming'
    return this.appointments
      .filter((appointment) => appointment.patientId === patientId && (upcoming
        ? new Date(appointment.startsAt) >= now && ['scheduled', 'confirmed'].includes(appointment.status)
        : new Date(appointment.startsAt) < now || ['completed', 'cancelled', 'no_show'].includes(appointment.status)))
      .map(({ patientId: _patientId, ...appointment }) => appointment)
  }

  async getAppointment(patientId, appointmentId) {
    const appointment = this.appointments.find(
      (item) => item.patientId === patientId && item.id === appointmentId,
    )
    if (!appointment) return null
    const { patientId: _patientId, ...result } = appointment
    return result
  }

  async listRecords(patientId) {
    return this.records
      .filter((record) => record.patientId === patientId && record.published)
      .map(({ patientId: _patientId, published: _published, ...record }) => record)
  }

  async getRecord(patientId, recordId) {
    const record = this.records.find(
      (item) =>
        item.patientId === patientId &&
        item.id === recordId &&
        item.published,
    )
    if (!record) return null
    const { patientId: _patientId, published: _published, ...result } = record
    return result
  }

  async getTreatmentPlan(patientId) {
    const plan = this.plans.find(
      (item) =>
        item.patientId === patientId &&
        item.published &&
        item.status === 'active',
    )
    if (!plan) return null
    const { patientId: _patientId, published: _published, ...result } = plan
    return result
  }
}

let uuidCounter = 0
const nextUuid = () =>
  `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, '0')}`
const store = new MemoryStore()
let currentTime = new Date('2026-07-23T00:00:00.000Z')
const app = await buildApp({
  config,
  store,
  now: () => new Date(currentTime),
  randomUUIDFn: nextUuid,
  randomBytesFn: () => Buffer.alloc(32, 7),
  staticDir: false,
  logger: false,
})

test('a publisher-disabled preview never starts the injected publisher', async () => {
  const previewConfig = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://unused',
    SESSION_PEPPER: config.sessionPepper,
    PUBLIC_ORIGIN: config.publicOrigin,
    SOCIAL_PUBLISHER_ENABLED: 'false',
  })
  assert.equal(previewConfig.socialPublisherEnabled, false)
  let starts = 0
  const preview = await buildApp({
    config: previewConfig,
    store: new MemoryStore(),
    socialPublisher: { start: () => { starts += 1 }, stop: () => { starts += 1 } },
    staticDir: false,
    logger: false,
  })
  await preview.ready()
  await preview.close()
  assert.equal(starts, 0)
})

before(() => app.ready())
after(() => app.close())

const post = (url, payload) =>
  app.inject({
    method: 'POST',
    url,
    headers: { origin: config.publicOrigin },
    payload,
  })

const loginKnownPatient = () =>
  post('/api/auth/login', {
    fullName: '  PATRICIA   PORTAL DEMO ',
    patientNumber: ' pt-demo01 ',
  })

test('normalization and production configuration security', () => {
  assert.equal(normalizeName('  PATRICIA　PORTAL  DEMO '), 'patricia portal demo')
  assert.equal(normalizePatientNumber(' pt-ab12 '), 'PT-AB12')
  assert.equal(normalizePhone('+63 900 000 0001'), '639000000001')
  assert.equal(normalizePhone('0900-000-0001'), '639000000001')
  assert.equal(normalizePhone('12345'), '')
  assert.throws(
    () =>
      loadConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://db',
        PUBLIC_ORIGIN: 'http://dental.test',
        SESSION_PEPPER: 'replace-this-session-pepper-00000',
      }),
    /Invalid configuration/,
  )
  assert.throws(
    () =>
      loadConfig({
        NODE_ENV: 'prod',
        DATABASE_URL: 'postgres://db',
        PUBLIC_ORIGIN: 'http://dental.test',
        SESSION_PEPPER: 'session-pepper-for-tests-only-000000000',
      }),
    /NODE_ENV must be development, test, or production/,
  )
})

test('state-changing requests require the configured Origin', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { fullName: 'Patricia Portal Demo', patientNumber: 'PT-DEMO01' },
  })
  assert.equal(response.statusCode, 403)
  assert.equal(response.json().error.code, 'INVALID_ORIGIN')
})

test('request schemas reject missing and unexpected login fields', async () => {
  const missing = await post('/api/auth/login', {
    fullName: 'Patricia Portal Demo',
  })
  const unexpected = await post('/api/auth/login', {
    fullName: 'Patricia Portal Demo',
    patientNumber: 'PT-DEMO01',
    patientId: store.otherPatientId,
  })
  const multipleCredentials = await post('/api/auth/login', {
    fullName: 'Patricia Portal Demo',
    patientNumber: 'PT-DEMO01',
    phone: '09000000001',
  })
  assert.equal(missing.statusCode, 400)
  assert.equal(unexpected.statusCode, 400)
  assert.equal(multipleCredentials.statusCode, 400)
})

test('direct login returns a generic failure and exposes no OTP endpoints', async () => {
  const auditCount = store.audits.length
  const unknown = await post('/api/auth/login', {
    fullName: 'Unknown Demo Person',
    patientNumber: 'PT-NOBODY',
  })
  assert.equal(unknown.statusCode, 401)
  assert.deepEqual(unknown.json(), {
    error: {
      code: 'INVALID_CREDENTIALS',
      message: 'The submitted patient details are not recognized.',
    },
  })
  assert.doesNotMatch(unknown.body, /Unknown Demo Person|PT-NOBODY/)
  assert.equal(unknown.headers['cache-control'], 'no-store')
  assert.deepEqual(
    store.audits.slice(auditCount).map(({ actorType, action }) => ({
      actorType,
      action,
    })),
    [{ actorType: 'anonymous', action: 'portal.login_failed' }],
  )

  for (const url of [
    '/api/auth/start',
    '/api/auth/verify',
    '/api/auth/resend',
  ]) {
    assert.equal((await post(url, {})).statusCode, 404)
  }
})

test('direct login creates a hashed opaque session and logout revokes it', async () => {
  const auditCount = store.audits.length
  const loggedIn = await loginKnownPatient()
  assert.equal(loggedIn.statusCode, 200)
  assert.deepEqual(loggedIn.json(), {
    patient: {
      displayName: 'Patricia Portal Demo',
      patientNumber: 'PT-DEMO01',
      phone: '+639000000001',
    },
  })
  const setCookie = loggedIn.headers['set-cookie']
  assert.match(setCookie, /__Host-portal_session=/)
  assert.match(setCookie, /Secure/i)
  assert.match(setCookie, /HttpOnly/i)
  assert.match(setCookie, /SameSite=Lax/i)
  assert.match(setCookie, /Path=\//i)
  const cookie = setCookie.split(';')[0]
  const rawToken = cookie.split('=')[1]
  assert.ok(store.sessions.has(sha256(rawToken)))
  assert.ok(!store.sessions.has(rawToken))
  assert.deepEqual(
    store.audits.slice(auditCount).map(({ actorType, action }) => ({
      actorType,
      action,
    })),
    [{ actorType: 'patient', action: 'portal.login_succeeded' }],
  )

  const me = await app.inject({ url: '/api/me', headers: { cookie } })
  assert.equal(me.statusCode, 200)
  assert.equal(me.headers['cache-control'], 'no-store')
  assert.equal(me.json().patient.phone, '+639000000001')

  const invalidPhone = await app.inject({
    method: 'PATCH',
    url: '/api/me/profile',
    headers: { origin: config.publicOrigin, cookie },
    payload: { phone: '12345' },
  })
  assert.equal(invalidPhone.statusCode, 400)

  const updatedPhone = await app.inject({
    method: 'PATCH',
    url: '/api/me/profile',
    headers: { origin: config.publicOrigin, cookie },
    payload: { phone: '0917 123 4567' },
  })
  assert.equal(updatedPhone.statusCode, 200)
  assert.equal(updatedPhone.json().patient.phone, '+639171234567')
  assert.equal(store.patient.phone, '+639171234567')
  assert.equal(store.audits.at(-1).action, 'portal.phone_updated')

  await app.inject({
    method: 'PATCH',
    url: '/api/me/profile',
    headers: { origin: config.publicOrigin, cookie },
    payload: { phone: '0900 000 0001' },
  })

  const logout = await app.inject({
    method: 'POST',
    url: '/api/auth/logout',
    headers: { origin: config.publicOrigin, cookie },
  })
  assert.equal(logout.statusCode, 204)
  assert.deepEqual(
    (({ actorType, actorId, action }) => ({ actorType, actorId, action }))(store.audits.at(-1)),
    { actorType: 'patient', actorId: store.patient.id, action: 'portal.logout' },
  )
  const afterLogout = await app.inject({ url: '/api/me', headers: { cookie } })
  assert.equal(afterLogout.statusCode, 401)
})

test('patient can log in with the recorded mobile number', async () => {
  const loggedIn = await post('/api/auth/login', {
    fullName: 'Patricia Portal Demo',
    phone: '0900 000 0001',
  })
  assert.equal(loggedIn.statusCode, 200)
  assert.match(loggedIn.headers['set-cookie'], /__Host-portal_session=/)
})

test('disabled portal access cannot create a session', async () => {
  store.patient.enabled = false
  const disabled = await loginKnownPatient()
  store.patient.enabled = true
  assert.equal(disabled.statusCode, 401)
})

test('direct login counts only failed credentials toward the client IP limit', async () => {
  const limitedApp = await buildApp({
    config: { ...config, loginMaxAttempts: 2 },
    store: new MemoryStore(),
    staticDir: false,
    logger: false,
  })
  await limitedApp.ready()
  try {
    const validPayload = {
      fullName: 'Patricia Portal Demo',
      patientNumber: 'PT-DEMO01',
    }
    const payload = {
      fullName: 'Unknown Demo Person',
      patientNumber: 'PT-NOBODY',
    }
    const inject = (loginPayload) =>
      limitedApp.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers: { origin: config.publicOrigin },
        payload: loginPayload,
      })

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const loggedIn = await inject(validPayload)
      assert.equal(loggedIn.statusCode, 200)
      const cookie = loggedIn.headers['set-cookie'].split(';')[0]
      const loggedOut = await limitedApp.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: { origin: config.publicOrigin, cookie },
      })
      assert.equal(loggedOut.statusCode, 204)
    }

    assert.equal((await inject(payload)).statusCode, 401)
    assert.equal((await inject(payload)).statusCode, 401)
    const limited = await inject(payload)
    assert.equal(limited.statusCode, 429, limited.body)
    assert.equal(limited.json().error.code, 'RATE_LIMITED')
  } finally {
    await limitedApp.close()
  }
})

test('reception staff use a separate protected session and can confirm booking requests', async () => {
  const staffStore = new MemoryStore()
  staffStore.appointmentRequests.push({
    patientId: staffStore.patient.id,
    id: '70000000-0000-4000-8000-000000000010',
    serviceId: staffStore.services[0].id,
    serviceName: staffStore.services[0].name,
    dentistId: staffStore.dentist.id,
    dentistName: staffStore.dentist.displayName,
    requestedStartAt: '2030-01-02T01:00:00.000Z',
    requestedEndAt: '2030-01-02T02:00:00.000Z',
    preferredDate: '2030-01-02',
    timePreference: 'morning',
    patientNote: 'Please confirm.',
    status: 'requested',
    clinicNote: null,
    createdAt: currentTime.toISOString(),
  })
  staffStore.appointments.push({
    patientId: staffStore.patient.id,
    id: '30000000-0000-4000-8000-000000000003',
    typeName: 'Future cleaning',
    startsAt: '2030-02-01T02:00:00.000Z',
    endsAt: '2030-02-01T03:00:00.000Z',
    status: 'confirmed',
    dentistId: staffStore.dentist.id,
    dentistName: staffStore.dentist.displayName,
  })
  const staffApp = await buildApp({
    config,
    store: staffStore,
    now: () => new Date('2030-01-01T00:00:00.000Z'),
    staticDir: false,
    logger: false,
    verifyStaffCredentials: async ({ email, password }) =>
      email === staffStore.staff.email && password === 'correct-password'
        ? { authUserId: staffStore.staff.authUserId, email }
        : null,
  })
  await staffApp.ready()
  const staffPost = (url, payload) => staffApp.inject({
    method: 'POST',
    url,
    headers: { origin: config.publicOrigin },
    payload,
  })
  try {
    const invalid = await staffPost('/api/staff/auth/login', {
      fullName: staffStore.staff.displayName,
      password: 'wrong-password',
    })
    assert.equal(invalid.statusCode, 401)
    assert.equal(invalid.json().error.code, 'INVALID_CREDENTIALS')

    const loggedIn = await staffPost('/api/staff/auth/login', {
      fullName: '  RINA   reception ',
      password: 'correct-password',
    })
    assert.equal(loggedIn.statusCode, 200)
    assert.equal(loggedIn.json().staff.role, 'receptionist')
    const setCookie = loggedIn.headers['set-cookie']
    assert.match(setCookie, /__Host-staff_session=/)
    const cookie = setCookie.split(';')[0]
    assert.ok(staffStore.staffSessions.has(sha256(cookie.split('=')[1])))

    const me = await staffApp.inject({ url: '/api/staff/me', headers: { cookie } })
    assert.equal(me.statusCode, 200)
    assert.equal(me.json().staff.displayName, 'Rina Reception')
    assert.equal((await staffApp.inject({ url: '/api/staff/me' })).statusCode, 401)

    const allPatients = await staffApp.inject({
      url: '/api/staff/patients?q=',
      headers: { cookie },
    })
    assert.equal(allPatients.statusCode, 200)
    assert.equal(allPatients.json().patients.length, 1)

    const patients = await staffApp.inject({
      url: '/api/staff/patients?q=Patricia',
      headers: { cookie },
    })
    assert.equal(patients.statusCode, 200)
    assert.equal(patients.json().patients[0].patientNumber, 'PT-DEMO01')

    const updatedPatient = await staffApp.inject({
      method: 'PATCH',
      url: `/api/staff/patients/${staffStore.patient.id}`,
      headers: { origin: config.publicOrigin, cookie },
      payload: {
        displayName: staffStore.patient.displayName,
        phone: '+639111111111',
        age: 29,
        gender: 'female',
        weightKg: 58.5,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
      },
    })
    assert.equal(updatedPatient.statusCode, 200)
    assert.equal(updatedPatient.json().patient.weightKg, 58.5)
    assert.equal(updatedPatient.json().patient.bloodPressureSystolic, 120)
    assert.equal(updatedPatient.json().patient.bloodPressureDiastolic, 80)

    const missingPatients = await staffApp.inject({
      url: '/api/staff/patients?q=New Patient',
      headers: { cookie },
    })
    assert.equal(missingPatients.statusCode, 200)
    assert.deepEqual(missingPatients.json().patients, [])

    const missingPhone = await staffApp.inject({
      method: 'POST',
      url: '/api/staff/patients',
      headers: { origin: config.publicOrigin, cookie },
      payload: { displayName: 'No Phone Patient', age: 34, gender: 'male' },
    })
    assert.equal(missingPhone.statusCode, 400)

    const unsupportedGender = await staffApp.inject({
      method: 'POST',
      url: '/api/staff/patients',
      headers: { origin: config.publicOrigin, cookie },
      payload: {
        displayName: 'Invalid Gender Patient',
        phone: '+639123456789',
        age: 34,
        gender: 'prefer_not_to_say',
      },
    })
    assert.equal(unsupportedGender.statusCode, 400)

    const createdPatient = await staffApp.inject({
      method: 'POST',
      url: '/api/staff/patients',
      headers: { origin: config.publicOrigin, cookie },
      payload: {
        displayName: 'New Patient',
        phone: '+639123456789',
        age: 34,
        gender: 'male',
      },
    })
    assert.equal(createdPatient.statusCode, 201)
    assert.match(createdPatient.json().patient.patientNumber, /^\d{5}$/)
    assert.equal(createdPatient.json().patient.displayName, 'New Patient')
    assert.equal(createdPatient.json().patient.age, 34)

    const billingBeforeDentist = await staffApp.inject({ url: '/api/staff/billing', headers: { cookie } })
    assert.equal(billingBeforeDentist.statusCode, 200)
    assert.equal(billingBeforeDentist.json().awaitingCheckout.length, 0)
    staffStore.appointments[0].dentistDoneAt = currentTime
    staffStore.appointments[0].proposedFeeCents = 250000
    const billing = await staffApp.inject({ url: '/api/staff/billing', headers: { cookie } })
    assert.equal(billing.json().awaitingCheckout.length, 1)
    assert.equal(billing.json().awaitingCheckout[0].proposedFeeCents, 250000)

    const dentists = await staffApp.inject({ url: '/api/staff/dentists', headers: { cookie } })
    assert.equal(dentists.statusCode, 200)
    assert.equal(dentists.json().dentists.length, 2)
    const services = await staffApp.inject({ url: '/api/staff/services', headers: { cookie } })
    assert.equal(services.statusCode, 200)
    assert.equal(services.json().services.length, 2)

    const conflictingReschedule = await staffApp.inject({
      method: 'PATCH',
      url: '/api/staff/appointments/30000000-0000-4000-8000-000000000003/schedule',
      headers: { origin: config.publicOrigin, cookie },
      payload: {
        startsAt: '2030-01-01T02:00:00.000Z',
        dentistId: staffStore.dentist.id,
      },
    })
    assert.equal(conflictingReschedule.statusCode, 409)

    const rescheduled = await staffApp.inject({
      method: 'PATCH',
      url: '/api/staff/appointments/30000000-0000-4000-8000-000000000003/schedule',
      headers: { origin: config.publicOrigin, cookie },
      payload: {
        startsAt: '2030-01-03T02:00:00.000Z',
        dentistId: staffStore.dentists[1].id,
      },
    })
    assert.equal(rescheduled.statusCode, 204)
    assert.equal(staffStore.appointments.at(-1).startsAt, '2030-01-03T02:00:00.000Z')
    assert.equal(staffStore.appointments.at(-1).endsAt, '2030-01-03T03:00:00.000Z')
    assert.equal(staffStore.appointments.at(-1).dentistName, 'Dr. Marco Reyes')

    const receptionAvailability = await staffApp.inject({
      url: '/api/staff/availability?date=2030-01-04',
      headers: { cookie },
    })
    assert.equal(receptionAvailability.statusCode, 200)
    assert.equal(receptionAvailability.json().slots.length, 8)
    assert.equal(receptionAvailability.json().slots.some(({ available }) => available), true)

    const conflictingWalkIn = await staffApp.inject({
      method: 'POST',
      url: '/api/staff/appointments',
      headers: { origin: config.publicOrigin, cookie },
      payload: {
        patientId: staffStore.patient.id,
        dentistId: staffStore.dentist.id,
        appointmentTypeId: staffStore.services[0].id,
        startsAt: '2030-01-01T02:00:00.000Z',
      },
    })
    assert.equal(conflictingWalkIn.statusCode, 409)

    const walkIn = await staffApp.inject({
      method: 'POST',
      url: '/api/staff/appointments',
      headers: { origin: config.publicOrigin, cookie },
      payload: {
        patientId: staffStore.patient.id,
        dentistId: staffStore.dentist.id,
        appointmentTypeId: staffStore.services[0].id,
        startsAt: '2030-01-04T02:00:00.000Z',
      },
    })
    assert.equal(walkIn.statusCode, 201)
    assert.equal(staffStore.appointments.at(-1).status, 'confirmed')
    assert.equal(staffStore.appointments.at(-1).typeName, 'Cleaning')

    const checkoutWithoutConfirmation = await staffApp.inject({
      method: 'POST',
      url: '/api/staff/appointments/30000000-0000-4000-8000-000000000001/checkout',
      headers: { origin: config.publicOrigin, cookie },
      payload: {
        description: 'Brace adjustment',
        subtotalCents: 250000,
        paymentMethod: 'cash',
      },
    })
    assert.equal(checkoutWithoutConfirmation.statusCode, 400)
    assert.equal(staffStore.charges.length, 0)

    const checkoutWithoutCharge = await staffApp.inject({
      method: 'POST',
      url: '/api/staff/appointments/30000000-0000-4000-8000-000000000001/checkout',
      headers: { origin: config.publicOrigin, cookie },
      payload: {
        description: 'Brace adjustment',
        subtotalCents: 0,
        paymentMethod: 'cash',
        paymentConfirmed: true,
      },
    })
    assert.equal(checkoutWithoutCharge.statusCode, 400)
    assert.equal(staffStore.charges.length, 0)

    const checkout = await staffApp.inject({
      method: 'POST',
      url: '/api/staff/appointments/30000000-0000-4000-8000-000000000001/checkout',
      headers: { origin: config.publicOrigin, cookie },
      payload: {
        description: 'Brace adjustment',
        subtotalCents: 250000,
        paymentMethod: 'cash',
        paymentConfirmed: true,
      },
    })
    assert.equal(checkout.statusCode, 201)
    assert.equal(checkout.json().charge.status, 'paid')
    assert.equal(checkout.json().charge.balanceCents, 0)
    assert.equal(checkout.json().charge.payments[0].amountCents, 250000)
    assert.equal(checkout.json().charge.dentistName, 'Dr. Andrea Sample')
    assert.equal(checkout.json().charge.handledBy, 'Rina Reception')
    assert.equal(checkout.json().charge.payments[0].recordedBy, 'Rina Reception')

    const completedCalendar = await staffApp.inject({
      url: '/api/staff/calendar?date=2030-01-01',
      headers: { cookie },
    })
    assert.equal(completedCalendar.statusCode, 200)
    assert.equal(completedCalendar.json().appointments[0].status, 'completed')

    const voidedCheckoutPayment = await staffApp.inject({
      method: 'POST',
      url: `/api/staff/payments/${checkout.json().charge.payments[0].id}/void`,
      headers: { origin: config.publicOrigin, cookie },
      payload: { reason: 'Incorrect payment method' },
    })
    assert.equal(voidedCheckoutPayment.statusCode, 200)
    assert.equal(voidedCheckoutPayment.json().charge.status, 'unpaid')

    const replacementPayment = await staffApp.inject({
      method: 'POST',
      url: `/api/staff/charges/${checkout.json().charge.id}/payments`,
      headers: { origin: config.publicOrigin, cookie },
      payload: { amountCents: 250000, method: 'gcash', reference: 'GC-1001' },
    })
    assert.equal(replacementPayment.statusCode, 201)
    assert.equal(replacementPayment.json().charge.status, 'paid')
    assert.equal(replacementPayment.json().charge.payments[1].recordedBy, 'Rina Reception')

    const voided = await staffApp.inject({
      method: 'POST',
      url: `/api/staff/payments/${replacementPayment.json().charge.payments[1].id}/void`,
      headers: { origin: config.publicOrigin, cookie },
      payload: { reason: 'Incorrect transaction reference' },
    })
    assert.equal(voided.statusCode, 200)
    assert.equal(voided.json().charge.status, 'unpaid')

    const patientLogin = await staffPost('/api/auth/login', {
      fullName: staffStore.patient.displayName,
      patientNumber: staffStore.patient.patientNumber,
    })
    const patientCookie = patientLogin.headers['set-cookie'].split(';')[0]
    const patientBilling = await staffApp.inject({ url: '/api/me/billing', headers: { cookie: patientCookie } })
    assert.equal(patientBilling.statusCode, 200)
    assert.equal(patientBilling.json().charges[0].payments.length, 0)
    assert.equal(patientBilling.json().charges[0].balanceCents, 250000)
    assert.equal('handledBy' in patientBilling.json().charges[0], false)

    const confirmed = await staffApp.inject({
      method: 'PATCH',
      url: '/api/staff/appointment-requests/70000000-0000-4000-8000-000000000010',
      headers: { origin: config.publicOrigin, cookie },
      payload: { action: 'confirm' },
    })
    assert.equal(confirmed.statusCode, 204)
    assert.equal(staffStore.appointmentRequests[0].status, 'confirmed')
    assert.ok(staffStore.appointments.some(({ id }) => id === '31000000-0000-4000-8000-000000000001'))
    const remainingRequests = await staffApp.inject({
      url: '/api/staff/appointment-requests',
      headers: { cookie },
    })
    assert.equal(remainingRequests.statusCode, 200)
    assert.equal(remainingRequests.json().appointmentRequests.length, 0)

    const logout = await staffApp.inject({
      method: 'POST',
      url: '/api/staff/auth/logout',
      headers: { origin: config.publicOrigin, cookie },
    })
    assert.equal(logout.statusCode, 204)
    assert.deepEqual(
      (({ actorType, actorId, action }) => ({ actorType, actorId, action }))(staffStore.audits.at(-1)),
      { actorType: 'staff', actorId: staffStore.staff.id, action: 'staff.logout' },
    )
    assert.equal((await staffApp.inject({ url: '/api/staff/me', headers: { cookie } })).statusCode, 401)
  } finally {
    await staffApp.close()
  }
})

test('dentist staff can restore their staff session but cannot use reception endpoints', async () => {
  const dentistStore = new MemoryStore()
  dentistStore.staff.role = 'dentist'
  dentistStore.staff.dentistId = dentistStore.dentist.id
  dentistStore.staff.displayName = 'Dr. Andrea Sample'
  dentistStore.staff.email = 'dentist@dental.test'
  const driveFiles = new Map()
  const prescriptionStorage = {
    async upload({ bytes }) {
      const id = `drive-file-${driveFiles.size + 1}`
      driveFiles.set(id, bytes)
      return id
    },
    async download(id) { return driveFiles.get(id) },
    async remove(id) { driveFiles.delete(id) },
  }
  const dentistApp = await buildApp({
    config,
    store: dentistStore,
    now: () => new Date('2030-01-01T00:00:00.000Z'),
    staticDir: false,
    logger: false,
    prescriptionStorage,
    verifyStaffCredentials: async ({ email, password }) =>
      email === dentistStore.staff.email && password === 'correct-password'
        ? { authUserId: dentistStore.staff.authUserId, email }
        : null,
  })
  await dentistApp.ready()
  try {
    const loggedIn = await dentistApp.inject({
      method: 'POST',
      url: '/api/staff/auth/login',
      headers: { origin: config.publicOrigin },
      payload: { fullName: 'Andrea Sample', password: 'correct-password' },
    })
    assert.equal(loggedIn.statusCode, 200)
    assert.equal(loggedIn.json().staff.role, 'dentist')
    assert.equal(loggedIn.json().staff.displayName, 'Dr. Andrea Sample')
    const cookie = loggedIn.headers['set-cookie'].split(';')[0]

    const me = await dentistApp.inject({ url: '/api/staff/me', headers: { cookie } })
    assert.equal(me.statusCode, 200)
    assert.equal(me.json().staff.role, 'dentist')
    assert.equal(me.json().staff.dentistId, dentistStore.dentist.id)

    const dashboard = await dentistApp.inject({ url: '/api/dentist/dashboard', headers: { cookie } })
    assert.equal(dashboard.statusCode, 200)
    assert.ok(dashboard.json().appointments.length > 0)

    const patients = await dentistApp.inject({ url: '/api/dentist/patients?q=Patricia', headers: { cookie } })
    assert.equal(patients.statusCode, 200)
    assert.equal(patients.json().patients[0].patientNumber, dentistStore.patient.patientNumber)

    const chart = await dentistApp.inject({ url: `/api/dentist/patients/${dentistStore.patient.id}`, headers: { cookie } })
    assert.equal(chart.statusCode, 200)
    assert.equal(chart.json().patient.allergies, 'Penicillin')
    assert.equal(chart.json().completionAppointment.id, dentistStore.appointments[0].id)

    const invalidImage = await dentistApp.inject({
      method: 'POST',
      url: `/api/dentist/patients/${dentistStore.patient.id}/prescriptions`,
      headers: { origin: config.publicOrigin, cookie },
      payload: {
        prescribedOn: '2030-01-01',
        genericName: 'Amoxicillin',
        instructions: 'Take as directed.',
        imageMimeType: 'image/png',
        imageOriginalName: 'prescription.png',
        imageBase64: Buffer.from('not-an-image').toString('base64'),
      },
    })
    assert.equal(invalidImage.statusCode, 400)

    const imageBytes = Buffer.from('89504e470d0a1a0a', 'hex')
    const uploaded = await dentistApp.inject({
      method: 'POST',
      url: `/api/dentist/patients/${dentistStore.patient.id}/prescriptions`,
      headers: { origin: config.publicOrigin, cookie },
      payload: {
        prescribedOn: '2030-01-01',
        genericName: 'Amoxicillin',
        instructions: 'Take as directed.',
        imageMimeType: 'image/png',
        imageOriginalName: '../../prescription.png',
        imageBase64: imageBytes.toString('base64'),
      },
    })
    assert.equal(uploaded.statusCode, 201, uploaded.body)
    assert.equal(dentistStore.prescriptions[0].imageOriginalName, 'prescription.png')
    assert.equal(dentistStore.prescriptions[0].imageBytes, null)
    assert.equal(dentistStore.prescriptions[0].driveFileId, 'drive-file-1')

    const prescriptionImage = await dentistApp.inject({
      url: `/api/dentist/prescriptions/${uploaded.json().prescriptionId}/image`,
      headers: { cookie },
    })
    assert.equal(prescriptionImage.statusCode, 200)
    assert.equal(prescriptionImage.headers['content-type'], 'image/png')
    assert.deepEqual(prescriptionImage.rawPayload, imageBytes)

    const oversizedImage = Buffer.alloc(2 * 1024 * 1024 + 1)
    Buffer.from('89504e470d0a1a0a', 'hex').copy(oversizedImage)
    const rejectedOversizedImage = await dentistApp.inject({
      method: 'POST',
      url: `/api/dentist/patients/${dentistStore.patient.id}/prescriptions`,
      headers: { origin: config.publicOrigin, cookie },
      payload: {
        prescribedOn: '2030-01-01',
        genericName: 'Written prescription',
        instructions: 'See attached image.',
        imageMimeType: 'image/png',
        imageOriginalName: 'too-large.png',
        imageBase64: oversizedImage.toString('base64'),
      },
    })
    assert.equal(rejectedOversizedImage.statusCode, 400)

    const dentistAvailability = await dentistApp.inject({
      url: '/api/dentist/availability?date=2030-01-02',
      headers: { cookie },
    })
    assert.equal(dentistAvailability.statusCode, 200)
    assert.equal(dentistAvailability.json().slots.length, 8)
    assert.equal(dentistAvailability.json().slots.every(({ dentistId }) => dentistId === dentistStore.dentist.id), true)

    const followUp = await dentistApp.inject({
      method: 'POST',
      url: `/api/dentist/patients/${dentistStore.patient.id}/follow-ups`,
      headers: { origin: config.publicOrigin, cookie },
      payload: {
        startsAt: '2030-01-02T01:00:00.000Z',
        appointmentTypeId: dentistStore.services[0].id,
        notes: 'Return for cleaning.',
      },
    })
    assert.equal(followUp.statusCode, 201)
    const scheduledFollowUp = dentistStore.appointments.find(({ id }) => id === followUp.json().appointmentId)
    assert.equal(scheduledFollowUp.status, 'confirmed')
    assert.equal(scheduledFollowUp.startsAt, '2030-01-02T01:00:00.000Z')

    const patientLogin = await dentistApp.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: config.publicOrigin },
      payload: { fullName: dentistStore.patient.displayName, patientNumber: dentistStore.patient.patientNumber },
    })
    const patientCookie = patientLogin.headers['set-cookie'].split(';')[0]
    const patientHistory = await dentistApp.inject({ url: '/api/me/records', headers: { cookie: patientCookie } })
    assert.equal(patientHistory.statusCode, 200)
    assert.equal(patientHistory.json().prescriptions[0].id, uploaded.json().prescriptionId)
    const patientUpcoming = await dentistApp.inject({ url: '/api/me/appointments?scope=upcoming', headers: { cookie: patientCookie } })
    assert.equal(patientUpcoming.json().appointments.some(({ id }) => id === followUp.json().appointmentId), true)
    const patientPrescriptionImage = await dentistApp.inject({
      url: `/api/me/prescriptions/${uploaded.json().prescriptionId}/image`,
      headers: { cookie: patientCookie },
    })
    assert.equal(patientPrescriptionImage.statusCode, 200)
    assert.deepEqual(patientPrescriptionImage.rawPayload, imageBytes)

    const completed = await dentistApp.inject({
      method: 'POST',
      url: `/api/dentist/patients/${dentistStore.patient.id}/appointments/${dentistStore.appointments[0].id}/complete`,
      headers: { origin: config.publicOrigin, cookie },
      payload: {
        proposedFeeCents: 175000,
        prescription: null,
        followUp: {
          startsAt: '2030-01-02T03:00:00.000Z',
          appointmentTypeId: dentistStore.services[1].id,
          notes: 'Confirmed during visit completion.',
        },
      },
    })
    assert.equal(completed.statusCode, 200, completed.body)
    assert.equal(dentistStore.appointments[0].proposedFeeCents, 175000)
    assert.ok(dentistStore.appointments[0].dentistDoneAt)
    assert.equal(dentistStore.appointments.some(({ startsAt, status }) => startsAt === '2030-01-02T03:00:00.000Z' && status === 'confirmed'), true)

    const finishedPatients = await dentistApp.inject({ url: '/api/dentist/patients?q=', headers: { cookie } })
    assert.equal(finishedPatients.statusCode, 200)
    assert.equal(finishedPatients.json().patients.length, 0)
    const finishedDashboard = await dentistApp.inject({ url: '/api/dentist/dashboard', headers: { cookie } })
    assert.equal(finishedDashboard.json().appointments.length, 0)

    dentistStore.appointments.push({
      patientId: dentistStore.patient.id,
      id: '30000000-0000-4000-8000-000000000003',
      typeName: 'Future cleaning',
      startsAt: '2030-01-02T02:00:00.000Z',
      endsAt: '2030-01-02T03:00:00.000Z',
      status: 'confirmed',
      dentistId: dentistStore.dentist.id,
      dentistName: dentistStore.dentist.displayName,
    })
    const futureDashboard = await dentistApp.inject({ url: '/api/dentist/dashboard', headers: { cookie } })
    assert.equal(futureDashboard.json().upcomingAppointments.some(({ typeName }) => typeName === 'Future cleaning'), true)

    const repeated = await dentistApp.inject({
      method: 'POST',
      url: `/api/dentist/patients/${dentistStore.patient.id}/appointments/${dentistStore.appointments[0].id}/complete`,
      headers: { origin: config.publicOrigin, cookie },
      payload: { proposedFeeCents: 175000, prescription: null, followUp: null },
    })
    assert.equal(repeated.statusCode, 409)

    const receptionDashboard = await dentistApp.inject({ url: '/api/staff/dashboard', headers: { cookie } })
    assert.equal(receptionDashboard.statusCode, 403)
  } finally {
    await dentistApp.close()
  }
})

test('super admins alone can view aggregate analytics and provision staff without exposing internal email', async () => {
  const adminStore = new MemoryStore()
  adminStore.staff.role = 'super_admin'
  adminStore.staff.displayName = 'Clinic Owner'
  Object.assign(adminStore.staff, await hashStaffPassword('correct-password', () => Buffer.alloc(16, 4)))
  const adminApp = await buildApp({
    config,
    store: adminStore,
    now: () => new Date('2030-01-15T04:00:00.000Z'),
    randomBytesFn: () => Buffer.alloc(32, 9),
    randomUUIDFn: nextUuid,
    staticDir: false,
    logger: false,
    verifyStaffCredentials: async () => { throw new Error('Local staff password should not use Supabase Auth') },
  })
  await adminApp.ready()
  try {
    const login = await adminApp.inject({
      method: 'POST', url: '/api/staff/auth/login',
      headers: { origin: config.publicOrigin },
      payload: { fullName: 'clinic owner', password: 'correct-password' },
    })
    assert.equal(login.statusCode, 200)
    assert.equal(login.json().staff.role, 'super_admin')
    assert.equal('email' in login.json().staff, false)
    const cookie = login.headers['set-cookie'].split(';')[0]

    const overview = await adminApp.inject({
      url: '/api/admin/overview?from=2030-01-01&to=2030-01-15&compare=previous_period',
      headers: { cookie },
    })
    assert.equal(overview.statusCode, 200)
    assert.equal(overview.json().metrics.cashCollectedCents, 100000)
    assert.equal(overview.json().comparisonAvailable, true)
    assert.doesNotMatch(overview.body, /patientName|phone|prescription|medical/i)

    const weakPassword = await adminApp.inject({
      method: 'POST', url: '/api/admin/team/receptionists',
      headers: { origin: config.publicOrigin, cookie },
      payload: { displayName: 'New Reception', password: 'too-short' },
    })
    assert.equal(weakPassword.statusCode, 400)

    const nonNumericPassword = await adminApp.inject({
      method: 'POST', url: '/api/admin/team/receptionists',
      headers: { origin: config.publicOrigin, cookie },
      payload: { displayName: 'New Reception', password: 'abcd1234' },
    })
    assert.equal(nonNumericPassword.statusCode, 400)

    const created = await adminApp.inject({
      method: 'POST', url: '/api/admin/team/receptionists',
      headers: { origin: config.publicOrigin, cookie },
      payload: { displayName: 'New Reception', password: '12345678' },
    })
    assert.equal(created.statusCode, 201)
    assert.equal(created.json().staff.role, 'receptionist')
    assert.equal('email' in created.json().staff, false)

    const dentist = await adminApp.inject({
      method: 'POST', url: '/api/admin/team/dentists',
      headers: { origin: config.publicOrigin, cookie },
      payload: { displayName: 'New Dentist', specialty: 'General dentistry', password: '12345678' },
    })
    assert.equal(dentist.statusCode, 201)
    assert.equal(dentist.json().staff.displayName, 'Dr. New Dentist')

    const audit = await adminApp.inject({ url: '/api/admin/audit', headers: { cookie } })
    assert.equal(audit.statusCode, 200)
    assert.deepEqual(audit.json().events[0], {
      id: '0', actorName: 'Clinic Owner', category: 'superadmin',
      activity: 'login', occurredAt: '2030-01-15T04:00:00.000Z',
    })

    adminStore.staff.role = 'receptionist'
    const forbidden = await adminApp.inject({ url: '/api/admin/overview', headers: { cookie } })
    assert.equal(forbidden.statusCode, 403)
  } finally {
    await adminApp.close()
  }
})

test('patient endpoints require authentication and enforce patient ownership and publication', async () => {
  const unauthenticated = await app.inject({ url: '/api/me/appointments' })
  assert.equal(unauthenticated.statusCode, 401)

  const loggedIn = await loginKnownPatient()
  const cookie = loggedIn.headers['set-cookie'].split(';')[0]

  const services = await app.inject({
    url: '/api/me/services',
    headers: { cookie },
  })
  assert.equal(services.statusCode, 200)
  assert.deepEqual(services.json().services.map(({ name }) => name), ['Cleaning', 'Brace Adjustment'])

  const availability = await app.inject({
    url: '/api/me/availability?date=2030-01-01',
    headers: { cookie },
  })
  assert.equal(availability.statusCode, 200)
  assert.equal(availability.json().slotMinutes, 60)
  assert.equal(availability.json().timezone, 'Asia/Manila')
  assert.equal(availability.json().slots.length, 8)
  assert.equal(
    availability.json().slots.find(({ startsAt }) => startsAt === '2030-01-01T02:00:00.000Z').available,
    false,
  )

  const createdRequest = await app.inject({
    method: 'POST',
    url: '/api/me/appointment-requests',
    headers: { origin: config.publicOrigin, cookie },
    payload: {
      appointmentTypeId: '60000000-0000-4000-8000-000000000001',
      dentistId: '20000000-0000-4000-8000-000000000001',
      startsAt: '2030-01-01T01:00:00.000Z',
      patientNote: 'Sensitive tooth on the left side.',
    },
  })
  assert.equal(createdRequest.statusCode, 201)
  assert.deepEqual(createdRequest.json().appointmentRequest, {
    id: '70000000-0000-4000-8000-000000000001',
    serviceId: '60000000-0000-4000-8000-000000000001',
    serviceName: 'Cleaning',
    dentistId: '20000000-0000-4000-8000-000000000001',
    dentistName: 'Dr. Andrea Sample',
    requestedStartAt: '2030-01-01T01:00:00.000Z',
    requestedEndAt: '2030-01-01T02:00:00.000Z',
    preferredDate: '2030-01-01',
    timePreference: 'morning',
    patientNote: 'Sensitive tooth on the left side.',
    status: 'requested',
    clinicNote: null,
    createdAt: currentTime.toISOString(),
  })

  const duplicateRequest = await app.inject({
    method: 'POST',
    url: '/api/me/appointment-requests',
    headers: { origin: config.publicOrigin, cookie },
    payload: {
      appointmentTypeId: '60000000-0000-4000-8000-000000000002',
      dentistId: '20000000-0000-4000-8000-000000000001',
      startsAt: '2030-01-01T01:00:00.000Z',
    },
  })
  assert.equal(duplicateRequest.statusCode, 409)
  assert.equal(duplicateRequest.json().error.code, 'SLOT_UNAVAILABLE')

  store.appointmentRequests[0].status = 'confirmed'
  store.followUps.push({
    id: '94000000-0000-4000-8000-000000000001',
    patientId: store.patient.id,
    dentistName: store.dentist.displayName,
    serviceName: 'Cleaning',
    recommendedOn: '2030-02-01',
    notes: 'Return for follow-up care.',
    status: 'pending',
  })

  const requestList = await app.inject({
    url: '/api/me/appointment-requests',
    headers: { cookie },
  })
  assert.equal(requestList.statusCode, 200)
  assert.equal(requestList.json().appointmentRequests.length, 0)

  const appointments = await app.inject({
    url: '/api/me/appointments?scope=upcoming',
    headers: { cookie },
  })
  assert.deepEqual(
    appointments.json().appointments.map(({ id }) => id),
    ['30000000-0000-4000-8000-000000000001'],
  )
  assert.deepEqual(appointments.json().followUps.map(({ id }) => id), ['94000000-0000-4000-8000-000000000001'])
  assert.equal(appointments.headers['cache-control'], 'no-store')

  const pastAppointments = await app.inject({
    url: '/api/me/appointments?scope=past',
    headers: { cookie },
  })
  assert.deepEqual(
    pastAppointments.json().appointments.map(({ id }) => id),
    ['30000000-0000-4000-8000-000000000002'],
  )

  const otherAppointment = await app.inject({
    url: '/api/me/appointments/30000000-0000-4000-8000-000000000099',
    headers: { cookie },
  })
  assert.equal(otherAppointment.statusCode, 404)

  const records = await app.inject({
    url: '/api/me/records',
    headers: { cookie },
  })
  assert.deepEqual(
    records.json().records.map(({ id }) => id),
    ['50000000-0000-4000-8000-000000000001'],
  )
  assert.equal(records.json().records[0].appointmentId, '30000000-0000-4000-8000-000000000001')
  assert.equal(records.headers['cache-control'], 'no-store')

  const billing = await app.inject({ url: '/api/me/billing', headers: { cookie } })
  assert.equal(billing.statusCode, 200)
  assert.deepEqual(billing.json().charges, [])

  for (const id of [
    '50000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000099',
  ]) {
    const hidden = await app.inject({
      url: `/api/me/records/${id}`,
      headers: { cookie },
    })
    assert.equal(hidden.statusCode, 404)
  }

  const plan = await app.inject({
    url: '/api/me/treatment-plan',
    headers: { cookie },
  })
  assert.equal(plan.json().treatmentPlan.id, '40000000-0000-4000-8000-000000000001')
  assert.equal(plan.headers['cache-control'], 'no-store')

  const patientSelector = await app.inject({
    url: `/api/me/appointments?scope=upcoming&patientId=${store.otherPatientId}`,
    headers: { cookie },
  })
  assert.equal(patientSelector.statusCode, 400)
})

test('idle and absolute session timeouts and health readiness fail closed', async () => {
  const loggedIn = await loginKnownPatient()
  const cookie = loggedIn.headers['set-cookie'].split(';')[0]
  currentTime = new Date(currentTime.getTime() + 31 * 60_000)
  const expired = await app.inject({ url: '/api/me', headers: { cookie } })
  assert.equal(expired.statusCode, 401)

  const absoluteLogin = await loginKnownPatient()
  const absoluteCookie = absoluteLogin.headers['set-cookie'].split(';')[0]
  const absoluteToken = absoluteCookie.split('=')[1]
  currentTime = new Date(currentTime.getTime() + 9 * 60 * 60_000)
  store.sessions.get(sha256(absoluteToken)).lastSeenAt = new Date(currentTime)
  const absoluteExpired = await app.inject({
    url: '/api/me',
    headers: { cookie: absoluteCookie },
  })
  assert.equal(absoluteExpired.statusCode, 401)

  assert.equal((await app.inject({ url: '/api/health' })).statusCode, 200)
  store.healthy = false
  const unavailable = await app.inject({ url: '/api/health' })
  assert.equal(unavailable.statusCode, 503)
  store.healthy = true
})

test('SPA deep links return the React application while unknown API routes stay JSON 404s', async () => {
  const staticApp = await buildApp({
    config,
    store: new MemoryStore(),
    staticDir: fileURLToPath(new URL('./fixtures/static/', import.meta.url)),
    logger: false,
  })
  await staticApp.ready()
  try {
    const deepLink = await staticApp.inject({ url: '/portal/records' })
    assert.equal(deepLink.statusCode, 200)
    assert.match(deepLink.headers['content-type'], /text\/html/)
    assert.match(deepLink.body, /id="root"/)

    const receptionLink = await staticApp.inject({ url: '/reception/calendar' })
    assert.equal(receptionLink.statusCode, 200)
    assert.match(receptionLink.body, /id="root"/)

    const dentistLink = await staticApp.inject({ url: '/dentist' })
    assert.equal(dentistLink.statusCode, 200)
    assert.match(dentistLink.body, /id="root"/)

    const adminLink = await staticApp.inject({ url: '/admin/comparisons' })
    assert.equal(adminLink.statusCode, 200)
    assert.match(adminLink.body, /id="root"/)

    const missingApi = await staticApp.inject({ url: '/api/does-not-exist' })
    assert.equal(missingApi.statusCode, 404)
    assert.equal(missingApi.json().error.code, 'NOT_FOUND')
  } finally {
    await staticApp.close()
  }
})
