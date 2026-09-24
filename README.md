# SmileCare Dental Portal

A patient portal built with React, Vite, Tailwind CSS, Fastify, and
Supabase-hosted PostgreSQL. Patients sign in with their full name plus either
the clinic-issued patient ID or the mobile number recorded by the clinic. They can browse the clinic service
catalog and choose an open doctor time from the hourly appointment calendar. There
is no patient registration, password, SMS, or one-time-code step.

Clinic reception staff use the same login page with a separate **Clinic staff**
tab. Supabase Auth verifies clinic-provisioned staff accounts, while the backend
keeps staff sessions and permissions separate from patient access. Reception can
also complete appointment checkout, record cash or external electronic payments,
track balances, and reference the clinic's BIR-authorized invoice.

> Direct login is intentionally simple. Mobile numbers are weaker credentials,
> so failed-login limits must remain strict. In production, patient IDs must be
> long, random, non-sequential, kept private, and replaced if disclosed. A
> predictable chart number is not suitable as a portal credential.

## Local development

Requirements:

- Node.js 22
- PostgreSQL

Create the local role and database, then copy the example environment:

```bash
createuser --createdb --createrole --pwprompt dental_portal
createdb --owner=dental_portal dental_portal
cp .env.example .env
openssl rand -hex 32
```

Put the local database password in `DATABASE_URL` and the generated value in
`SESSION_PEPPER`. Then install, migrate, seed fictional data, and start:

```bash
npm ci
npm run migrate
npm run seed:demo
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) and use:

```text
Full name: Patricia Portal Demo
Patient ID: PT-DEMO01
```

The demo ID is deliberately obvious and must never be copied into production.
Never place real patient data, credentials, database dumps, or screenshots in
Git or application logs.

## Create a reception account

Reception accounts are invite-only. In the Supabase Dashboard, open
**Authentication → Users**, create a confirmed email/password user, and copy its
UUID. Then run this once in the Supabase SQL Editor with the real values:

```sql
insert into dental_portal.staff_profiles
  (auth_user_id, email, display_name, role, active)
values
  ('<auth-user-uuid>', '<work-email>', '<staff-name>', 'receptionist', true);
```

Do not share reception accounts. Disable `active` when an employee leaves.

From the reception portal, search the patient’s name first. If no match exists,
choose **Create patient account**, enter the full name, age, gender, and optional phone number,
and give the patient the next five-digit portal ID, such as `00001`. Because the
ID is also the patient login credential, keep it private and rely on the portal
rate limits and audit trail to reduce guessing attempts.

## Reception billing

Confirmed appointments appear under **Billing & payments**. Reception records the
final service charge, payment method, and optional external transaction reference.
Reception must confirm that the full charge was received before checkout is enabled.
Completing checkout records the full charge as paid and marks the appointment completed.
Historical unpaid records remain open for full-balance payment; posted payments can be
voided with a required reason and are never deleted.

The portal stores amounts as integer centavos and never stores card numbers, CVVs,
PINs, or wallet credentials. Cash, QR Ph, card-terminal, and bank payments are
collected outside the portal and then recorded by reception. `PAY-######` is an
internal payment-record number, not an official tax invoice. Continue issuing the
clinic's BIR-authorized invoice unless the software is separately registered for
invoice generation.

## Authentication and privacy

`POST /api/auth/login` accepts `fullName` with exactly one of `patientNumber` or
`phone`. Philippine mobile formats are normalized before matching. The server
strictly limits failed credentials and returns the same generic error for an
unknown, disabled, or mismatched account. Successful sign-ins and logout do not
consume the failed-attempt budget.

Successful login creates a cryptographically random opaque session token. Only
its SHA-256 digest is stored in PostgreSQL. The browser receives the token in a
`Secure`, `HttpOnly`, `SameSite=Lax`, host-only cookie. Sessions have idle and
absolute expiry, can be revoked on logout, and are checked again on every
protected request.

Fastify is the only browser-facing API. It enforces the configured origin,
patient ownership, published-record rules, response `no-store` headers, request
body redaction, and audit events for login and protected record access.
Supabase's browser SDK and Data API are not used. The backend calls Supabase Auth
only to verify staff email/password credentials.

Appointment requests are intentionally not automatic confirmations. The
calendar uses active dentists and hides conflicts with scheduled, confirmed,
or already-requested visits. The initial clinic schedule is Monday–Saturday,
9:00 AM–5:00 PM Manila time, in one-hour slots. Reception can change the dentist,
date, and time from an active appointment's calendar details; occupied or invalid
slots are rejected. Clicking an eligible day opens the schedule form, which searches
registered patients and creates a confirmed appointment without a booking request.

## Verification

Clinic onboarding from Dently creates a separate workspace and its first
`super_admin`. The assigned salesperson opens a paid clinic in Dently's team
portal and uses **Create clinic super admin**. Staff and patients use that
clinic's `/c/<clinic-id>/login` link. The original root login keeps all existing
clinic data and accounts together.

Apply `migrations/027_clinic_isolation.sql` with the trusted migration command
and deploy this dental app together, followed by Dently migration
`015_dental_clinic_accounts.sql` and its application update. Both applications
must use the same PostgreSQL database with their existing separate runtime roles.
The migration makes old dental servers fail closed, so use a maintenance window
for the migration and restart. Take a database backup first. Do not roll back to
an older dental server after this migration.

Every clinical table uses restrictive clinic row policies and composite foreign
keys. Database access sets the clinic only for the current transaction, including
background social publishing. New tables must retain these protections. Dently
can execute a session-checked provisioning function but cannot read dental
records or retrieve passwords. Pausing/removing a Dently clinic also revokes its
dental sessions; restoring access requires a fresh login.

Tests require local PostgreSQL binaries (`initdb`, `pg_ctl`, `psql`); set `PG_BIN`
if needed. The clinic isolation test starts a disposable local database and never
uses production credentials.

Run before every deployment:

```bash
npm run verify
```

The deployed container must also pass:

```bash
curl --fail http://127.0.0.1:3000/api/health
```

## Automatic Facebook publishing

Dentists can open **Facebook posts**, upload a photo, describe the post, and
confirm once. A database-backed worker then validates the image and consent,
generates the caption, applies exact clinic branding, and publishes to the
connected Facebook Page. There is no second approval screen. Unsafe content
fails closed and appears as blocked in the dentist and super-admin histories.

The super admin must first open **Facebook publishing** and configure the brand,
Page, limits, and allowed Manila publishing hours. Patient posts are disabled by
default and require a selected patient plus specific public-social-media and AI
processing consent. Clinical and patient images do not receive generative edits.

Add these server-only Coolify variables before enabling the feature:

```text
OPENROUTER_API_KEY=<server-only OpenRouter key>
OPENROUTER_TEXT_MODEL=google/gemini-3.1-flash-lite
OPENROUTER_IMAGE_MODEL=google/gemini-3.1-flash-image
SOCIAL_DEBUG_MEDICAL_BYPASS_PAGE_ID=<numeric debug Page ID only; leave empty normally>
SOCIAL_TOKEN_ENCRYPTION_KEY=<output of: openssl rand -base64 32>
META_GRAPH_VERSION=v25.0
META_APP_ID=<Meta app ID; optional but recommended for long-lived Page-token exchange>
META_APP_SECRET=<Meta app secret; server-only, optional but recommended>
```

The existing private Google Drive service account and folder are reused for
original, branded, and logo images. The Facebook Page connection expects a Page
ID and Page access token with permission to publish Page posts. Facebook
passwords must never be entered or stored. Test with a non-production Page and
keep automatic publishing disabled until OpenRouter, Drive, branding, consent policy,
and Page permissions have all been verified.

When the Meta app credentials are configured, reconnecting with a valid Meta user
token automatically exchanges it for a long-lived Page token before storage. Meta
can still revoke tokens after permission, password, Page-role, or app changes, so
no access token can be guaranteed permanent.

## Supabase and Coolify deployment

1. In Supabase, use the Supavisor **session mode** connection on port `5432`.
   Do not use transaction mode on port `6543` for the persistent Fastify
   container.
2. Apply database migrations from a trusted administrator machine:

   ```bash
   SUPABASE_PROJECT_REF=<project-ref> \
   SUPABASE_ACCESS_TOKEN=<temporary-access-token> \
   npm run migrate:supabase
   ```

   Unset both values afterward. Never store the management access token in
   Coolify, the React build, Git, or logs.
3. Run the application with the dedicated `dental_portal_app` login role,
   membership in `dental_portal_backend`, search path
   `dental_portal, public`, and a unique generated password. Never use the
   `postgres` owner role at runtime.
4. In Coolify, build from the repository `Dockerfile`, expose container port
   `3000`, set the domain to `https://dental.exodiagamedev.com`, and configure:

   ```text
   NODE_ENV=production
   PORT=3000
   PUBLIC_ORIGIN=https://dental.exodiagamedev.com
   DATABASE_URL=<least-privilege Supavisor session URL on port 5432>
   SESSION_PEPPER=<at least 32 random bytes>
   SESSION_IDLE_MINUTES=30
   SESSION_ABSOLUTE_HOURS=8
   LOGIN_MAX_ATTEMPTS=5
   LOGIN_WINDOW_MINUTES=15
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_PUBLISHABLE_KEY=<publishable-key>
   ```

   URL-encode special characters in the database password. The server verifies
   the Supabase certificate and hostname with the bundled CA; never disable
   certificate verification.
5. Store the Supabase URL and publishable key in Coolify for staff login. Never
   store a service-role key or management token in the frontend or runtime.
6. Optionally set `VITE_CLINIC_PHONE_TEL` and
   `VITE_CLINIC_PHONE_DISPLAY` as Docker build variables for the public clinic
   contact link.
7. Set `/api/health` as the Coolify health-check path. Apply migrations before
   deploying, verify direct Coolify routing, then enable the Cloudflare proxy.
8. Confirm Supabase backup coverage and complete a documented restore test.

Fastify serves both `/api/*` and the React single-page application from the
same origin; a separate Nginx container is not required.

## Release gates

Do not enable real patient records until:

- every production patient ID is randomly generated, non-sequential, and
  distributed privately;
- rate-limit, generic-error, session, logout, expiry, origin, deep-link,
  no-store, and cross-patient authorization tests pass;
- service catalog and appointment-request migrations are applied before the
  patient booking flow is enabled;
- only approved patient-safe fields and published summaries are exposed;
- Supabase API roles cannot access portal tables, RLS is enabled as defense in
  depth, and the runtime role is least privilege over verified TLS;
- application logs and browser assets contain no credentials or patient data;
- retention, credential replacement, guardian access, incident response,
  backup restoration, and clinic support procedures are documented; and
- the clinic's Data Protection Officer has approved the privacy assessment,
  patient notice, access model, and pilot.

The AI-executable design and acceptance criteria are in
[`docs/PATIENT_PORTAL_AI_IMPLEMENTATION_PLAN.md`](docs/PATIENT_PORTAL_AI_IMPLEMENTATION_PLAN.md).
