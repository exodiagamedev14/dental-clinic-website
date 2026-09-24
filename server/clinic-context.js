import { AsyncLocalStorage } from 'node:async_hooks'

export const LEGACY_CLINIC_ID = '00000000-0000-4000-8000-000000000001'
export const clinicContext = new AsyncLocalStorage()
export const currentClinicId = () => clinicContext.getStore() || LEGACY_CLINIC_ID
export const withClinic = (id, work) => clinicContext.run(id, work)

export function rewriteClinicUrl(request) {
  const match = request.url.match(/^\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?=\/|\?|$)/i)
  request.clinicId = match ? match[1].toLowerCase() : LEGACY_CLINIC_ID
  return match ? request.url.slice(match[0].length).replace(/^(?=\?|$)/, '/') : request.url
}
