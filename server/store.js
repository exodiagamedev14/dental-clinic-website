const appointmentFromRow = (row) => ({
  id: row.id,
  dentistId: row.dentist_id,
  typeName: row.type_name,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  status: row.status,
  dentistName: row.dentist_name,
  patientInstructions: row.patient_instructions,
  dentistDoneAt: row.dentist_done_at,
  proposedFeeCents: row.proposed_fee_cents === null || row.proposed_fee_cents === undefined
    ? null
    : Number(row.proposed_fee_cents),
})

const recordFromRow = (row) => ({
  id: row.id,
  appointmentId: row.appointment_id,
  procedureName: row.procedure_name,
  treatedOn: row.treated_on,
  patientSummary: row.patient_summary,
  dentistName: row.dentist_name,
})

const treatmentPlanFromRow = (row) => ({
  id: row.id,
  title: row.title,
  patientSummary: row.patient_summary,
  status: row.status,
  startedOn: row.started_on,
  recommendedIntervalDays: row.recommended_interval_days,
  nextRecommendedOn: row.next_recommended_on,
})

const serviceFromRow = (row) => ({
  id: row.id,
  name: row.name,
  durationMinutes: row.default_duration_minutes,
  patientDescription: row.patient_description,
})

const appointmentRequestFromRow = (row) => ({
  id: row.id,
  serviceId: row.appointment_type_id,
  serviceName: row.service_name,
  dentistId: row.dentist_id,
  dentistName: row.dentist_name,
  requestedStartAt: row.requested_start_at,
  requestedEndAt: row.requested_end_at,
  preferredDate: row.preferred_date,
  timePreference: row.time_preference,
  patientNote: row.patient_note,
  status: row.status,
  clinicNote: row.status === 'confirmed' || row.status === 'declined' ? row.clinic_note : null,
  createdAt: row.created_at,
})

const availabilitySlotFromRow = (row) => ({
  dentistId: row.dentist_id,
  dentistName: row.dentist_name,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  available: row.available,
})

const staffFromRow = (row) => ({
  id: row.id,
  displayName: row.display_name,
  role: row.role,
  dentistId: row.dentist_id,
})

const dentistPatientFromRow = (row) => ({
  id: row.id,
  displayName: row.display_name,
  patientNumber: row.patient_number,
  phone: row.phone_e164,
  age: row.age,
  gender: row.gender,
  weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
  bloodPressureSystolic: row.blood_pressure_systolic,
  bloodPressureDiastolic: row.blood_pressure_diastolic,
  allergies: row.allergies,
  medicalConditions: row.medical_conditions,
  currentMedications: row.current_medications,
  medicalHistoryReviewedAt: row.medical_history_reviewed_at,
})

const prescriptionFromRow = (row) => ({
  id: row.id,
  patientId: row.patient_id,
  dentistName: row.dentist_name,
  prescribedOn: row.prescribed_on,
  genericName: row.generic_name,
  instructions: row.instructions,
  imageMimeType: row.image_mime_type,
  imageOriginalName: row.image_original_name,
  imageByteSize: row.image_byte_size,
  createdAt: row.created_at,
})

const followUpFromRow = (row) => ({
  id: row.id,
  patientId: row.patient_id,
  dentistName: row.dentist_name,
  serviceName: row.service_name,
  recommendedOn: row.recommended_on,
  notes: row.notes,
  status: row.status,
  createdAt: row.created_at,
})

const adminStaffFromRow = (row) => ({
  id: row.id,
  displayName: row.display_name,
  role: row.role,
  active: row.active,
  dentistId: row.dentist_id,
  dentistName: row.dentist_name || null,
  specialty: row.specialty || null,
  createdAt: row.created_at,
  lastLoginAt: row.last_login_at,
})

const socialSettingsFromRow = (row) => ({
  clinicName: row.clinic_name,
  primaryColor: row.primary_color,
  secondaryColor: row.secondary_color,
  fontFamily: row.font_family,
  brandVoice: row.brand_voice,
  captionPrompt: row.caption_prompt || '',
  imagePrompt: row.image_prompt || '',
  defaultLanguage: row.default_language,
  contactPhone: row.contact_phone,
  address: row.address,
  defaultCallToAction: row.default_call_to_action,
  defaultHashtags: row.default_hashtags || [],
  requiredDisclaimer: row.required_disclaimer,
  prohibitedPhrases: row.prohibited_phrases || [],
  patientPostsEnabled: row.patient_posts_enabled,
  minorPostsEnabled: row.minor_posts_enabled,
  automaticPublishingEnabled: row.automatic_publishing_enabled,
  dailyPostLimit: row.daily_post_limit,
  weeklyPostLimit: row.weekly_post_limit,
  postingStartHour: row.posting_start_hour,
  postingEndHour: row.posting_end_hour,
  hasLogo: Boolean(row.logo_drive_file_id),
  logoDriveFileId: row.logo_drive_file_id,
  logoMimeType: row.logo_mime_type,
  templates: (row.template_images || []).map((template) => ({
    id: template.id,
    driveFileId: template.driveFileId,
    mimeType: template.mimeType,
  })),
  page: row.page_id ? {
    id: row.page_id,
    name: row.page_name,
    status: row.connection_status,
  } : null,
})

const socialPostFromRow = (row) => ({
  id: row.id,
  dentistId: row.dentist_id,
  dentistName: row.dentist_name,
  createdByStaffId: row.created_by_staff_id,
  patientId: row.patient_id,
  patientName: row.patient_name,
  contentType: row.content_type,
  description: row.original_description,
  caption: row.generated_caption,
  status: row.status,
  blockingReason: row.blocking_reason,
  externalPostId: row.external_post_id,
  externalPostUrl: row.external_post_url,
  retryCount: row.retry_count,
  confirmedAt: row.confirmed_at,
  publishedAt: row.published_at,
  failedAt: row.failed_at,
  removedAt: row.removed_at,
  createdAt: row.created_at,
  hasFinalImage: Boolean(row.final_image_drive_file_id),
})

const adminMetricsFromRow = (row) => {
  const netBilledCents = Number(row.net_billed_cents || 0)
  const completedChargedVisits = Number(row.completed_charged_visits || 0)
  const cohortPaidCents = Number(row.cohort_paid_cents || 0)
  const finalizedVisits = Number(row.finalized_visits || 0)
  return {
    grossBilledCents: Number(row.gross_billed_cents || 0),
    discountsCents: Number(row.discounts_cents || 0),
    netBilledCents,
    cashCollectedCents: Number(row.cash_collected_cents || 0),
    outstandingCents: Number(row.outstanding_cents || 0),
    completedVisits: Number(row.completed_visits || 0),
    averageBilledCents: completedChargedVisits ? Math.round(netBilledCents / completedChargedVisits) : null,
    collectionRate: netBilledCents ? cohortPaidCents / netBilledCents : null,
    cancelledVisits: Number(row.cancelled_visits || 0),
    noShowVisits: Number(row.no_show_visits || 0),
    cancellationRate: finalizedVisits ? Number(row.cancelled_visits || 0) / finalizedVisits : null,
    noShowRate: finalizedVisits ? Number(row.no_show_visits || 0) / finalizedVisits : null,
    newPatientProfiles: Number(row.new_patient_profiles || 0),
    scheduledFutureVisits: Number(row.scheduled_future_visits || 0),
    dataPoints: Number(row.data_points || 0),
  }
}

const receptionRequestFromRow = (row) => ({
  ...appointmentRequestFromRow(row),
  patient: {
    id: row.patient_id,
    displayName: row.patient_name,
    patientNumber: row.patient_number,
    phone: row.phone_e164,
  },
  clinicNote: row.clinic_note,
})

const receptionAppointmentFromRow = (row) => ({
  id: row.id,
  typeName: row.type_name,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  status: row.status,
  dentistId: row.dentist_id,
  dentistName: row.dentist_name,
  proposedFeeCents: row.proposed_fee_cents === null || row.proposed_fee_cents === undefined
    ? null
    : Number(row.proposed_fee_cents),
  patient: {
    id: row.patient_id,
    displayName: row.patient_name,
    patientNumber: row.patient_number,
    phone: row.phone_e164,
  },
})

const chargesFromRows = (rows, includeVoided = true, includeStaff = true) => {
  const charges = new Map()
  for (const row of rows) {
    if (!charges.has(row.charge_id)) {
      charges.set(row.charge_id, {
        id: row.charge_id,
        recordNumber: String(row.payment_record_number),
        appointmentId: row.appointment_id,
        description: row.description,
        subtotalCents: row.subtotal_cents,
        discountCents: row.discount_cents,
        totalCents: row.total_cents,
        status: row.charge_status,
        invoiceReference: row.invoice_reference,
        createdAt: row.charge_created_at,
        appointmentStartsAt: row.appointment_starts_at,
        dentistName: row.dentist_name,
        ...(includeStaff ? { handledBy: row.checkout_staff_name } : {}),
        patient: {
          id: row.patient_id,
          displayName: row.patient_name,
          patientNumber: row.patient_number,
        },
        payments: [],
      })
    }
    if (row.payment_id && (includeVoided || row.payment_status === 'posted')) {
      charges.get(row.charge_id).payments.push({
        id: row.payment_id,
        amountCents: row.payment_amount_cents,
        method: row.payment_method,
        reference: row.external_reference,
        status: row.payment_status,
        receivedAt: row.received_at,
        voidReason: row.void_reason,
        ...(includeStaff ? { recordedBy: row.payment_staff_name } : {}),
      })
    }
  }
  return [...charges.values()].map((charge) => {
    const paidCents = charge.payments
      .filter(({ status }) => status === 'posted')
      .reduce((total, { amountCents }) => total + amountCents, 0)
    return { ...charge, paidCents, balanceCents: charge.totalCents - paidCents }
  })
}

const appointmentSelect = `
  SELECT a.id, t.name AS type_name, a.starts_at, a.ends_at, a.status,
         d.display_name AS dentist_name, a.patient_instructions
  FROM appointments a
  JOIN appointment_types t ON t.id = a.appointment_type_id
  JOIN dentists d ON d.id = a.dentist_id
`

const recordSelect = `
  SELECT r.id, r.appointment_id, r.procedure_name, r.treated_on, r.patient_summary,
         d.display_name AS dentist_name
  FROM clinical_records r
  JOIN dentists d ON d.id = r.dentist_id
`

const treatmentPlanSelect = `
  SELECT id, title, patient_summary, status, started_on,
         recommended_interval_days, next_recommended_on
  FROM treatment_plans
`

const appointmentRequestSelect = `
  SELECT r.id, r.appointment_type_id, t.name AS service_name,
         r.dentist_id, d.display_name AS dentist_name,
         r.requested_start_at, r.requested_end_at,
         r.preferred_date, r.time_preference, r.patient_note,
         r.status, r.clinic_note, r.created_at
  FROM appointment_requests r
  JOIN appointment_types t ON t.id = r.appointment_type_id
  LEFT JOIN dentists d ON d.id = r.dentist_id
`

export function createStore(db) {
  const addAudit = async ({
    actorType,
    actorId = null,
    action,
    objectType = null,
    objectId = null,
    occurredAt,
    requestId,
    ipDigest,
    userAgent,
  }) => {
    await db.query(
      `INSERT INTO audit_events (
         actor_type, actor_id, action, object_type, object_id, occurred_at,
         request_id, ip_digest, user_agent
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        actorType,
        actorId,
        action,
        objectType,
        objectId,
        occurredAt,
        requestId,
        ipDigest,
        userAgent?.slice(0, 512) || null,
      ],
    )
  }

  const listAppointments = async (patientId, scope, now) => {
    const upcoming = scope === 'upcoming'
    const result = await db.query(
      `${appointmentSelect}
       WHERE a.patient_id = $1
         AND ${upcoming
    ? "a.starts_at >= $2 AND a.status IN ('scheduled', 'confirmed')"
    : "(a.starts_at < $2 OR a.status IN ('completed', 'cancelled', 'no_show'))"}
       ORDER BY a.starts_at ${upcoming ? 'ASC' : 'DESC'}`,
      [patientId, now],
    )
    return result.rows.map(appointmentFromRow)
  }

  const listRecords = async (patientId) => {
    const result = await db.query(
      `${recordSelect}
       WHERE r.patient_id = $1
         AND r.published_at IS NOT NULL
       ORDER BY r.treated_on DESC, r.created_at DESC`,
      [patientId],
    )
    return result.rows.map(recordFromRow)
  }

  const listPatientPrescriptions = async (patientId) => {
    const result = await db.query(
      `SELECT rx.id, rx.patient_id, d.display_name AS dentist_name,
              rx.prescribed_on, rx.generic_name, rx.instructions,
              rx.image_mime_type, rx.image_original_name,
              rx.image_byte_size, rx.created_at
       FROM prescriptions rx
       JOIN dentists d ON d.id = rx.dentist_id
       WHERE rx.patient_id = $1
       ORDER BY rx.prescribed_on DESC, rx.created_at DESC`,
      [patientId],
    )
    return result.rows.map(prescriptionFromRow)
  }

  const listPatientFollowUps = async (patientId) => {
    const result = await db.query(
      `SELECT f.id, f.patient_id, d.display_name AS dentist_name,
              t.name AS service_name, f.recommended_on, f.notes,
              f.status, f.created_at
       FROM follow_up_recommendations f
       JOIN dentists d ON d.id = f.dentist_id
       LEFT JOIN appointment_types t ON t.id = f.appointment_type_id
       WHERE f.patient_id = $1
       ORDER BY f.recommended_on DESC, f.created_at DESC`,
      [patientId],
    )
    return result.rows.map(followUpFromRow)
  }

  const getTreatmentPlan = async (patientId) => {
    const result = await db.query(
      `${treatmentPlanSelect}
       WHERE patient_id = $1
         AND published_at IS NOT NULL
         AND status = 'active'
       ORDER BY updated_at DESC
       LIMIT 1`,
      [patientId],
    )
    return result.rowCount ? treatmentPlanFromRow(result.rows[0]) : null
  }

  const listServices = async () => {
    const result = await db.query(
      `SELECT id, name, default_duration_minutes, patient_description
       FROM appointment_types
       ORDER BY name ASC`,
    )
    return result.rows.map(serviceFromRow)
  }

  const listAppointmentRequests = async (patientId) => {
    const result = await db.query(
      `${appointmentRequestSelect}
       WHERE r.patient_id = $1
         AND r.status = 'requested'
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [patientId],
    )
    return result.rows.map(appointmentRequestFromRow)
  }

  const listAvailability = async (date, now) => {
    const result = await db.query(
      `WITH slots AS (
         SELECT generate_series(
           (($1::date + time '09:00') AT TIME ZONE 'Asia/Manila'),
           (($1::date + time '16:00') AT TIME ZONE 'Asia/Manila'),
           interval '1 hour'
         ) AS starts_at
         WHERE EXTRACT(ISODOW FROM $1::date) BETWEEN 1 AND 6
       )
       SELECT d.id AS dentist_id, d.display_name AS dentist_name,
              slots.starts_at, slots.starts_at + interval '1 hour' AS ends_at,
              (
                slots.starts_at > $2
                AND NOT EXISTS (
                  SELECT 1
                  FROM appointments a
                  WHERE a.dentist_id = d.id
                    AND a.status IN ('scheduled', 'confirmed')
                    AND a.starts_at < slots.starts_at + interval '1 hour'
                    AND a.ends_at > slots.starts_at
                )
                AND NOT EXISTS (
                  SELECT 1
                  FROM appointment_requests r
                  WHERE r.dentist_id = d.id
                    AND r.status IN ('requested', 'confirmed')
                    AND r.requested_start_at < slots.starts_at + interval '1 hour'
                    AND r.requested_end_at > slots.starts_at
                )
              ) AS available
       FROM dentists d
       CROSS JOIN slots
       WHERE d.active = true
         AND EXISTS (
           SELECT 1 FROM staff_profiles s
           WHERE s.dentist_id = d.id AND s.role = 'dentist' AND s.active = true
         )
       ORDER BY slots.starts_at ASC, d.display_name ASC`,
      [date, now],
    )
    return result.rows.map(availabilitySlotFromRow)
  }

  const createConfirmedAppointment = async (queryable, {
    patientId, dentistId, appointmentTypeId, startsAt, patientInstructions = null, now,
  }) => {
    try {
      const result = await queryable.query(
        `INSERT INTO appointments (
           patient_id, dentist_id, appointment_type_id, starts_at, ends_at,
           status, patient_instructions, created_at, updated_at
         )
         SELECT p.id, d.id, t.id, $4::timestamptz,
                $4::timestamptz + interval '1 hour', 'confirmed', $5, $6, $6
         FROM patients p
         CROSS JOIN dentists d
         CROSS JOIN appointment_types t
         WHERE p.id = $1
           AND d.id = $2 AND d.active = true
           AND EXISTS (
             SELECT 1 FROM staff_profiles s
             WHERE s.dentist_id = d.id AND s.role = 'dentist' AND s.active = true
           )
           AND t.id = $3
           AND $4::timestamptz > $6
           AND EXTRACT(ISODOW FROM $4::timestamptz AT TIME ZONE 'Asia/Manila') BETWEEN 1 AND 6
           AND ($4::timestamptz AT TIME ZONE 'Asia/Manila')::time >= time '09:00'
           AND ($4::timestamptz AT TIME ZONE 'Asia/Manila')::time < time '17:00'
           AND EXTRACT(MINUTE FROM $4::timestamptz AT TIME ZONE 'Asia/Manila') = 0
           AND EXTRACT(SECOND FROM $4::timestamptz AT TIME ZONE 'Asia/Manila') = 0
           AND NOT EXISTS (
             SELECT 1 FROM appointments a
             WHERE (a.dentist_id = d.id OR a.patient_id = p.id)
               AND a.status IN ('scheduled', 'confirmed')
               AND a.starts_at < $4::timestamptz + interval '1 hour'
               AND a.ends_at > $4::timestamptz
           )
           AND NOT EXISTS (
             SELECT 1 FROM appointment_requests r
             WHERE (r.dentist_id = d.id OR r.patient_id = p.id)
               AND r.status IN ('requested', 'confirmed')
               AND r.requested_start_at < $4::timestamptz + interval '1 hour'
               AND r.requested_end_at > $4::timestamptz
           )
         ON CONFLICT (dentist_id, starts_at)
           WHERE status IN ('scheduled', 'confirmed')
           DO NOTHING
         RETURNING id`,
        [patientId, dentistId, appointmentTypeId, startsAt, patientInstructions, now],
      )
      return result.rowCount
        ? { outcome: 'created', id: result.rows[0].id }
        : { outcome: 'slot_unavailable' }
    } catch (error) {
      if (error.code === '23505') return { outcome: 'slot_unavailable' }
      throw error
    }
  }

  const loadCharges = async (queryable, whereSql, values, includeVoided = true, includeStaff = true) => {
    const result = await queryable.query(
      `SELECT c.id AS charge_id, c.payment_record_number, c.appointment_id,
              c.description, c.subtotal_cents, c.discount_cents, c.total_cents,
              c.status AS charge_status, c.invoice_reference,
              c.created_at AS charge_created_at,
              a.starts_at AS appointment_starts_at, d.display_name AS dentist_name,
              p.id AS patient_id, p.display_name AS patient_name, p.patient_number,
              checkout_staff.display_name AS checkout_staff_name,
              pay.id AS payment_id, pay.amount_cents AS payment_amount_cents,
              pay.method AS payment_method, pay.external_reference,
              pay.status AS payment_status, pay.received_at, pay.void_reason,
              payment_staff.display_name AS payment_staff_name
       FROM patient_charges c
       JOIN appointments a ON a.id = c.appointment_id
       JOIN dentists d ON d.id = a.dentist_id
       JOIN patients p ON p.id = c.patient_id
       JOIN staff_profiles checkout_staff ON checkout_staff.id = c.created_by_staff_id
       LEFT JOIN patient_payments pay ON pay.charge_id = c.id
       LEFT JOIN staff_profiles payment_staff ON payment_staff.id = pay.recorded_by_staff_id
       WHERE ${whereSql}
       ORDER BY c.created_at DESC, pay.received_at ASC`,
      values,
    )
    return chargesFromRows(result.rows, includeVoided, includeStaff)
  }

  const updateChargeStatus = async (client, chargeId, now) => {
    await client.query(
      `UPDATE patient_charges c
       SET status = CASE
             WHEN paid.total >= c.total_cents THEN 'paid'
             WHEN paid.total > 0 THEN 'partially_paid'
             ELSE 'unpaid'
           END,
           updated_at = $2
       FROM (
         SELECT coalesce(sum(amount_cents) FILTER (WHERE status = 'posted'), 0)::integer AS total
         FROM patient_payments
         WHERE charge_id = $1
       ) paid
       WHERE c.id = $1`,
      [chargeId, now],
    )
  }

  const loadAdminMetrics = async ({ from, to, dentistId, serviceId, now }) => {
    const result = await db.query(
      `WITH visit_counts AS (
         SELECT count(*) FILTER (
                  WHERE coalesce(a.dentist_done_at, CASE WHEN a.status = 'completed' THEN a.starts_at END)
                    >= ($1::date AT TIME ZONE 'Asia/Manila')
                    AND coalesce(a.dentist_done_at, CASE WHEN a.status = 'completed' THEN a.starts_at END)
                    < (($2::date + 1) AT TIME ZONE 'Asia/Manila')
                ) AS completed_visits,
                count(*) FILTER (
                  WHERE a.status = 'cancelled'
                    AND a.starts_at >= ($1::date AT TIME ZONE 'Asia/Manila')
                    AND a.starts_at < (($2::date + 1) AT TIME ZONE 'Asia/Manila')
                ) AS cancelled_visits,
                count(*) FILTER (
                  WHERE a.status = 'no_show'
                    AND a.starts_at >= ($1::date AT TIME ZONE 'Asia/Manila')
                    AND a.starts_at < (($2::date + 1) AT TIME ZONE 'Asia/Manila')
                ) AS no_show_visits
         FROM appointments a
         WHERE ($3::uuid IS NULL OR a.dentist_id = $3)
           AND ($4::uuid IS NULL OR a.appointment_type_id = $4)
       ), billed AS (
         SELECT coalesce(sum(c.subtotal_cents), 0) AS gross_billed_cents,
                coalesce(sum(c.discount_cents), 0) AS discounts_cents,
                coalesce(sum(c.total_cents), 0) AS net_billed_cents,
                count(DISTINCT c.appointment_id) AS completed_charged_visits
         FROM patient_charges c
         JOIN appointments a ON a.id = c.appointment_id
         WHERE c.created_at >= ($1::date AT TIME ZONE 'Asia/Manila')
           AND c.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Manila')
           AND ($3::uuid IS NULL OR a.dentist_id = $3)
           AND ($4::uuid IS NULL OR a.appointment_type_id = $4)
       ), cohort_paid AS (
         SELECT coalesce(sum(p.amount_cents), 0) AS cohort_paid_cents
         FROM patient_charges c
         JOIN appointments a ON a.id = c.appointment_id
         JOIN patient_payments p ON p.charge_id = c.id AND p.status = 'posted'
         WHERE c.created_at >= ($1::date AT TIME ZONE 'Asia/Manila')
           AND c.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Manila')
           AND ($3::uuid IS NULL OR a.dentist_id = $3)
           AND ($4::uuid IS NULL OR a.appointment_type_id = $4)
       ), cash AS (
         SELECT coalesce(sum(p.amount_cents), 0) AS cash_collected_cents
         FROM patient_payments p
         JOIN patient_charges c ON c.id = p.charge_id
         JOIN appointments a ON a.id = c.appointment_id
         WHERE p.status = 'posted'
           AND p.received_at >= ($1::date AT TIME ZONE 'Asia/Manila')
           AND p.received_at < (($2::date + 1) AT TIME ZONE 'Asia/Manila')
           AND ($3::uuid IS NULL OR a.dentist_id = $3)
           AND ($4::uuid IS NULL OR a.appointment_type_id = $4)
       ), outstanding AS (
         SELECT coalesce(sum(greatest(c.total_cents - coalesce(paid.amount_cents, 0), 0)), 0) AS outstanding_cents
         FROM patient_charges c
         JOIN appointments a ON a.id = c.appointment_id
         LEFT JOIN (
           SELECT charge_id, sum(amount_cents) AS amount_cents
           FROM patient_payments WHERE status = 'posted' GROUP BY charge_id
         ) paid ON paid.charge_id = c.id
         WHERE ($3::uuid IS NULL OR a.dentist_id = $3)
           AND ($4::uuid IS NULL OR a.appointment_type_id = $4)
       )
       SELECT billed.*, cohort_paid.*, cash.*, visit_counts.*,
              (visit_counts.completed_visits + visit_counts.cancelled_visits + visit_counts.no_show_visits) AS finalized_visits,
              outstanding.*,
              (SELECT count(*) FROM patients
               WHERE created_at >= ($1::date AT TIME ZONE 'Asia/Manila')
                 AND created_at < (($2::date + 1) AT TIME ZONE 'Asia/Manila')) AS new_patient_profiles,
              (SELECT count(*) FROM appointments a
               WHERE a.starts_at > $5 AND a.status IN ('scheduled', 'confirmed')
                 AND ($3::uuid IS NULL OR a.dentist_id = $3)
                 AND ($4::uuid IS NULL OR a.appointment_type_id = $4)) AS scheduled_future_visits,
              (visit_counts.completed_visits + visit_counts.cancelled_visits + visit_counts.no_show_visits
               + billed.completed_charged_visits
               + CASE WHEN cash.cash_collected_cents > 0 THEN 1 ELSE 0 END) AS data_points
       FROM billed, cohort_paid, cash, visit_counts, outstanding`,
      [from, to, dentistId, serviceId, now],
    )
    return adminMetricsFromRow(result.rows[0])
  }

  const loadAdminTrend = async ({ from, to, dentistId, serviceId }) => {
    const result = await db.query(
       `WITH days AS (
         SELECT generate_series($1::date, $2::date, interval '1 day')::date AS day
       ), visits AS (
         SELECT (coalesce(a.dentist_done_at, CASE WHEN a.status = 'completed' THEN a.starts_at END)
                  AT TIME ZONE 'Asia/Manila')::date AS day,
                count(*) AS completed_visits
         FROM appointments a
         WHERE coalesce(a.dentist_done_at, CASE WHEN a.status = 'completed' THEN a.starts_at END)
                 >= ($1::date AT TIME ZONE 'Asia/Manila')
           AND coalesce(a.dentist_done_at, CASE WHEN a.status = 'completed' THEN a.starts_at END)
                 < (($2::date + 1) AT TIME ZONE 'Asia/Manila')
           AND ($3::uuid IS NULL OR a.dentist_id = $3)
           AND ($4::uuid IS NULL OR a.appointment_type_id = $4)
         GROUP BY 1
       ), billed AS (
         SELECT (c.created_at AT TIME ZONE 'Asia/Manila')::date AS day,
                sum(c.total_cents) AS net_billed_cents
         FROM patient_charges c
         JOIN appointments a ON a.id = c.appointment_id
         WHERE c.created_at >= ($1::date AT TIME ZONE 'Asia/Manila')
           AND c.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Manila')
           AND ($3::uuid IS NULL OR a.dentist_id = $3)
           AND ($4::uuid IS NULL OR a.appointment_type_id = $4)
         GROUP BY 1
       ), cash AS (
         SELECT (p.received_at AT TIME ZONE 'Asia/Manila')::date AS day,
                sum(p.amount_cents) AS cash_collected_cents
         FROM patient_payments p
         JOIN patient_charges c ON c.id = p.charge_id
         JOIN appointments a ON a.id = c.appointment_id
         WHERE p.status = 'posted'
           AND p.received_at >= ($1::date AT TIME ZONE 'Asia/Manila')
           AND p.received_at < (($2::date + 1) AT TIME ZONE 'Asia/Manila')
           AND ($3::uuid IS NULL OR a.dentist_id = $3)
           AND ($4::uuid IS NULL OR a.appointment_type_id = $4)
         GROUP BY 1
       )
       SELECT days.day, coalesce(visits.completed_visits, 0) AS completed_visits,
              coalesce(billed.net_billed_cents, 0) AS net_billed_cents,
              coalesce(cash.cash_collected_cents, 0) AS cash_collected_cents
       FROM days LEFT JOIN visits USING (day) LEFT JOIN billed USING (day) LEFT JOIN cash USING (day)
       ORDER BY days.day`,
      [from, to, dentistId, serviceId],
    )
    return result.rows.map((row) => ({
      date: row.day,
      completedVisits: Number(row.completed_visits),
      netBilledCents: Number(row.net_billed_cents),
      cashCollectedCents: Number(row.cash_collected_cents),
    }))
  }

  return {
    async health() {
      await db.query('SELECT 1')
    },

    async createSessionForLogin({
      normalizedName,
      patientNumber,
      phoneDigits,
      sessionId,
      tokenDigest,
      now,
      absoluteExpiresAt,
      audit,
    }) {
      return db.transaction(async (client) => {
        const result = await client.query(
          `SELECT id, display_name, patient_number, phone_e164
           FROM patients
           WHERE normalized_name = $1
             AND (
               ($2::text IS NOT NULL AND patient_number = $2)
               OR (
                 $3::text IS NOT NULL
                 AND regexp_replace(coalesce(phone_e164, ''), '[^0-9]', '', 'g')
                   IN ($3, '0' || substring($3 from 3))
               )
             )
             AND portal_enabled = true
           LIMIT 1`,
          [normalizedName, patientNumber, phoneDigits],
        )
        const row = result.rows[0]

        if (row) {
          await client.query(
            `INSERT INTO portal_sessions (
               id, patient_id, token_digest, created_at, last_seen_at,
               absolute_expires_at
             ) VALUES ($1, $2, $3, $4, $4, $5)`,
            [sessionId, row.id, tokenDigest, now, absoluteExpiresAt],
          )
        }
        await client.query(
          `INSERT INTO audit_events (
             actor_type, actor_id, action, occurred_at, request_id, ip_digest, user_agent
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            row ? 'patient' : 'anonymous',
            row?.id || null,
            row ? 'portal.login_succeeded' : 'portal.login_failed',
            now,
            audit.requestId,
            audit.ipDigest,
            audit.userAgent?.slice(0, 512) || null,
          ],
        )
        return row
          ? {
              id: row.id,
              displayName: row.display_name,
              patientNumber: row.patient_number,
              phone: row.phone_e164,
            }
          : null
      })
    },

    async authenticateSession(tokenDigest, now, idleCutoff) {
      const result = await db.query(
        `UPDATE portal_sessions s
         SET last_seen_at = $2
         FROM patients p
         WHERE s.token_digest = $1
           AND s.patient_id = p.id
           AND s.revoked_at IS NULL
           AND s.absolute_expires_at > $2
           AND s.last_seen_at >= $3
           AND p.portal_enabled = true
         RETURNING s.id AS session_id, p.id, p.display_name, p.patient_number, p.phone_e164`,
        [tokenDigest, now, idleCutoff],
      )
      const row = result.rows[0]
      return row
        ? {
            sessionId: row.session_id,
            id: row.id,
            displayName: row.display_name,
            patientNumber: row.patient_number,
            phone: row.phone_e164,
          }
        : null
    },

    async revokeSession(tokenDigest, now) {
      const result = await db.query(
        `UPDATE portal_sessions s
         SET revoked_at = $2
         FROM patients p
         WHERE s.token_digest = $1 AND s.revoked_at IS NULL
           AND p.id = s.patient_id
         RETURNING p.id, p.display_name`,
        [tokenDigest, now],
      )
      return result.rows[0] || null
    },

    async findActiveStaffLogin(normalizedName) {
      const result = await db.query(
        `SELECT email, auth_user_id, password_salt, password_hash
         FROM staff_profiles
         WHERE active = true
           AND (
             normalized_name = $1
             OR (
               role = 'dentist'
               AND regexp_replace(normalized_name, '^dr\.?\s+', '', 'i')
                 = regexp_replace($1, '^dr\.?\s+', '', 'i')
             )
           )
         ORDER BY (normalized_name = $1) DESC
         LIMIT 1`,
        [normalizedName],
      )
      const row = result.rows[0]
      return row ? {
        email: row.email,
        authUserId: row.auth_user_id,
        passwordSalt: row.password_salt,
        passwordHash: row.password_hash,
      } : null
    },

    async createStaffSessionForLogin({
      authUserId,
      sessionId,
      tokenDigest,
      now,
      absoluteExpiresAt,
      audit,
    }) {
      return db.transaction(async (client) => {
        const result = await client.query(
          `UPDATE staff_profiles AS sp
           SET last_login_at = $2
           WHERE sp.auth_user_id = $1
             AND sp.active = true
           RETURNING sp.id, sp.display_name, sp.role, sp.dentist_id`,
          [authUserId, now],
        )
        const row = result.rows[0]
        if (row) {
          await client.query(
            `INSERT INTO staff_sessions (
               id, staff_id, token_digest, created_at, last_seen_at,
               absolute_expires_at
             ) VALUES ($1, $2, $3, $4, $4, $5)`,
            [sessionId, row.id, tokenDigest, now, absoluteExpiresAt],
          )
        }
        await client.query(
          `INSERT INTO audit_events (
             actor_type, actor_id, action, occurred_at, request_id, ip_digest, user_agent
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            row ? 'staff' : 'anonymous',
            row?.id || null,
            row?.role === 'super_admin'
              ? 'admin.login_succeeded'
              : row ? 'staff.login_succeeded' : 'staff.login_failed',
            now,
            audit.requestId,
            audit.ipDigest,
            audit.userAgent?.slice(0, 512) || null,
          ],
        )
        return row ? staffFromRow(row) : null
      })
    },

    async authenticateStaffSession(tokenDigest, now, idleCutoff) {
      const result = await db.query(
        `UPDATE staff_sessions s
         SET last_seen_at = $2
         FROM staff_profiles p
         WHERE s.token_digest = $1
           AND s.staff_id = p.id
           AND s.revoked_at IS NULL
           AND s.absolute_expires_at > $2
           AND s.last_seen_at >= $3
           AND p.active = true
         RETURNING p.id, p.display_name, p.email, p.role, p.dentist_id`,
        [tokenDigest, now, idleCutoff],
      )
      return result.rowCount ? staffFromRow(result.rows[0]) : null
    },

    async revokeStaffSession(tokenDigest, now) {
      const result = await db.query(
        `UPDATE staff_sessions s
         SET revoked_at = $2
         FROM staff_profiles p
         WHERE s.token_digest = $1 AND s.revoked_at IS NULL
           AND p.id = s.staff_id
         RETURNING p.id, p.display_name, p.role`,
        [tokenDigest, now],
      )
      return result.rows[0] || null
    },

    addAudit,
    listServices,
    listAppointmentRequests,
    listAvailability,
    listAppointments,
    listRecords,
    listPatientPrescriptions,
    listPatientFollowUps,
    getTreatmentPlan,

    async getAdminAnalytics({ from, to, comparison, dentistId, serviceId, now }) {
      const currentInput = { from, to, dentistId, serviceId, now }
      const comparisonInput = comparison
        ? { ...comparison, dentistId, serviceId, now }
        : null
      const [metrics, comparisonMetrics, trend, comparisonTrend, services, doctors, paymentMethods, aging] = await Promise.all([
        loadAdminMetrics(currentInput),
        comparisonInput ? loadAdminMetrics(comparisonInput) : null,
        loadAdminTrend(currentInput),
        comparisonInput ? loadAdminTrend(comparisonInput) : [],
        db.query(
          `SELECT t.id, t.name,
                  coalesce(v.completed_visits, 0) AS completed_visits,
                  coalesce(b.net_billed_cents, 0) AS net_billed_cents
           FROM appointment_types t
           LEFT JOIN (
             SELECT a.appointment_type_id, count(*) AS completed_visits
             FROM appointments a
             WHERE coalesce(a.dentist_done_at, CASE WHEN a.status = 'completed' THEN a.starts_at END)
                     >= ($1::date AT TIME ZONE 'Asia/Manila')
               AND coalesce(a.dentist_done_at, CASE WHEN a.status = 'completed' THEN a.starts_at END)
                     < (($2::date + 1) AT TIME ZONE 'Asia/Manila')
               AND ($3::uuid IS NULL OR a.dentist_id = $3)
             GROUP BY a.appointment_type_id
           ) v ON v.appointment_type_id = t.id
           LEFT JOIN (
             SELECT a.appointment_type_id, sum(c.total_cents) AS net_billed_cents
             FROM patient_charges c
             JOIN appointments a ON a.id = c.appointment_id
             WHERE c.created_at >= ($1::date AT TIME ZONE 'Asia/Manila')
               AND c.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Manila')
               AND ($3::uuid IS NULL OR a.dentist_id = $3)
             GROUP BY a.appointment_type_id
           ) b ON b.appointment_type_id = t.id
           WHERE ($4::uuid IS NULL OR t.id = $4)
           ORDER BY completed_visits DESC, t.name ASC`,
          [from, to, dentistId, serviceId],
        ),
        db.query(
          `SELECT d.id, d.display_name, d.specialty, d.active,
                  coalesce(v.completed_visits, 0) AS completed_visits,
                  coalesce(u.upcoming_visits, 0) AS upcoming_visits,
                  coalesce(v.cancelled_visits, 0) AS cancelled_visits,
                  coalesce(v.no_show_visits, 0) AS no_show_visits,
                  coalesce(b.net_billed_cents, 0) AS net_billed_cents
           FROM dentists d
           JOIN staff_profiles ds ON ds.dentist_id = d.id AND ds.role = 'dentist'
           LEFT JOIN (
             SELECT a.dentist_id,
                    count(*) FILTER (
                      WHERE coalesce(a.dentist_done_at, CASE WHEN a.status = 'completed' THEN a.starts_at END)
                        >= ($1::date AT TIME ZONE 'Asia/Manila')
                        AND coalesce(a.dentist_done_at, CASE WHEN a.status = 'completed' THEN a.starts_at END)
                        < (($2::date + 1) AT TIME ZONE 'Asia/Manila')
                    ) AS completed_visits,
                    count(*) FILTER (WHERE a.status = 'cancelled') AS cancelled_visits,
                    count(*) FILTER (WHERE a.status = 'no_show') AS no_show_visits
             FROM appointments a
             WHERE (coalesce(a.dentist_done_at, a.starts_at) >= ($1::date AT TIME ZONE 'Asia/Manila')
                    AND coalesce(a.dentist_done_at, a.starts_at) < (($2::date + 1) AT TIME ZONE 'Asia/Manila'))
               AND ($4::uuid IS NULL OR a.appointment_type_id = $4)
             GROUP BY a.dentist_id
           ) v ON v.dentist_id = d.id
           LEFT JOIN (
             SELECT a.dentist_id, count(*) AS upcoming_visits
             FROM appointments a
             WHERE a.status IN ('scheduled', 'confirmed') AND a.starts_at > $5
               AND ($4::uuid IS NULL OR a.appointment_type_id = $4)
             GROUP BY a.dentist_id
           ) u ON u.dentist_id = d.id
           LEFT JOIN (
             SELECT a.dentist_id, sum(c.total_cents) AS net_billed_cents
             FROM patient_charges c
             JOIN appointments a ON a.id = c.appointment_id
             WHERE c.created_at >= ($1::date AT TIME ZONE 'Asia/Manila')
               AND c.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Manila')
               AND ($4::uuid IS NULL OR a.appointment_type_id = $4)
             GROUP BY a.dentist_id
           ) b ON b.dentist_id = d.id
           WHERE ($3::uuid IS NULL OR d.id = $3)
           ORDER BY completed_visits DESC, d.display_name ASC`,
          [from, to, dentistId, serviceId, now],
        ),
        db.query(
          `SELECT p.method, sum(p.amount_cents) AS amount_cents
           FROM patient_payments p
           JOIN patient_charges c ON c.id = p.charge_id
           JOIN appointments a ON a.id = c.appointment_id
           WHERE p.status = 'posted'
             AND p.received_at >= ($1::date AT TIME ZONE 'Asia/Manila')
             AND p.received_at < (($2::date + 1) AT TIME ZONE 'Asia/Manila')
             AND ($3::uuid IS NULL OR a.dentist_id = $3)
             AND ($4::uuid IS NULL OR a.appointment_type_id = $4)
           GROUP BY p.method ORDER BY amount_cents DESC`,
          [from, to, dentistId, serviceId],
        ),
        db.query(
          `WITH balances AS (
             SELECT c.created_at,
                    greatest(c.total_cents - coalesce(sum(p.amount_cents) FILTER (WHERE p.status = 'posted'), 0), 0) AS balance
             FROM patient_charges c
             JOIN appointments a ON a.id = c.appointment_id
             LEFT JOIN patient_payments p ON p.charge_id = c.id
             WHERE ($1::uuid IS NULL OR a.dentist_id = $1)
               AND ($2::uuid IS NULL OR a.appointment_type_id = $2)
             GROUP BY c.id, c.created_at, c.total_cents
           )
           SELECT coalesce(sum(balance) FILTER (WHERE $3::timestamptz::date - created_at::date <= 30), 0) AS current_cents,
                  coalesce(sum(balance) FILTER (WHERE $3::timestamptz::date - created_at::date BETWEEN 31 AND 60), 0) AS days_31_60_cents,
                  coalesce(sum(balance) FILTER (WHERE $3::timestamptz::date - created_at::date BETWEEN 61 AND 90), 0) AS days_61_90_cents,
                  coalesce(sum(balance) FILTER (WHERE $3::timestamptz::date - created_at::date > 90), 0) AS over_90_cents
           FROM balances WHERE balance > 0`,
          [dentistId, serviceId, now],
        ),
      ])

      const completedTotal = services.rows.reduce((sum, row) => sum + Number(row.completed_visits), 0)
      return {
        metrics,
        comparisonMetrics,
        comparisonAvailable: Boolean(comparisonMetrics?.dataPoints),
        trend,
        comparisonTrend,
        services: services.rows.map((row) => ({
          id: row.id,
          name: row.name,
          completedVisits: Number(row.completed_visits),
          serviceMix: completedTotal ? Number(row.completed_visits) / completedTotal : 0,
          netBilledCents: Number(row.net_billed_cents),
          averageBilledCents: Number(row.completed_visits)
            ? Math.round(Number(row.net_billed_cents) / Number(row.completed_visits))
            : null,
        })),
        doctors: doctors.rows.map((row) => ({
          id: row.id,
          displayName: row.display_name,
          specialty: row.specialty,
          active: row.active,
          completedVisits: Number(row.completed_visits),
          upcomingVisits: Number(row.upcoming_visits),
          cancelledVisits: Number(row.cancelled_visits),
          noShowVisits: Number(row.no_show_visits),
          netBilledCents: Number(row.net_billed_cents),
        })),
        paymentMethods: paymentMethods.rows.map((row) => ({ method: row.method, amountCents: Number(row.amount_cents) })),
        aging: Object.fromEntries(Object.entries(aging.rows[0] || {}).map(([key, value]) => [key.replace(/_([a-z])/g, (_, char) => char.toUpperCase()), Number(value)])),
      }
    },

    async listAdminStaff() {
      const result = await db.query(
        `SELECT s.id, s.display_name, s.role, s.active, s.dentist_id,
                s.created_at, s.last_login_at, d.display_name AS dentist_name, d.specialty
         FROM staff_profiles s
         LEFT JOIN dentists d ON d.id = s.dentist_id
         ORDER BY s.active DESC, s.display_name ASC`,
      )
      return result.rows.map(adminStaffFromRow)
    },

    async createAdminStaff({ authUserId, email, displayName, normalizedName, role, specialty, passwordSalt, passwordHash }) {
      try {
        return await db.transaction(async (client) => {
          const existing = await client.query('SELECT 1 FROM staff_profiles WHERE normalized_name = $1', [normalizedName])
          if (existing.rowCount) return { outcome: 'already_exists' }
          let dentistId = null
          if (role === 'dentist') {
            const dentist = await client.query(
              `INSERT INTO dentists (display_name, specialty, active)
               VALUES ($1, $2, true) RETURNING id`,
              [displayName, specialty],
            )
            dentistId = dentist.rows[0].id
          }
          const result = await client.query(
            `INSERT INTO staff_profiles (
               auth_user_id, email, display_name, normalized_name, role, active,
               dentist_id, password_salt, password_hash
             ) VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8)
             RETURNING id, display_name, role, active, dentist_id, created_at, last_login_at`,
            [authUserId, email, displayName, normalizedName, role, dentistId, passwordSalt, passwordHash],
          )
          return { outcome: 'created', staff: adminStaffFromRow({ ...result.rows[0], dentist_name: role === 'dentist' ? displayName : null, specialty }) }
        })
      } catch (error) {
        if (error.code === '23505') return { outcome: 'already_exists' }
        throw error
      }
    },

    async setAdminStaffActive(id, active, now) {
      return db.transaction(async (client) => {
        const result = await client.query(
          `UPDATE staff_profiles SET active = $2, updated_at = $3
           WHERE id = $1
           RETURNING id, display_name, role, active, dentist_id, created_at, last_login_at`,
          [id, active, now],
        )
        const row = result.rows[0]
        if (!row) return null
        if (row.dentist_id) await client.query('UPDATE dentists SET active = $2 WHERE id = $1', [row.dentist_id, active])
        if (!active) await client.query('UPDATE staff_sessions SET revoked_at = $2 WHERE staff_id = $1 AND revoked_at IS NULL', [id, now])
        return adminStaffFromRow(row)
      })
    },

    async resetAdminStaffPassword(id, { passwordSalt, passwordHash }, now) {
      return db.transaction(async (client) => {
        const result = await client.query(
          `UPDATE staff_profiles SET password_salt = $2, password_hash = $3, updated_at = $4
           WHERE id = $1 RETURNING id`,
          [id, passwordSalt, passwordHash, now],
        )
        if (!result.rowCount) return false
        await client.query('UPDATE staff_sessions SET revoked_at = $2 WHERE staff_id = $1 AND revoked_at IS NULL', [id, now])
        return true
      })
    },

    async revokeAdminStaffSessions(id, now) {
      const result = await db.query(
        `UPDATE staff_sessions SET revoked_at = $2
         WHERE staff_id = $1 AND revoked_at IS NULL
         RETURNING id`,
        [id, now],
      )
      if (result.rowCount) return true
      const exists = await db.query('SELECT 1 FROM staff_profiles WHERE id = $1', [id])
      return Boolean(exists.rowCount)
    },

    async listAdminAudit(limit) {
      const result = await db.query(
        `SELECT e.id, e.occurred_at,
                coalesce(p.display_name, s.display_name) AS actor_name,
                CASE
                  WHEN e.actor_type = 'patient' THEN 'patient'
                  WHEN s.role = 'dentist' THEN 'doctor'
                  WHEN s.role = 'receptionist' THEN 'receptionist'
                  WHEN s.role = 'super_admin' THEN 'superadmin'
                END AS category,
                CASE WHEN e.action LIKE '%.login_succeeded' THEN 'login' ELSE 'logout' END AS activity
         FROM audit_events e
         LEFT JOIN patients p ON p.id = e.actor_id AND e.actor_type = 'patient'
         LEFT JOIN staff_profiles s ON s.id = e.actor_id AND e.actor_type = 'staff'
         WHERE e.action IN (
           'portal.login_succeeded', 'portal.logout',
           'staff.login_succeeded', 'staff.logout',
           'admin.login_succeeded', 'admin.logout'
         )
           AND (p.id IS NOT NULL OR s.role IN ('dentist', 'receptionist', 'super_admin'))
         ORDER BY e.occurred_at DESC LIMIT $1`,
        [limit],
      )
      return result.rows.map((row) => ({
        id: row.id,
        category: row.category,
        activity: row.activity,
        occurredAt: row.occurred_at,
        actorName: row.actor_name,
      }))
    },

    async getClinic(id) {
      const result = await db.query('SELECT id, name FROM clinics WHERE id = $1 AND active', [id])
      return result.rows[0] || null
    },

    async listSocialClinicIds() {
      const result = await db.query('SELECT id FROM dental_portal.social_clinic_ids()')
      return result.rows.map((row) => row.id)
    },

    async getSocialSettings() {
      const result = await db.query(
        `SELECT s.*, c.page_id, c.page_name, c.connection_status,
                coalesce((
                  SELECT jsonb_agg(jsonb_build_object(
                    'id', t.id, 'driveFileId', t.drive_file_id, 'mimeType', t.mime_type
                  ) ORDER BY t.created_at, t.id)
                  FROM social_brand_templates t WHERE t.settings_id = s.id
                ), '[]'::jsonb) AS template_images
         FROM social_brand_settings s
         LEFT JOIN social_page_connections c ON c.id = 1
         WHERE s.id = 1`,
      )
      return socialSettingsFromRow(result.rows[0])
    },

    async addSocialTemplate({ driveFileId, mimeType, now }) {
      return db.transaction(async (client) => {
        await client.query('SELECT id FROM social_brand_settings WHERE id = 1 FOR UPDATE')
        const count = await client.query('SELECT count(*)::integer AS count FROM social_brand_templates WHERE settings_id = 1')
        if (count.rows[0].count >= 5) return { outcome: 'limit_reached' }
        const inserted = await client.query(
          `INSERT INTO social_brand_templates (settings_id, drive_file_id, mime_type, created_at)
           VALUES (1, $1, $2, $3) RETURNING id, drive_file_id, mime_type`,
          [driveFileId, mimeType, now],
        )
        const row = inserted.rows[0]
        return { outcome: 'created', template: { id: row.id, driveFileId: row.drive_file_id, mimeType: row.mime_type } }
      })
    },

    async getSocialTemplate(id) {
      const result = await db.query(
        'SELECT id, drive_file_id, mime_type FROM social_brand_templates WHERE id = $1',
        [id],
      )
      const row = result.rows[0]
      return row ? { id: row.id, driveFileId: row.drive_file_id, mimeType: row.mime_type } : null
    },

    async removeSocialTemplate(id) {
      const result = await db.query(
        'DELETE FROM social_brand_templates WHERE id = $1 RETURNING drive_file_id',
        [id],
      )
      return result.rows[0]?.drive_file_id || null
    },

    async updateSocialSettings(settings, now) {
      const result = await db.query(
        `UPDATE social_brand_settings SET
           clinic_name = $1, primary_color = $2, secondary_color = $3,
           brand_voice = $4, default_language = $5, contact_phone = $6,
           address = $7, default_call_to_action = $8, default_hashtags = $9,
           required_disclaimer = $10, prohibited_phrases = $11,
           patient_posts_enabled = $12, minor_posts_enabled = $13,
           automatic_publishing_enabled = $14, daily_post_limit = $15,
           weekly_post_limit = $16, posting_start_hour = $17,
           posting_end_hour = $18, font_family = $19,
           caption_prompt = $20, image_prompt = $21,
           logo_drive_file_id = coalesce($22, logo_drive_file_id),
           logo_mime_type = coalesce($23, logo_mime_type), updated_at = $24
         WHERE id = 1 RETURNING *`,
        [
          settings.clinicName, settings.primaryColor, settings.secondaryColor,
          settings.brandVoice, settings.defaultLanguage, settings.contactPhone,
          settings.address, settings.defaultCallToAction, settings.defaultHashtags,
          settings.requiredDisclaimer, settings.prohibitedPhrases,
          settings.patientPostsEnabled, settings.minorPostsEnabled,
          settings.automaticPublishingEnabled, settings.dailyPostLimit,
          settings.weeklyPostLimit, settings.postingStartHour, settings.postingEndHour,
          settings.fontFamily, settings.captionPrompt, settings.imagePrompt,
          settings.logoDriveFileId, settings.logoMimeType, now,
        ],
      )
      return socialSettingsFromRow(result.rows[0])
    },

    async setSocialPageConnection({ pageId, pageName, encryptedAccessToken, staffId, now }) {
      await db.query(
        `INSERT INTO social_page_connections (
           id, page_id, page_name, encrypted_access_token, connection_status,
           connected_by_staff_id, connected_at, updated_at
         ) VALUES (1, $1, $2, $3, 'connected', $4, $5, $5)
         ON CONFLICT (clinic_id, id) DO UPDATE SET
           page_id = excluded.page_id, page_name = excluded.page_name,
           encrypted_access_token = excluded.encrypted_access_token,
           connection_status = 'connected', connected_by_staff_id = excluded.connected_by_staff_id,
           connected_at = excluded.connected_at, updated_at = excluded.updated_at`,
        [pageId, pageName, encryptedAccessToken, staffId, now],
      )
    },

    async disconnectSocialPage(now) {
      await db.query(
        `UPDATE social_page_connections
         SET encrypted_access_token = NULL, connection_status = 'disconnected', updated_at = $1
         WHERE id = 1`,
        [now],
      )
    },

    async createSocialPost({
      dentistId, staffId, patientId, contentType, description, image,
      idempotencyKey, consent, now,
    }) {
      return db.transaction(async (client) => {
        if (patientId) {
          const patient = await client.query(
            `SELECT p.id, p.display_name
             FROM patients p
             WHERE p.id = $1 AND EXISTS (
               SELECT 1 FROM appointments a
               WHERE a.patient_id = p.id AND a.dentist_id = $2
             )`,
            [patientId, dentistId],
          )
          if (!patient.rowCount) return { outcome: 'patient_not_found' }
        }
        const inserted = await client.query(
          `INSERT INTO social_posts (
             dentist_id, created_by_staff_id, patient_id, content_type,
             original_description, original_image_drive_file_id,
             original_image_mime_type, original_image_name, original_image_sha256,
             idempotency_key, confirmed_at, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $11)
           ON CONFLICT (idempotency_key) DO NOTHING
           RETURNING id`,
          [
            dentistId, staffId, patientId, contentType, description,
            image.driveFileId, image.mimeType, image.originalName, image.sha256,
            idempotencyKey, now,
          ],
        )
        if (!inserted.rowCount) {
          const existing = await client.query('SELECT id FROM social_posts WHERE idempotency_key = $1', [idempotencyKey])
          return { outcome: 'duplicate', id: existing.rows[0]?.id || null }
        }
        const id = inserted.rows[0].id
        if (consent) {
          await client.query(
            `INSERT INTO social_post_consents (
               social_post_id, patient_id, consent_evidence,
               covers_public_social_media, covers_ai_processing, subject_is_minor,
               guardian_name, granted_at, recorded_by_staff_id
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              id, patientId, consent.evidence, consent.coversPublicSocialMedia,
              consent.coversAiProcessing, consent.subjectIsMinor,
              consent.guardianName, consent.grantedAt, staffId,
            ],
          )
        }
        await client.query(
          `INSERT INTO social_post_events (
             social_post_id, event_type, new_status, actor_type, actor_id
           ) VALUES ($1, 'dentist_confirmed', 'confirmed', 'staff', $2)`,
          [id, staffId],
        )
        return { outcome: 'created', id }
      })
    },

    async listSocialPosts({ staffId = null, limit = 100 }) {
      const result = await db.query(
        `SELECT p.*, d.display_name AS dentist_name, patient.display_name AS patient_name
         FROM social_posts p
         JOIN dentists d ON d.id = p.dentist_id
         LEFT JOIN patients patient ON patient.id = p.patient_id
         WHERE ($1::uuid IS NULL OR p.created_by_staff_id = $1)
         ORDER BY p.created_at DESC LIMIT $2`,
        [staffId, limit],
      )
      return result.rows.map(socialPostFromRow)
    },

    async getSocialPostImage({ id, staffId = null }) {
      const result = await db.query(
        `SELECT coalesce(final_image_drive_file_id, original_image_drive_file_id) AS drive_file_id,
                coalesce(final_image_mime_type, original_image_mime_type) AS mime_type
         FROM social_posts
         WHERE id = $1 AND ($2::uuid IS NULL OR created_by_staff_id = $2)`,
        [id, staffId],
      )
      return result.rows[0] ? {
        driveFileId: result.rows[0].drive_file_id,
        mimeType: result.rows[0].mime_type,
      } : null
    },

    async claimNextSocialPost(now) {
      const claimed = await db.query(
        `WITH candidate AS (
           SELECT id FROM social_posts
           WHERE external_post_id IS NULL
             AND (
               (status = 'confirmed' AND (next_attempt_at IS NULL OR next_attempt_at <= $1))
               OR (status = 'failed' AND retry_count < 3 AND next_attempt_at <= $1)
               OR (status IN ('ai_processing', 'branding', 'automatic_validation') AND locked_at < $1 - interval '15 minutes')
             )
           ORDER BY created_at ASC
           FOR UPDATE SKIP LOCKED LIMIT 1
         )
         UPDATE social_posts p SET
           status = 'ai_processing', locked_at = $1,
           processing_started_at = coalesce(processing_started_at, $1), updated_at = $1
         FROM candidate WHERE p.id = candidate.id RETURNING p.id`,
        [now],
      )
      return claimed.rows[0]?.id || null
    },

    async getSocialPostForProcessing(id) {
      const result = await db.query(
        `SELECT p.*, p.id AS post_id, patient.display_name AS patient_name,
                s.*, c.page_id, c.page_name, c.encrypted_access_token,
                c.connection_status, consent.consent_evidence,
                consent.covers_public_social_media, consent.covers_ai_processing,
                consent.subject_is_minor, consent.guardian_name, consent.granted_at,
                coalesce((
                  SELECT jsonb_agg(jsonb_build_object(
                    'id', t.id, 'driveFileId', t.drive_file_id, 'mimeType', t.mime_type
                  ) ORDER BY t.created_at, t.id)
                  FROM social_brand_templates t WHERE t.settings_id = s.id
                ), '[]'::jsonb) AS template_images
         FROM social_posts p
         CROSS JOIN social_brand_settings s
         LEFT JOIN social_page_connections c ON c.id = 1
         LEFT JOIN social_post_consents consent ON consent.social_post_id = p.id
         LEFT JOIN patients patient ON patient.id = p.patient_id
         WHERE p.id = $1`,
        [id],
      )
      const row = result.rows[0]
      if (!row) return null
      return {
        id: row.post_id,
        contentType: row.content_type,
        description: row.original_description,
        patientId: row.patient_id,
        patientName: row.patient_name,
        originalImage: {
          driveFileId: row.original_image_drive_file_id,
          mimeType: row.original_image_mime_type,
        },
        settings: socialSettingsFromRow(row),
        connection: row.page_id ? {
          pageId: row.page_id,
          pageName: row.page_name,
          encryptedAccessToken: row.encrypted_access_token,
          status: row.connection_status,
        } : null,
        consent: row.consent_evidence ? {
          evidence: row.consent_evidence,
          coversPublicSocialMedia: row.covers_public_social_media,
          coversAiProcessing: row.covers_ai_processing,
          subjectIsMinor: row.subject_is_minor,
          guardianName: row.guardian_name,
          grantedAt: row.granted_at,
        } : null,
      }
    },

    async saveSocialPostGenerated({ id, caption, finalImage, now }) {
      await db.transaction(async (client) => {
        await client.query(
          `UPDATE social_posts SET generated_caption = $2,
             final_image_drive_file_id = $3, final_image_mime_type = $4,
             status = 'automatic_validation', blocking_reason = NULL, updated_at = $5
           WHERE id = $1`,
          [id, caption, finalImage.driveFileId, finalImage.mimeType, now],
        )
        await client.query(
          `INSERT INTO social_post_events (social_post_id, event_type, previous_status, new_status, actor_type)
           VALUES ($1, 'content_generated', 'ai_processing', 'automatic_validation', 'system')`,
          [id],
        )
      })
    },

    async canPublishSocialPost() {
      const result = await db.query(
        'SELECT automatic_publishing_enabled FROM social_brand_settings WHERE id = 1',
      )
      const row = result.rows[0]
      if (!row.automatic_publishing_enabled) return { allowed: false, reason: 'Automatic publishing is disabled by the super admin.' }
      return { allowed: true }
    },

    async markSocialPostPublishing(id, now) {
      await db.query(
        `UPDATE social_posts SET status = 'publishing', locked_at = $2, updated_at = $2 WHERE id = $1`,
        [id, now],
      )
    },

    async deferSocialPost(id, reason, retryAt, now) {
      await db.query(
        `UPDATE social_posts SET status = 'confirmed', blocking_reason = $2,
           next_attempt_at = $3, locked_at = NULL, updated_at = $4 WHERE id = $1`,
        [id, reason, retryAt, now],
      )
    },

    async markSocialPostPublished({ id, externalPostId, externalPostUrl, now }) {
      await db.transaction(async (client) => {
        await client.query(
          `UPDATE social_posts SET status = 'published', external_post_id = $2,
             external_post_url = $3, published_at = $4, locked_at = NULL,
             next_attempt_at = NULL, updated_at = $4 WHERE id = $1`,
          [id, externalPostId, externalPostUrl, now],
        )
        await client.query(
          `INSERT INTO social_post_events (social_post_id, event_type, previous_status, new_status, actor_type, details)
           VALUES ($1, 'facebook_published', 'publishing', 'published', 'provider', jsonb_build_object('externalPostId', $2::text))`,
          [id, externalPostId],
        )
      })
    },

    async markSocialPostBlocked(id, reason, now) {
      await db.query(
        `UPDATE social_posts SET status = 'blocked', blocking_reason = $2,
           locked_at = NULL, next_attempt_at = NULL, failed_at = $3, updated_at = $3
         WHERE id = $1`,
        [id, reason, now],
      )
      await db.query(
        `INSERT INTO social_post_events (social_post_id, event_type, new_status, actor_type, details)
         VALUES ($1, 'automatic_validation_blocked', 'blocked', 'system', jsonb_build_object('reason', $2::text))`,
        [id, reason],
      )
    },

    async markSocialPostFailed(id, reason, retryAt, now) {
      await db.query(
        `UPDATE social_posts SET status = 'failed', blocking_reason = $2,
           retry_count = retry_count + 1, next_attempt_at = $3,
           locked_at = NULL, failed_at = $4, updated_at = $4 WHERE id = $1`,
        [id, reason, retryAt, now],
      )
    },

    async retrySocialPost(id, now) {
      const result = await db.query(
        `UPDATE social_posts SET status = 'confirmed', blocking_reason = NULL,
           retry_count = 0, next_attempt_at = $2, locked_at = NULL,
           failed_at = NULL, updated_at = $2
         WHERE id = $1 AND status = 'failed' RETURNING id`,
        [id, now],
      )
      return Boolean(result.rowCount)
    },

    async markSocialPostRemoved(id, now) {
      const result = await db.query(
        `UPDATE social_posts SET status = 'removed', removed_at = $2, updated_at = $2
         WHERE id = $1 AND status = 'published' RETURNING id`,
        [id, now],
      )
      return Boolean(result.rowCount)
    },

    async getPublishedSocialPost(id) {
      const result = await db.query(
        `SELECT p.id, p.external_post_id, c.encrypted_access_token
         FROM social_posts p CROSS JOIN social_page_connections c
         WHERE p.id = $1 AND p.status = 'published' AND c.id = 1 AND c.connection_status = 'connected'`,
        [id],
      )
      return result.rows[0] ? {
        id: result.rows[0].id,
        externalPostId: result.rows[0].external_post_id,
        encryptedAccessToken: result.rows[0].encrypted_access_token,
      } : null
    },

    async updatePatientPhone(patientId, phoneE164, now) {
      const result = await db.query(
        `UPDATE patients
         SET phone_e164 = $2, phone_verified_at = NULL, updated_at = $3
         WHERE id = $1
         RETURNING phone_e164`,
        [patientId, phoneE164, now],
      )
      return result.rowCount ? result.rows[0].phone_e164 : null
    },

    async getDentistDashboard(dentistId, date, now) {
      const [todayResult, upcomingResult] = await Promise.all([db.query(
        `SELECT a.id, t.name AS type_name, a.starts_at, a.ends_at, a.status,
                p.id AS patient_id, p.display_name, p.patient_number,
                p.phone_e164, p.age, p.gender, p.weight_kg,
                p.blood_pressure_systolic, p.blood_pressure_diastolic,
                p.allergies, p.medical_conditions, p.current_medications,
                p.medical_history_reviewed_at
         FROM appointments a
         JOIN appointment_types t ON t.id = a.appointment_type_id
         JOIN patients p ON p.id = a.patient_id
         WHERE a.dentist_id = $1
           AND (a.starts_at AT TIME ZONE 'Asia/Manila')::date = $2::date
           AND a.status IN ('scheduled', 'confirmed')
           AND a.dentist_done_at IS NULL
         ORDER BY a.starts_at ASC`,
        [dentistId, date],
      ), db.query(
        `SELECT a.id, t.name AS type_name, a.starts_at, a.ends_at, a.status,
                p.id AS patient_id, p.display_name, p.patient_number,
                p.phone_e164, p.age, p.gender, p.weight_kg,
                p.blood_pressure_systolic, p.blood_pressure_diastolic,
                p.allergies, p.medical_conditions, p.current_medications,
                p.medical_history_reviewed_at
         FROM appointments a
         JOIN appointment_types t ON t.id = a.appointment_type_id
         JOIN patients p ON p.id = a.patient_id
         WHERE a.dentist_id = $1
           AND a.starts_at > $2
           AND (a.starts_at AT TIME ZONE 'Asia/Manila')::date > $3::date
           AND a.status IN ('scheduled', 'confirmed')
           AND a.dentist_done_at IS NULL
         ORDER BY a.starts_at ASC
         LIMIT 100`,
        [dentistId, now, date],
      )])
      const mapAppointment = (row) => ({
        id: row.id,
        typeName: row.type_name,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        status: row.status,
        patient: dentistPatientFromRow({ ...row, id: row.patient_id }),
      })
      return {
        appointments: todayResult.rows.map(mapAppointment),
        upcomingAppointments: upcomingResult.rows.map(mapAppointment),
      }
    },

    async searchDentistPatients(dentistId, query, now) {
      const result = await db.query(
        `SELECT p.id, p.display_name, p.patient_number, p.phone_e164, p.age, p.gender,
                p.weight_kg, p.blood_pressure_systolic, p.blood_pressure_diastolic,
                p.allergies, p.medical_conditions, p.current_medications,
                p.medical_history_reviewed_at
         FROM patients p
         WHERE EXISTS (
             SELECT 1 FROM appointments a
             WHERE a.patient_id = p.id
               AND a.dentist_id = $1
               AND a.status IN ('scheduled', 'confirmed')
               AND a.dentist_done_at IS NULL
               AND (a.starts_at AT TIME ZONE 'Asia/Manila')::date <=
                   ($3::timestamptz AT TIME ZONE 'Asia/Manila')::date
           )
           AND (
             position(lower($2) in lower(p.display_name)) > 0
             OR position(upper($2) in p.patient_number) > 0
           )
         ORDER BY p.display_name ASC
         LIMIT 100`,
        [dentistId, query, now],
      )
      return result.rows.map(dentistPatientFromRow)
    },

    async searchDentistSocialPatients(dentistId, query) {
      const result = await db.query(
        `SELECT p.id, p.display_name, p.patient_number, p.phone_e164, p.age, p.gender,
                p.weight_kg, p.blood_pressure_systolic, p.blood_pressure_diastolic,
                p.allergies, p.medical_conditions, p.current_medications,
                p.medical_history_reviewed_at
         FROM patients p
         WHERE EXISTS (
           SELECT 1 FROM appointments a WHERE a.patient_id = p.id AND a.dentist_id = $1
         ) AND (
           position(lower($2) in lower(p.display_name)) > 0
           OR position(upper($2) in p.patient_number) > 0
         )
         ORDER BY p.display_name ASC LIMIT 100`,
        [dentistId, query],
      )
      return result.rows.map(dentistPatientFromRow)
    },

    async getDentistPatient(dentistId, patientId, now = new Date()) {
      const patientResult = await db.query(
        `SELECT p.id, p.display_name, p.patient_number, p.phone_e164, p.age, p.gender,
                p.weight_kg, p.blood_pressure_systolic, p.blood_pressure_diastolic,
                p.allergies, p.medical_conditions, p.current_medications,
                p.medical_history_reviewed_at
         FROM patients p
         WHERE p.id = $2
           AND (
             EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = p.id AND a.dentist_id = $1)
             OR EXISTS (SELECT 1 FROM clinical_records r WHERE r.patient_id = p.id AND r.dentist_id = $1)
             OR EXISTS (SELECT 1 FROM prescriptions rx WHERE rx.patient_id = p.id AND rx.dentist_id = $1)
             OR EXISTS (SELECT 1 FROM follow_up_recommendations f WHERE f.patient_id = p.id AND f.dentist_id = $1)
           )`,
        [dentistId, patientId],
      )
      if (!patientResult.rowCount) return null

      const [appointments, records, plans, prescriptions, followUps, services] = await Promise.all([
        db.query(
          `SELECT a.id, a.dentist_id, t.name AS type_name, a.starts_at, a.ends_at, a.status,
                  d.display_name AS dentist_name, a.patient_instructions,
                  a.dentist_done_at, a.proposed_fee_cents,
                  (a.dentist_id = $2
                    AND a.status IN ('scheduled', 'confirmed')
                    AND a.dentist_done_at IS NULL
                    AND (a.starts_at AT TIME ZONE 'Asia/Manila')::date <=
                        ($3::timestamptz AT TIME ZONE 'Asia/Manila')::date) AS can_complete
           FROM appointments a
           JOIN appointment_types t ON t.id = a.appointment_type_id
           JOIN dentists d ON d.id = a.dentist_id
          WHERE a.patient_id = $1
           ORDER BY a.starts_at DESC`,
          [patientId, dentistId, now],
        ),
        db.query(
          `SELECT r.id, r.appointment_id, r.procedure_name, r.treated_on,
                  r.patient_summary, d.display_name AS dentist_name
           FROM clinical_records r
           JOIN dentists d ON d.id = r.dentist_id
           WHERE r.patient_id = $1
           ORDER BY r.treated_on DESC, r.created_at DESC`,
          [patientId],
        ),
        db.query(
          `SELECT id, title, patient_summary, status, started_on,
                  recommended_interval_days, next_recommended_on
           FROM treatment_plans
           WHERE patient_id = $1
           ORDER BY updated_at DESC`,
          [patientId],
        ),
        db.query(
          `SELECT rx.id, rx.patient_id, d.display_name AS dentist_name,
                  rx.prescribed_on, rx.generic_name, rx.instructions,
                  rx.image_mime_type, rx.image_original_name,
                  rx.image_byte_size, rx.created_at
           FROM prescriptions rx
           JOIN dentists d ON d.id = rx.dentist_id
           WHERE rx.patient_id = $1
           ORDER BY rx.prescribed_on DESC, rx.created_at DESC`,
          [patientId],
        ),
        db.query(
          `SELECT f.id, f.patient_id, d.display_name AS dentist_name,
                  t.name AS service_name, f.recommended_on, f.notes,
                  f.status, f.created_at
           FROM follow_up_recommendations f
           JOIN dentists d ON d.id = f.dentist_id
           LEFT JOIN appointment_types t ON t.id = f.appointment_type_id
           WHERE f.patient_id = $1
           ORDER BY f.recommended_on DESC, f.created_at DESC`,
          [patientId],
        ),
        listServices(),
      ])
      const appointmentRows = appointments.rows
      const completionAppointment = appointmentRows.find((row) => row.can_complete)
      return {
        patient: dentistPatientFromRow(patientResult.rows[0]),
        appointments: appointmentRows.map(appointmentFromRow),
        completionAppointment: completionAppointment ? appointmentFromRow(completionAppointment) : null,
        records: records.rows.map(recordFromRow),
        treatmentPlans: plans.rows.map(treatmentPlanFromRow),
        prescriptions: prescriptions.rows.map(prescriptionFromRow),
        followUps: followUps.rows.map(followUpFromRow),
        services,
      }
    },

    async completeDentistVisit({
      appointmentId,
      patientId,
      dentistId,
      staffId,
      proposedFeeCents,
      prescription,
      followUp,
      now,
    }) {
      return db.transaction(async (client) => {
        const selected = await client.query(
          `SELECT id, patient_id
           FROM appointments
           WHERE id = $1
             AND patient_id = $2
             AND dentist_id = $3
             AND status IN ('scheduled', 'confirmed')
             AND dentist_done_at IS NULL
             AND (starts_at AT TIME ZONE 'Asia/Manila')::date <=
                 ($4::timestamptz AT TIME ZONE 'Asia/Manila')::date
           FOR UPDATE`,
          [appointmentId, patientId, dentistId, now],
        )
        if (!selected.rowCount) return { outcome: 'not_found' }

        if (followUp?.appointmentTypeId) {
          const service = await client.query('SELECT 1 FROM appointment_types WHERE id = $1', [followUp.appointmentTypeId])
          if (!service.rowCount) return { outcome: 'invalid_service' }
        }

        let followUpAppointmentId = null
        if (followUp) {
          const scheduled = await createConfirmedAppointment(client, {
            patientId,
            dentistId,
            appointmentTypeId: followUp.appointmentTypeId,
            startsAt: followUp.startsAt,
            patientInstructions: followUp.notes,
            now,
          })
          if (scheduled.outcome !== 'created') return scheduled
          followUpAppointmentId = scheduled.id
        }

        let prescriptionId = null
        if (prescription) {
          const inserted = await client.query(
            `INSERT INTO prescriptions (
               patient_id, dentist_id, appointment_id, created_by_staff_id,
               prescribed_on, generic_name, instructions, image_mime_type,
               image_original_name, image_byte_size, image_sha256, image_bytes,
               google_drive_file_id, created_at
             ) VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             RETURNING id`,
            [
              patientId, dentistId, appointmentId, staffId,
              prescription.prescribedOn, prescription.genericName, prescription.instructions,
              prescription.imageMimeType, prescription.imageOriginalName,
              prescription.imageByteSize, prescription.imageSha256,
              prescription.imageBytes, prescription.driveFileId || null, now,
            ],
          )
          prescriptionId = inserted.rows[0].id
        }

        await client.query(
          `UPDATE appointments
           SET dentist_done_at = $2,
               dentist_done_by_staff_id = $3,
               proposed_fee_cents = $4,
               updated_at = $2
           WHERE id = $1`,
          [appointmentId, now, staffId, proposedFeeCents],
        )
        return { outcome: 'completed', prescriptionId, followUpAppointmentId }
      })
    },

    async createDentistPrescription({
      dentistId,
      staffId,
      patientId,
      prescribedOn,
      genericName,
      instructions,
      imageMimeType,
      imageOriginalName,
      imageBytes,
      imageByteSize,
      driveFileId,
      imageSha256,
      now,
    }) {
      const result = await db.query(
        `INSERT INTO prescriptions (
           patient_id, dentist_id, created_by_staff_id, prescribed_on,
           generic_name, instructions, image_mime_type, image_original_name,
           image_byte_size, image_sha256, image_bytes, google_drive_file_id, created_at
         )
         SELECT p.id, $1, $2, $4::date, $5, $6, $7, $8, $9, $10, $11, $12, $13
         FROM patients p
         WHERE p.id = $3
           AND (
             EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = p.id AND a.dentist_id = $1)
             OR EXISTS (SELECT 1 FROM clinical_records r WHERE r.patient_id = p.id AND r.dentist_id = $1)
             OR EXISTS (SELECT 1 FROM prescriptions rx WHERE rx.patient_id = p.id AND rx.dentist_id = $1)
             OR EXISTS (SELECT 1 FROM follow_up_recommendations f WHERE f.patient_id = p.id AND f.dentist_id = $1)
           )
         RETURNING id`,
        [
          dentistId,
          staffId,
          patientId,
          prescribedOn,
          genericName,
          instructions,
          imageMimeType,
          imageOriginalName,
          imageByteSize,
          imageSha256,
          imageBytes,
          driveFileId || null,
          now,
        ],
      )
      return result.rowCount ? result.rows[0].id : null
    },

    async getDentistPrescriptionImage(dentistId, prescriptionId) {
      const result = await db.query(
        `SELECT rx.image_mime_type, rx.image_original_name, rx.image_bytes,
                rx.google_drive_file_id
         FROM prescriptions rx
         WHERE rx.id = $2
           AND (
             rx.dentist_id = $1
             OR EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = rx.patient_id AND a.dentist_id = $1)
             OR EXISTS (SELECT 1 FROM clinical_records r WHERE r.patient_id = rx.patient_id AND r.dentist_id = $1)
           )`,
        [dentistId, prescriptionId],
      )
      if (!result.rowCount) return null
      return {
        mimeType: result.rows[0].image_mime_type,
        originalName: result.rows[0].image_original_name,
        bytes: result.rows[0].image_bytes,
        driveFileId: result.rows[0].google_drive_file_id,
      }
    },

    async getPatientPrescriptionImage(patientId, prescriptionId) {
      const result = await db.query(
        `SELECT image_mime_type, image_original_name, image_bytes, google_drive_file_id
         FROM prescriptions
         WHERE id = $2 AND patient_id = $1`,
        [patientId, prescriptionId],
      )
      if (!result.rowCount) return null
      return {
        mimeType: result.rows[0].image_mime_type,
        originalName: result.rows[0].image_original_name,
        bytes: result.rows[0].image_bytes,
        driveFileId: result.rows[0].google_drive_file_id,
      }
    },

    async createDentistFollowUp({
      dentistId,
      patientId,
      appointmentTypeId,
      startsAt,
      notes,
      now,
    }) {
      const access = await db.query(
        `SELECT 1 FROM patients p
         WHERE p.id = $1
           AND (
             EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = p.id AND a.dentist_id = $2)
             OR EXISTS (SELECT 1 FROM clinical_records r WHERE r.patient_id = p.id AND r.dentist_id = $2)
             OR EXISTS (SELECT 1 FROM prescriptions rx WHERE rx.patient_id = p.id AND rx.dentist_id = $2)
             OR EXISTS (SELECT 1 FROM follow_up_recommendations f WHERE f.patient_id = p.id AND f.dentist_id = $2)
           )`,
        [patientId, dentistId],
      )
      if (!access.rowCount) return { outcome: 'not_found' }
      return createConfirmedAppointment(db, {
        patientId, dentistId, appointmentTypeId, startsAt, patientInstructions: notes, now,
      })
    },

    async listPatientBilling(patientId) {
      return loadCharges(db, 'c.patient_id = $1', [patientId], false, false)
    },

    async getReceptionDashboard(date) {
      const [pending, calendar] = await Promise.all([
        db.query(
          `SELECT count(*)::integer AS count
           FROM appointment_requests
           WHERE status = 'requested'`,
        ),
        this.listReceptionCalendar(date),
      ])
      return {
        pendingRequests: pending.rows[0].count,
        todayAppointments: calendar.appointments,
        todayRequests: calendar.appointmentRequests,
      }
    },

    async listReceptionRequests() {
      const result = await db.query(
        `SELECT r.id, r.appointment_type_id, t.name AS service_name,
                r.dentist_id, d.display_name AS dentist_name,
                r.requested_start_at, r.requested_end_at,
                r.preferred_date, r.time_preference, r.patient_note,
                r.status, r.clinic_note, r.created_at,
                p.display_name AS patient_name, p.patient_number,
                p.phone_e164, p.id AS patient_id
         FROM appointment_requests r
         JOIN appointment_types t ON t.id = r.appointment_type_id
         LEFT JOIN dentists d ON d.id = r.dentist_id
         JOIN patients p ON p.id = r.patient_id
         WHERE r.status = 'requested'
         ORDER BY r.created_at DESC
         LIMIT 100`,
      )
      return result.rows.map(receptionRequestFromRow)
    },

    async listReceptionCalendar(date) {
      const [appointments, requests] = await Promise.all([
        db.query(
          `SELECT a.id, t.name AS type_name, a.starts_at, a.ends_at, a.status,
                  d.id AS dentist_id, d.display_name AS dentist_name, p.id AS patient_id,
                  p.display_name AS patient_name, p.patient_number, p.phone_e164
           FROM appointments a
           JOIN appointment_types t ON t.id = a.appointment_type_id
           JOIN dentists d ON d.id = a.dentist_id
           JOIN patients p ON p.id = a.patient_id
           WHERE (a.starts_at AT TIME ZONE 'Asia/Manila')::date = $1::date
             AND a.status IN ('scheduled', 'confirmed', 'completed')
           ORDER BY a.starts_at ASC, d.display_name ASC`,
          [date],
        ),
        db.query(
          `SELECT r.id, r.appointment_type_id, t.name AS service_name,
                  r.dentist_id, d.display_name AS dentist_name,
                  r.requested_start_at, r.requested_end_at,
                  r.preferred_date, r.time_preference, r.patient_note,
                  r.status, r.clinic_note, r.created_at,
                  p.display_name AS patient_name, p.patient_number,
                  p.phone_e164, p.id AS patient_id
           FROM appointment_requests r
           JOIN appointment_types t ON t.id = r.appointment_type_id
           LEFT JOIN dentists d ON d.id = r.dentist_id
           JOIN patients p ON p.id = r.patient_id
           WHERE r.preferred_date = $1::date
             AND r.status = 'requested'
           ORDER BY r.requested_start_at ASC, r.created_at ASC`,
          [date],
        ),
      ])
      return {
        appointments: appointments.rows.map(receptionAppointmentFromRow),
        appointmentRequests: requests.rows.map(receptionRequestFromRow),
      }
    },

    async listActiveDentists() {
      const result = await db.query(
        `SELECT id, display_name
         FROM dentists d
         WHERE d.active = true
           AND EXISTS (
             SELECT 1 FROM staff_profiles s
             WHERE s.dentist_id = d.id AND s.role = 'dentist' AND s.active = true
           )
         ORDER BY d.display_name ASC`,
      )
      return result.rows.map((row) => ({ id: row.id, displayName: row.display_name }))
    },

    async createReceptionAppointment({ patientId, dentistId, appointmentTypeId, startsAt, now }) {
      return createConfirmedAppointment(db, { patientId, dentistId, appointmentTypeId, startsAt, now })
    },

    async listReceptionBilling(date) {
      const [appointments, charges, totals] = await Promise.all([
        db.query(
          `SELECT a.id, t.name AS type_name, a.starts_at, a.ends_at, a.status,
                  d.display_name AS dentist_name, p.id AS patient_id,
                  p.display_name AS patient_name, p.patient_number, p.phone_e164,
                  a.proposed_fee_cents
           FROM appointments a
           JOIN appointment_types t ON t.id = a.appointment_type_id
           JOIN dentists d ON d.id = a.dentist_id
           JOIN patients p ON p.id = a.patient_id
           LEFT JOIN patient_charges c ON c.appointment_id = a.id
           WHERE a.status IN ('scheduled', 'confirmed')
             AND a.dentist_done_at IS NOT NULL
             AND c.id IS NULL
           ORDER BY a.dentist_done_at ASC
           LIMIT 100`,
          [],
        ),
        loadCharges(db, 'true', [], true),
        db.query(
          `SELECT method, coalesce(sum(amount_cents), 0)::integer AS total_cents
           FROM patient_payments
           WHERE status = 'posted'
             AND (received_at AT TIME ZONE 'Asia/Manila')::date = $1::date
           GROUP BY method
           ORDER BY method`,
          [date],
        ),
      ])
      return {
        awaitingCheckout: appointments.rows.map(receptionAppointmentFromRow),
        charges,
        todayPayments: totals.rows.map((row) => ({
          method: row.method,
          totalCents: row.total_cents,
        })),
      }
    },

    async rescheduleReceptionAppointment({ id, dentistId, startsAt, now }) {
      try {
        return await db.transaction(async (client) => {
          const selected = await client.query(
            `SELECT id, patient_id, dentist_id, appointment_type_id, starts_at
             FROM appointments
             WHERE id = $1 AND status IN ('scheduled', 'confirmed')
             FOR UPDATE`,
            [id],
          )
          if (!selected.rowCount) return { outcome: 'not_found' }

          const updated = await client.query(
            `UPDATE appointments
             SET starts_at = $2::timestamptz,
                 ends_at = $2::timestamptz + interval '1 hour',
                 dentist_id = $4,
                 updated_at = $3
             WHERE id = $1
               AND $2::timestamptz > $3
               AND EXTRACT(ISODOW FROM $2::timestamptz AT TIME ZONE 'Asia/Manila') BETWEEN 1 AND 6
               AND ($2::timestamptz AT TIME ZONE 'Asia/Manila')::time >= time '09:00'
               AND ($2::timestamptz AT TIME ZONE 'Asia/Manila')::time < time '17:00'
               AND EXTRACT(MINUTE FROM $2::timestamptz AT TIME ZONE 'Asia/Manila') = 0
               AND EXTRACT(SECOND FROM $2::timestamptz AT TIME ZONE 'Asia/Manila') = 0
               AND EXISTS (
                 SELECT 1
                 FROM dentists d
                 JOIN staff_profiles s ON s.dentist_id = d.id
                 WHERE d.id = $4 AND d.active = true
                   AND s.role = 'dentist' AND s.active = true
               )
               AND NOT EXISTS (
                 SELECT 1 FROM appointments a
                 WHERE a.id <> $1
                   AND (a.dentist_id = $4 OR a.patient_id = $5)
                   AND a.status IN ('scheduled', 'confirmed')
                   AND a.starts_at < $2::timestamptz + interval '1 hour'
                   AND a.ends_at > $2::timestamptz
               )
               AND NOT EXISTS (
                 SELECT 1 FROM appointment_requests r
                 WHERE (r.dentist_id = $4 OR r.patient_id = $5)
                   AND r.status IN ('requested', 'confirmed')
                   AND r.requested_start_at < $2::timestamptz + interval '1 hour'
                   AND r.requested_end_at > $2::timestamptz
               )
             RETURNING id`,
            [id, startsAt, now, dentistId, selected.rows[0].patient_id],
          )
          if (!updated.rowCount) return { outcome: 'slot_unavailable' }
          await client.query(
            `UPDATE appointment_requests
               SET requested_start_at = $1::timestamptz,
                   requested_end_at = $1::timestamptz + interval '1 hour',
                   dentist_id = $3,
                   preferred_date = ($1::timestamptz AT TIME ZONE 'Asia/Manila')::date,
                   time_preference = CASE
                     WHEN EXTRACT(HOUR FROM $1::timestamptz AT TIME ZONE 'Asia/Manila') < 12
                     THEN 'morning' ELSE 'afternoon'
                   END,
                   updated_at = $2
               WHERE patient_id = $5
                 AND dentist_id = $4
                 AND appointment_type_id = $6
                 AND requested_start_at = $7
                 AND status = 'confirmed'`,
            [
              startsAt,
              now,
              dentistId,
              selected.rows[0].dentist_id,
              selected.rows[0].patient_id,
              selected.rows[0].appointment_type_id,
              selected.rows[0].starts_at,
            ],
          )
          return { outcome: 'updated' }
        })
      } catch (error) {
        if (error.code === '23505') return { outcome: 'slot_unavailable' }
        throw error
      }
    },

    async createPatientCheckout({
      appointmentId,
      staffId,
      description,
      subtotalCents,
      paymentMethod,
      paymentReference,
      now,
    }) {
      return db.transaction(async (client) => {
        const selected = await client.query(
          `SELECT id, patient_id
           FROM appointments
           WHERE id = $1
             AND status IN ('scheduled', 'confirmed')
             AND dentist_done_at IS NOT NULL
           FOR UPDATE`,
          [appointmentId],
        )
        if (!selected.rowCount) return { outcome: 'not_found' }
        if (subtotalCents <= 0) {
          return { outcome: 'invalid_amount' }
        }

        let inserted
        try {
          inserted = await client.query(
            `INSERT INTO patient_charges (
               appointment_id, patient_id, description, subtotal_cents,
               discount_cents, total_cents, invoice_reference,
               created_by_staff_id, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
             RETURNING id`,
            [
              appointmentId,
              selected.rows[0].patient_id,
              description,
              subtotalCents,
              0,
              subtotalCents,
              null,
              staffId,
              now,
            ],
          )
        } catch (error) {
          if (error.code === '23505') return { outcome: 'already_checked_out' }
          throw error
        }
        const chargeId = inserted.rows[0].id
        await client.query(
          `INSERT INTO patient_payments (
             charge_id, amount_cents, method, external_reference,
             recorded_by_staff_id, received_at
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [chargeId, subtotalCents, paymentMethod, paymentReference, staffId, now],
        )
        await updateChargeStatus(client, chargeId, now)
        await client.query(
          `UPDATE appointments SET status = 'completed', updated_at = $2 WHERE id = $1`,
          [appointmentId, now],
        )
        const [charge] = await loadCharges(client, 'c.id = $1', [chargeId], true)
        return { outcome: 'created', charge }
      })
    },

    async addPatientPayment({ chargeId, staffId, amountCents, method, reference, now }) {
      return db.transaction(async (client) => {
        const selected = await client.query(
          `SELECT id, total_cents
           FROM patient_charges
           WHERE id = $1
           FOR UPDATE`,
          [chargeId],
        )
        if (!selected.rowCount) return { outcome: 'not_found' }
        const charge = selected.rows[0]
        const paid = await client.query(
          `SELECT coalesce(sum(amount_cents), 0)::integer AS paid_cents
           FROM patient_payments
           WHERE charge_id = $1 AND status = 'posted'`,
          [chargeId],
        )
        if (amountCents > charge.total_cents - paid.rows[0].paid_cents) {
          return { outcome: 'amount_exceeds_balance' }
        }
        const inserted = await client.query(
          `INSERT INTO patient_payments (
             charge_id, amount_cents, method, external_reference,
             recorded_by_staff_id, received_at
           ) VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [chargeId, amountCents, method, reference, staffId, now],
        )
        await updateChargeStatus(client, chargeId, now)
        const [updated] = await loadCharges(client, 'c.id = $1', [chargeId], true)
        return { outcome: 'created', paymentId: inserted.rows[0].id, charge: updated }
      })
    },

    async voidPatientPayment({ paymentId, staffId, reason, now }) {
      return db.transaction(async (client) => {
        const selected = await client.query(
          `SELECT p.charge_id
           FROM patient_payments p
           JOIN patient_charges c ON c.id = p.charge_id
           WHERE p.id = $1 AND p.status = 'posted'
           FOR UPDATE OF c, p`,
          [paymentId],
        )
        if (!selected.rowCount) return { outcome: 'not_found' }
        await client.query(
          `UPDATE patient_payments
           SET status = 'voided', voided_by_staff_id = $2, voided_at = $3, void_reason = $4
           WHERE id = $1 AND status = 'posted'
          `,
          [paymentId, staffId, now, reason],
        )
        const chargeId = selected.rows[0].charge_id
        await updateChargeStatus(client, chargeId, now)
        const [charge] = await loadCharges(client, 'c.id = $1', [chargeId], true)
        return { outcome: 'voided', charge }
      })
    },

    async updateReceptionRequest({ id, action, clinicNote, now }) {
      return db.transaction(async (client) => {
        const selected = await client.query(
          `SELECT r.id, r.patient_id, r.dentist_id, r.appointment_type_id,
                  r.requested_start_at, r.requested_end_at
           FROM appointment_requests r
           WHERE r.id = $1 AND r.status = 'requested'
           FOR UPDATE`,
          [id],
        )
        const request = selected.rows[0]
        if (!request) return { outcome: 'not_found' }

        if (action === 'confirm') {
          const inserted = await client.query(
            `INSERT INTO appointments (
               patient_id, dentist_id, appointment_type_id, starts_at, ends_at,
               status, patient_instructions, created_at, updated_at
             )
             SELECT $1, $2, $3, $4::timestamptz, $5::timestamptz,
                    'confirmed', $6, $7::timestamptz, $7::timestamptz
             WHERE $4::timestamptz > $7::timestamptz
               AND NOT EXISTS (
                 SELECT 1 FROM appointments a
                 WHERE a.dentist_id = $2
                   AND a.status IN ('scheduled', 'confirmed')
                   AND a.starts_at < $5::timestamptz
                   AND a.ends_at > $4::timestamptz
               )
             ON CONFLICT (dentist_id, starts_at)
               WHERE status IN ('scheduled', 'confirmed')
               DO NOTHING
             RETURNING id`,
            [
              request.patient_id,
              request.dentist_id,
              request.appointment_type_id,
              request.requested_start_at,
              request.requested_end_at,
              clinicNote,
              now,
            ],
          )
          if (!inserted.rowCount) return { outcome: 'slot_unavailable' }
        }

        await client.query(
          `UPDATE appointment_requests
           SET status = $2, clinic_note = $3, updated_at = $4
           WHERE id = $1`,
          [id, action === 'confirm' ? 'confirmed' : 'declined', clinicNote, now],
        )
        return { outcome: 'updated' }
      })
    },

    async searchReceptionPatients(query) {
      const result = await db.query(
        `SELECT id, display_name, patient_number, phone_e164, age, gender,
                weight_kg, blood_pressure_systolic, blood_pressure_diastolic
         FROM patients
         WHERE (
             position(lower($1) in lower(display_name)) > 0
             OR position(upper($1) in patient_number) > 0
           )
         ORDER BY display_name ASC`,
        [query],
      )
      return result.rows.map((row) => ({
        id: row.id,
        displayName: row.display_name,
        patientNumber: row.patient_number,
        phone: row.phone_e164,
        age: row.age,
        gender: row.gender,
        weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
        bloodPressureSystolic: row.blood_pressure_systolic,
        bloodPressureDiastolic: row.blood_pressure_diastolic,
      }))
    },

    async updateReceptionPatient({
      id,
      displayName,
      normalizedName,
      phoneE164,
      age,
      gender,
      weightKg,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      now,
    }) {
      try {
        const result = await db.query(
          `UPDATE patients
           SET display_name = $2, normalized_name = $3, phone_e164 = $4,
               age = $5, gender = $6, weight_kg = $7,
               blood_pressure_systolic = $8, blood_pressure_diastolic = $9,
               updated_at = $10
           WHERE id = $1
           RETURNING id, display_name, patient_number, phone_e164, age, gender,
                     weight_kg, blood_pressure_systolic, blood_pressure_diastolic`,
          [
            id,
            displayName,
            normalizedName,
            phoneE164,
            age,
            gender,
            weightKg,
            bloodPressureSystolic,
            bloodPressureDiastolic,
            now,
          ],
        )
        if (!result.rowCount) return { outcome: 'not_found' }
        const row = result.rows[0]
        return {
          outcome: 'updated',
          patient: {
            id: row.id,
            displayName: row.display_name,
            patientNumber: row.patient_number,
            phone: row.phone_e164,
            age: row.age,
            gender: row.gender,
            weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
            bloodPressureSystolic: row.blood_pressure_systolic,
            bloodPressureDiastolic: row.blood_pressure_diastolic,
          },
        }
      } catch (error) {
        if (error.code === '23505') return { outcome: 'already_exists' }
        throw error
      }
    },

    async createReceptionPatient({
      displayName,
      normalizedName,
      phoneE164,
      age,
      gender,
      now,
    }) {
      return db.transaction(async (client) => {
        await client.query(`SELECT pg_advisory_xact_lock(hashtext('dental_portal.patient_number'))`)
        const existing = await client.query(
          `SELECT id, display_name, patient_number, phone_e164, age, gender
           FROM patients
           WHERE normalized_name = $1
           LIMIT 1`,
          [normalizedName],
        )
        if (existing.rowCount) return { outcome: 'already_exists' }

        try {
          const nextNumber = await client.query(
            `SELECT lpad((coalesce(max(
               CASE WHEN patient_number ~ '^[0-9]+$' THEN patient_number::bigint END
             ), 0) + 1)::text, 5, '0') AS patient_number
             FROM patients`,
          )
          const patientNumber = nextNumber.rows[0].patient_number
          const result = await client.query(
            `INSERT INTO patients (
               patient_number, display_name, normalized_name, phone_e164,
               phone_verified_at, portal_enabled, age, gender, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, NULL, true, $5, $6, $7, $7)
             RETURNING id, display_name, patient_number, phone_e164, age, gender`,
            [patientNumber, displayName, normalizedName, phoneE164, age, gender, now],
          )
          const row = result.rows[0]
          return {
            outcome: 'created',
            patient: {
              id: row.id,
              displayName: row.display_name,
              patientNumber: row.patient_number,
              phone: row.phone_e164,
              age: row.age,
              gender: row.gender,
            },
          }
        } catch (error) {
          if (error.code === '23505') return { outcome: 'already_exists' }
          throw error
        }
      })
    },

    async createAppointmentRequest({
      patientId,
      appointmentTypeId,
      dentistId,
      startsAt,
      patientNote,
      now,
    }) {
      const result = await db.query(
        `WITH selected AS (
           SELECT t.id AS appointment_type_id, d.id AS dentist_id
           FROM appointment_types t
           CROSS JOIN dentists d
           WHERE t.id = $2
             AND d.id = $3
             AND d.active = true
             AND EXISTS (
               SELECT 1 FROM staff_profiles s
               WHERE s.dentist_id = d.id AND s.role = 'dentist' AND s.active = true
             )
         ), inserted AS (
           INSERT INTO appointment_requests (
             patient_id, appointment_type_id, dentist_id,
             requested_start_at, requested_end_at, preferred_date,
             time_preference, patient_note, status, created_at, updated_at
           )
           SELECT $1, selected.appointment_type_id, selected.dentist_id,
                  $4::timestamptz, $4::timestamptz + interval '1 hour',
                  ($4::timestamptz AT TIME ZONE 'Asia/Manila')::date,
                  CASE
                    WHEN EXTRACT(HOUR FROM $4::timestamptz AT TIME ZONE 'Asia/Manila') < 12
                    THEN 'morning'
                    ELSE 'afternoon'
                  END,
                  $5, 'requested', $6, $6
           FROM selected
           WHERE $4::timestamptz > $6
             AND EXTRACT(ISODOW FROM $4::timestamptz AT TIME ZONE 'Asia/Manila') BETWEEN 1 AND 6
             AND ($4::timestamptz AT TIME ZONE 'Asia/Manila')::time >= time '09:00'
             AND ($4::timestamptz AT TIME ZONE 'Asia/Manila')::time < time '17:00'
             AND EXTRACT(MINUTE FROM $4::timestamptz AT TIME ZONE 'Asia/Manila') = 0
             AND EXTRACT(SECOND FROM $4::timestamptz AT TIME ZONE 'Asia/Manila') = 0
             AND NOT EXISTS (
               SELECT 1
               FROM appointments a
               WHERE a.dentist_id = selected.dentist_id
                 AND a.status IN ('scheduled', 'confirmed')
                 AND a.starts_at < $4::timestamptz + interval '1 hour'
                 AND a.ends_at > $4::timestamptz
             )
             AND NOT EXISTS (
               SELECT 1
               FROM appointment_requests r
               WHERE r.dentist_id = selected.dentist_id
                 AND r.status IN ('requested', 'confirmed')
                 AND r.requested_start_at < $4::timestamptz + interval '1 hour'
                 AND r.requested_end_at > $4::timestamptz
             )
           ON CONFLICT (dentist_id, requested_start_at)
             WHERE dentist_id IS NOT NULL AND status IN ('requested', 'confirmed')
             DO NOTHING
           RETURNING id, appointment_type_id, dentist_id,
                     requested_start_at, requested_end_at, preferred_date,
                     time_preference, patient_note, status, clinic_note, created_at
         )
         SELECT inserted.*, t.name AS service_name, d.display_name AS dentist_name
         FROM inserted
         JOIN appointment_types t ON t.id = inserted.appointment_type_id
         JOIN dentists d ON d.id = inserted.dentist_id`,
        [patientId, appointmentTypeId, dentistId, startsAt, patientNote, now],
      )
      return result.rowCount ? appointmentRequestFromRow(result.rows[0]) : null
    },

    async getAppointment(patientId, appointmentId) {
      const result = await db.query(
        `${appointmentSelect}
         WHERE a.id = $1 AND a.patient_id = $2`,
        [appointmentId, patientId],
      )
      return result.rowCount ? appointmentFromRow(result.rows[0]) : null
    },

    async getRecord(patientId, recordId) {
      const result = await db.query(
        `${recordSelect}
         WHERE r.id = $1
           AND r.patient_id = $2
           AND r.published_at IS NOT NULL`,
        [recordId, patientId],
      )
      return result.rowCount ? recordFromRow(result.rows[0]) : null
    },

    async getDashboard(patientId, now) {
      const [appointmentResult, plan, recordResult, services] = await Promise.all([
        db.query(
          `${appointmentSelect}
           WHERE a.patient_id = $1
             AND a.starts_at >= $2
             AND a.status IN ('scheduled', 'confirmed')
           ORDER BY a.starts_at ASC
           LIMIT 1`,
          [patientId, now],
        ),
        getTreatmentPlan(patientId),
        db.query(
          `${recordSelect}
           WHERE r.patient_id = $1
             AND r.published_at IS NOT NULL
           ORDER BY r.treated_on DESC, r.created_at DESC
           LIMIT 1`,
          [patientId],
        ),
        listServices(),
      ])
      return {
        nextAppointment: appointmentResult.rowCount
          ? appointmentFromRow(appointmentResult.rows[0])
          : null,
        treatmentPlan: plan,
        recentRecord: recordResult.rowCount ? recordFromRow(recordResult.rows[0]) : null,
        services,
      }
    },
  }
}
