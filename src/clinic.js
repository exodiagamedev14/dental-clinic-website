// The URL selects the workspace; the server still checks every login and session.
export const clinicBase = window.location.pathname.match(/^\/c\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/i)?.[0] || ''
export const clinicUrl = (path) => `${clinicBase}${path}`
