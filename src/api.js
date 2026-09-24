import { clinicUrl } from './clinic'

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'REQUEST_FAILED', offline = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.offline = offline
  }
}

async function request(path, { notifyUnauthorized = true, ...options } = {}) {
  let response

  try {
    response = await fetch(clinicUrl(path), {
      ...options,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError('Unable to reach the clinic portal.', {
      code: 'NETWORK_ERROR',
      offline: !navigator.onLine,
    })
  }

  const contentType = response.headers.get('content-type') || ''
  const payload = response.status === 204
    ? null
    : contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : null

  if (!response.ok) {
    if (response.status === 401 && notifyUnauthorized) {
      window.dispatchEvent(new Event('portal:unauthorized'))
    }

    throw new ApiError(payload?.message || payload?.error?.message || 'The request could not be completed.', {
      status: response.status,
      code: payload?.code || payload?.error?.code || 'REQUEST_FAILED',
    })
  }

  return payload
}

const json = (body) => JSON.stringify(body)

export const api = {
  getClinic: () => request('/api/clinic'),
  login: (details) => request('/api/auth/login', {
    method: 'POST',
    body: json(details),
    notifyUnauthorized: false,
  }),
  logout: () => request('/api/auth/logout', {
    method: 'POST',
    notifyUnauthorized: false,
  }),
  getMe: ({ notifyUnauthorized = true } = {}) => request('/api/me', { notifyUnauthorized }),
  updateMyPhone: (phone) => request('/api/me/profile', {
    method: 'PATCH',
    body: json({ phone }),
  }),
  getDashboard: () => request('/api/me/dashboard'),
  getServices: () => request('/api/me/services'),
  getAvailability: (date) => request(`/api/me/availability?date=${encodeURIComponent(date)}`),
  getAppointmentRequests: () => request('/api/me/appointment-requests'),
  createAppointmentRequest: (details) => request('/api/me/appointment-requests', {
    method: 'POST',
    body: json(details),
  }),
  getAppointments: (scope) => request(`/api/me/appointments?scope=${encodeURIComponent(scope)}`),
  getRecords: () => request('/api/me/records'),
  getBilling: () => request('/api/me/billing'),
  getTreatmentPlan: () => request('/api/me/treatment-plan'),
  staffLogin: (details) => request('/api/staff/auth/login', {
    method: 'POST',
    body: json(details),
    notifyUnauthorized: false,
  }),
  staffLogout: () => request('/api/staff/auth/logout', {
    method: 'POST',
    notifyUnauthorized: false,
  }),
  getStaffMe: ({ notifyUnauthorized = true } = {}) =>
    request('/api/staff/me', { notifyUnauthorized }),
  getReceptionDashboard: () => request('/api/staff/dashboard'),
  getReceptionRequests: () => request('/api/staff/appointment-requests'),
  updateReceptionRequest: (id, details) => request(`/api/staff/appointment-requests/${id}`, {
    method: 'PATCH',
    body: json(details),
  }),
  getReceptionCalendar: (date) =>
    request(`/api/staff/calendar?date=${encodeURIComponent(date)}`),
  getReceptionAvailability: (date) =>
    request(`/api/staff/availability?date=${encodeURIComponent(date)}`),
  getReceptionDentists: () => request('/api/staff/dentists'),
  getReceptionServices: () => request('/api/staff/services'),
  createReceptionAppointment: (details) => request('/api/staff/appointments', {
    method: 'POST',
    body: json(details),
  }),
  rescheduleReceptionAppointment: (id, details) => request(`/api/staff/appointments/${id}/schedule`, {
    method: 'PATCH',
    body: json(details),
  }),
  getReceptionBilling: () => request('/api/staff/billing'),
  checkoutAppointment: (id, details) => request(`/api/staff/appointments/${id}/checkout`, {
    method: 'POST',
    body: json(details),
  }),
  addPatientPayment: (id, details) => request(`/api/staff/charges/${id}/payments`, {
    method: 'POST',
    body: json(details),
  }),
  voidPatientPayment: (id, reason) => request(`/api/staff/payments/${id}/void`, {
    method: 'POST',
    body: json({ reason }),
  }),
  searchReceptionPatients: (query) =>
    request(`/api/staff/patients?q=${encodeURIComponent(query)}`),
  createReceptionPatient: (details) => request('/api/staff/patients', {
    method: 'POST',
    body: json(details),
  }),
  updateReceptionPatient: (id, details) => request(`/api/staff/patients/${id}`, {
    method: 'PATCH',
    body: json(details),
  }),
  getDentistDashboard: () => request('/api/dentist/dashboard'),
  getDentistAvailability: (date) => request(`/api/dentist/availability?date=${encodeURIComponent(date)}`),
  searchDentistPatients: (query) =>
    request(`/api/dentist/patients?q=${encodeURIComponent(query)}`),
  getDentistPatient: (id) => request(`/api/dentist/patients/${id}`),
  completeDentistVisit: (patientId, appointmentId, details) =>
    request(`/api/dentist/patients/${patientId}/appointments/${appointmentId}/complete`, {
      method: 'POST',
      body: json(details),
    }),
  uploadDentistPrescription: (patientId, details) =>
    request(`/api/dentist/patients/${patientId}/prescriptions`, {
      method: 'POST',
      body: json(details),
    }),
  createDentistFollowUp: (patientId, details) =>
    request(`/api/dentist/patients/${patientId}/follow-ups`, {
      method: 'POST',
      body: json(details),
    }),
  getDentistSocialPosts: () => request('/api/dentist/social/posts'),
  searchDentistSocialPatients: (query) => request(`/api/dentist/social/patients?q=${encodeURIComponent(query)}`),
  createDentistSocialPost: (details) => request('/api/dentist/social/posts', {
    method: 'POST',
    body: json(details),
  }),
  getAdminAnalytics: (section, query = '') => request(`/api/admin/${section}${query ? `?${query}` : ''}`),
  getAdminTeam: () => request('/api/admin/team'),
  createAdminDentist: (details) => request('/api/admin/team/dentists', { method: 'POST', body: json(details) }),
  createAdminReceptionist: (details) => request('/api/admin/team/receptionists', { method: 'POST', body: json(details) }),
  setAdminStaffActive: (id, active) => request(`/api/admin/team/${id}/${active ? 'reactivate' : 'deactivate'}`, { method: 'POST' }),
  resetAdminStaffPassword: (id, password) => request(`/api/admin/team/${id}/reset-password`, { method: 'POST', body: json({ password }) }),
  revokeAdminStaffSessions: (id) => request(`/api/admin/team/${id}/revoke-sessions`, { method: 'POST' }),
  getAdminAudit: () => request('/api/admin/audit'),
  getAdminSocialSettings: () => request('/api/admin/social/settings'),
  updateAdminSocialSettings: (details) => request('/api/admin/social/settings', { method: 'PUT', body: json(details) }),
  addAdminSocialTemplate: (details) => request('/api/admin/social/templates', { method: 'POST', body: json(details) }),
  removeAdminSocialTemplate: (id) => request(`/api/admin/social/templates/${id}`, { method: 'DELETE' }),
  connectAdminFacebookPage: (details) => request('/api/admin/social/facebook/connect', { method: 'POST', body: json(details) }),
  disconnectAdminFacebookPage: () => request('/api/admin/social/facebook/connection', { method: 'DELETE' }),
  getAdminSocialPosts: () => request('/api/admin/social/posts'),
  removeAdminSocialPost: (id) => request(`/api/admin/social/posts/${id}/remove`, { method: 'POST' }),
  retryAdminSocialPost: (id) => request(`/api/admin/social/posts/${id}/retry`, { method: 'POST' }),
}
