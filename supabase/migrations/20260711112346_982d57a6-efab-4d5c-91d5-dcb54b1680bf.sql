
-- =========================================================================
-- Multi-tenant Part 2: add company_id + RESTRICTIVE isolation policy to
-- every operational table. RESTRICTIVE policies combine with existing
-- PERMISSIVE policies via AND, so we don't need to rewrite them.
-- =========================================================================

DO $$
DECLARE
  v_default_company uuid;
  v_tables text[] := ARRAY[
    'units','unit_settings','tutors','dogs','employees',
    'daycare_packages','daycare_stays','daycare_activities','daycare_feedings','daycare_medications',
    'boarding_stays','boarding_belongings','boarding_daily_logs','boarding_food','boarding_medications',
    'grooming_services','grooming_appointments','grooming_appointment_services','grooming_photos',
    'dog_allergies','dog_behavior','dog_behavior_history','dog_dewormings','dog_diet_restrictions',
    'dog_flea_treatments','dog_medical_history','dog_medications','dog_stories','dog_vaccines',
    'tutor_authorized_pickups','tutor_emergency_contacts',
    'financial_transactions','receipts','occurrences',
    'documents','document_templates','document_signatures',
    'tasks','training_courses','training_materials','training_progress',
    'chat_messages','internal_communications','internal_communication_attachments','internal_communication_reads',
    'arrival_notifications',
    'daily_reports','daily_report_entries','daily_report_media',
    'daily_schedule_items','daily_schedule_history','daily_schedule_participants','daily_schedule_photos'
  ];
  v_table text;
BEGIN
  SELECT id INTO v_default_company FROM public.companies ORDER BY created_at LIMIT 1;
  IF v_default_company IS NULL THEN
    RAISE EXCEPTION 'No company row found — Part 1 migration must run first';
  END IF;

  FOREACH v_table IN ARRAY v_tables LOOP
    -- 1) add column if missing
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE',
      v_table
    );
    -- 2) backfill existing rows
    EXECUTE format('UPDATE public.%I SET company_id = %L WHERE company_id IS NULL', v_table, v_default_company);
    -- 3) set NOT NULL and default to the seed company (safe temporary default so legacy inserts don't fail;
    --    trigger below overrides with current_company_id when a user is authenticated)
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN company_id SET DEFAULT %L', v_table, v_default_company);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN company_id SET NOT NULL', v_table);
    -- 4) index for policy performance
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(company_id)', v_table || '_company_id_idx', v_table);
  END LOOP;
END $$;

-- =========================================================================
-- Trigger: on INSERT, fill company_id from the caller's profile when the
-- app didn't provide one. Runs SECURITY DEFINER so it works from within
-- other SECURITY DEFINER triggers (e.g. trg_daycare_charge inserting into
-- financial_transactions).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_company_id_from_caller()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company uuid;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  -- current_company_id() reads profiles for auth.uid()
  SELECT public.current_company_id() INTO v_company;
  IF v_company IS NOT NULL THEN
    NEW.company_id := v_company;
  END IF;
  RETURN NEW;
END;
$function$;

-- Attach trigger + tenant-isolation RESTRICTIVE policy to every table
DO $$
DECLARE
  v_tables text[] := ARRAY[
    'units','unit_settings','tutors','dogs','employees',
    'daycare_packages','daycare_stays','daycare_activities','daycare_feedings','daycare_medications',
    'boarding_stays','boarding_belongings','boarding_daily_logs','boarding_food','boarding_medications',
    'grooming_services','grooming_appointments','grooming_appointment_services','grooming_photos',
    'dog_allergies','dog_behavior','dog_behavior_history','dog_dewormings','dog_diet_restrictions',
    'dog_flea_treatments','dog_medical_history','dog_medications','dog_stories','dog_vaccines',
    'tutor_authorized_pickups','tutor_emergency_contacts',
    'financial_transactions','receipts','occurrences',
    'documents','document_templates','document_signatures',
    'tasks','training_courses','training_materials','training_progress',
    'chat_messages','internal_communications','internal_communication_attachments','internal_communication_reads',
    'arrival_notifications',
    'daily_reports','daily_report_entries','daily_report_media',
    'daily_schedule_items','daily_schedule_history','daily_schedule_participants','daily_schedule_photos'
  ];
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    -- BEFORE INSERT trigger
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_company_id ON public.%I', v_table);
    EXECUTE format(
      'CREATE TRIGGER trg_set_company_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_caller()',
      v_table
    );

    -- RESTRICTIVE tenant isolation policy (combines with existing perm policies via AND)
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', v_table);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id())',
      v_table
    );
  END LOOP;
END $$;

-- =========================================================================
-- Also enforce the same isolation on profiles and user_roles reads:
-- a user should only see profiles/roles of their own company.
-- (Their own row is always visible via the base policies; this restricts
-- cross-tenant listing.)
-- =========================================================================
DROP POLICY IF EXISTS tenant_isolation ON public.profiles;
CREATE POLICY tenant_isolation ON public.profiles AS RESTRICTIVE FOR ALL TO authenticated
  USING (id = auth.uid() OR company_id = public.current_company_id())
  WITH CHECK (id = auth.uid() OR company_id = public.current_company_id());

DROP POLICY IF EXISTS tenant_isolation ON public.user_roles;
CREATE POLICY tenant_isolation ON public.user_roles AS RESTRICTIVE FOR ALL TO authenticated
  USING (user_id = auth.uid() OR company_id = public.current_company_id())
  WITH CHECK (user_id = auth.uid() OR company_id = public.current_company_id());
