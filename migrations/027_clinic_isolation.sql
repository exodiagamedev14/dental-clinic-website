CREATE TABLE dental_portal.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 160),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- All pre-existing records stay together in the original clinic.
INSERT INTO dental_portal.clinics (id, name)
SELECT '00000000-0000-4000-8000-000000000001', clinic_name
FROM dental_portal.social_brand_settings WHERE id = 1;

REVOKE ALL ON dental_portal.clinics FROM PUBLIC;
GRANT SELECT ON dental_portal.clinics TO dental_portal_backend;
ALTER TABLE dental_portal.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_portal.clinics FORCE ROW LEVEL SECURITY;
CREATE POLICY clinic_directory ON dental_portal.clinics TO dental_portal_backend
  USING (id = nullif(current_setting('app.clinic_id', true), '')::uuid AND active);

DO $$
DECLARE
  table_name text;
  reference record;
  definition text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'patients', 'dentists', 'appointment_types', 'appointments',
    'treatment_plans', 'clinical_records', 'portal_sessions', 'audit_events',
    'appointment_requests', 'staff_profiles', 'staff_sessions',
    'patient_charges', 'patient_payments', 'prescriptions',
    'follow_up_recommendations', 'social_brand_settings', 'social_page_connections',
    'social_posts', 'social_post_consents', 'social_post_events', 'social_brand_templates'
  ] LOOP
    EXECUTE format('ALTER TABLE dental_portal.%I ADD COLUMN clinic_id uuid NOT NULL DEFAULT %L REFERENCES dental_portal.clinics(id)', table_name, '00000000-0000-4000-8000-000000000001');
    EXECUTE format('ALTER TABLE dental_portal.%I ALTER COLUMN clinic_id SET DEFAULT nullif(current_setting(''app.clinic_id'', true), '''')::uuid', table_name);
    EXECUTE format('ALTER TABLE dental_portal.%I ADD UNIQUE (clinic_id, id)', table_name);
    -- Restrictive policies also constrain every existing permissive policy.
    EXECUTE format('CREATE POLICY clinic_isolation ON dental_portal.%I AS RESTRICTIVE TO dental_portal_backend USING (clinic_id = nullif(current_setting(''app.clinic_id'', true), '''')::uuid AND EXISTS (SELECT 1 FROM dental_portal.clinics WHERE id = clinic_id AND active)) WITH CHECK (clinic_id = nullif(current_setting(''app.clinic_id'', true), '''')::uuid AND EXISTS (SELECT 1 FROM dental_portal.clinics WHERE id = clinic_id AND active))', table_name);
  END LOOP;

  -- A forged reference cannot attach another clinic's patient, staff, or image.
  FOR reference IN
    SELECT c.oid, c.conrelid::regclass AS relation, c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'f' AND n.nspname = 'dental_portal'
      AND EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = c.confrelid AND attname = 'clinic_id' AND NOT attisdropped)
  LOOP
    definition := replace(pg_get_constraintdef(reference.oid), 'FOREIGN KEY (', 'FOREIGN KEY (clinic_id, ');
    definition := regexp_replace(definition, 'REFERENCES ([^(]+)\(', 'REFERENCES \1(clinic_id, ');
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', reference.relation, reference.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', reference.relation, reference.conname, definition);
  END LOOP;
END $$;

ALTER TABLE dental_portal.patients DROP CONSTRAINT patients_patient_number_key,
  ADD UNIQUE (clinic_id, patient_number);
ALTER TABLE dental_portal.appointment_types DROP CONSTRAINT appointment_types_name_key,
  ADD UNIQUE (clinic_id, name);
ALTER TABLE dental_portal.staff_profiles DROP CONSTRAINT staff_profiles_email_key,
  ADD UNIQUE (clinic_id, email);
DROP INDEX dental_portal.staff_profiles_normalized_name_unique_idx;
CREATE UNIQUE INDEX staff_profiles_normalized_name_unique_idx
  ON dental_portal.staff_profiles (clinic_id, normalized_name);
ALTER TABLE dental_portal.social_brand_settings DROP CONSTRAINT social_brand_settings_pkey,
  ADD PRIMARY KEY (clinic_id, id);
ALTER TABLE dental_portal.social_page_connections DROP CONSTRAINT social_page_connections_pkey,
  ADD PRIMARY KEY (clinic_id, id);

-- The checkout trigger runs as its owner: carry and check the clinic explicitly.
CREATE OR REPLACE FUNCTION dental_portal.publish_checkout_record()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  INSERT INTO dental_portal.clinical_records (
    clinic_id, patient_id, dentist_id, appointment_id, procedure_name,
    treated_on, patient_summary, published_at, created_at, updated_at
  )
  SELECT NEW.clinic_id, a.patient_id, a.dentist_id, a.id, NEW.description,
    (a.starts_at AT TIME ZONE 'Asia/Manila')::date,
    NEW.description || ' was completed during your visit. Follow the care instructions provided by your dentist and contact the clinic if you have questions.',
    NEW.created_at, NEW.created_at, NEW.created_at
  FROM dental_portal.appointments a
  WHERE a.id = NEW.appointment_id AND a.clinic_id = NEW.clinic_id
    AND NOT EXISTS (SELECT 1 FROM dental_portal.clinical_records r WHERE r.appointment_id = a.id AND r.clinic_id = NEW.clinic_id);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION dental_portal.publish_checkout_record() FROM PUBLIC;

-- Background publishing gets only workspace IDs, then uses normal scoped queries.
CREATE FUNCTION dental_portal.social_clinic_ids()
RETURNS TABLE(id uuid) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT c.id FROM dental_portal.clinics c
  WHERE c.active AND EXISTS (
    SELECT 1 FROM dental_portal.social_posts p WHERE p.clinic_id = c.id
      AND p.status IN ('confirmed', 'failed', 'ai_processing', 'branding', 'automatic_validation', 'publishing')
  );
$$;
REVOKE ALL ON FUNCTION dental_portal.social_clinic_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dental_portal.social_clinic_ids() TO dental_portal_backend;
