
-- 1) Storage policy: allow tutors to upload vaccine card photos to their own dogs' folder
CREATE POLICY "dogs tutor insert own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dogs'
  AND EXISTS (
    SELECT 1 FROM public.dogs d
    JOIN public.tutors t ON t.id = d.tutor_id
    WHERE t.user_id = auth.uid()
      AND (d.id)::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "dogs tutor read own folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'dogs'
  AND EXISTS (
    SELECT 1 FROM public.dogs d
    JOIN public.tutors t ON t.id = d.tutor_id
    WHERE t.user_id = auth.uid()
      AND (d.id)::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "dogs tutor update own folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dogs'
  AND EXISTS (
    SELECT 1 FROM public.dogs d
    JOIN public.tutors t ON t.id = d.tutor_id
    WHERE t.user_id = auth.uid()
      AND (d.id)::text = (storage.foldername(name))[1]
  )
);

-- 2) Rewrite daycare charge trigger to support packages + daily rate fallback
CREATE OR REPLACE FUNCTION public.trg_daycare_charge()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tutor uuid; v_dog_name text; v_unit uuid;
  v_pkg RECORD; v_month_start date; v_rate numeric;
  v_completed int; v_allowance int;
  v_pkg_ref uuid;
BEGIN
  IF NEW.check_out_at IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.check_out_at IS NOT NULL THEN RETURN NEW; END IF;

  v_unit := COALESCE(NEW.unit_id, public.default_unit_id());
  SELECT tutor_id, name, daycare_package_id INTO v_tutor, v_dog_name, v_pkg_ref FROM dogs WHERE id=NEW.dog_id;
  IF v_tutor IS NULL THEN RETURN NEW; END IF;

  v_month_start := date_trunc('month', NEW.check_out_at)::date;

  IF v_pkg_ref IS NOT NULL THEN
    SELECT * INTO v_pkg FROM daycare_packages WHERE id=v_pkg_ref;
    v_allowance := v_pkg.days_per_week * 4;

    -- deterministic id per (dog, month) for the monthly charge
    v_pkg_ref := md5(NEW.dog_id::text || '-' || to_char(v_month_start,'YYYY-MM'))::uuid;

    PERFORM public.upsert_service_charge(
      'daycare_monthly', v_pkg_ref, v_tutor, v_unit,
      'creche'::fin_revenue_category,
      'Mensalidade creche ' || to_char(v_month_start,'MM/YYYY') || ' — ' || COALESCE(v_dog_name,'cão') || ' (' || v_pkg.name || ')',
      v_pkg.monthly_price, (v_month_start + INTERVAL '10 days')::date
    );

    SELECT COUNT(*) INTO v_completed FROM daycare_stays
      WHERE dog_id=NEW.dog_id AND check_out_at IS NOT NULL
        AND date_trunc('month', check_out_at)::date = v_month_start;

    IF v_completed > v_allowance AND COALESCE(v_pkg.extra_day_price,0) > 0 THEN
      PERFORM public.upsert_service_charge(
        'daycare_extra', NEW.id, v_tutor, v_unit,
        'creche'::fin_revenue_category,
        'Diária extra creche — ' || COALESCE(v_dog_name,'cão') || ' (' || to_char(NEW.check_out_at,'DD/MM') || ')',
        v_pkg.extra_day_price, NEW.check_out_at::date
      );
    END IF;
  ELSE
    SELECT daycare_daily_rate INTO v_rate FROM unit_settings WHERE unit_id=v_unit LIMIT 1;
    IF v_rate IS NULL THEN
      SELECT daycare_daily_rate INTO v_rate FROM unit_settings LIMIT 1;
    END IF;
    IF v_rate IS NOT NULL AND v_rate > 0 THEN
      PERFORM public.upsert_service_charge(
        'daycare_stay', NEW.id, v_tutor, v_unit,
        'creche'::fin_revenue_category,
        'Creche — ' || COALESCE(v_dog_name,'cão') || ' (' || to_char(NEW.check_in_at,'DD/MM') || ')',
        v_rate, NEW.check_out_at::date
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- 3) Bind triggers (idempotent)
DROP TRIGGER IF EXISTS trg_daycare_charge_ai ON public.daycare_stays;
CREATE TRIGGER trg_daycare_charge_ai
AFTER INSERT OR UPDATE OF check_out_at ON public.daycare_stays
FOR EACH ROW EXECUTE FUNCTION public.trg_daycare_charge();

DROP TRIGGER IF EXISTS trg_boarding_charge_ai ON public.boarding_stays;
CREATE TRIGGER trg_boarding_charge_ai
AFTER INSERT OR UPDATE OF check_out_at, daily_rate ON public.boarding_stays
FOR EACH ROW EXECUTE FUNCTION public.trg_boarding_charge();

DROP TRIGGER IF EXISTS trg_grooming_charge_ai ON public.grooming_appointments;
CREATE TRIGGER trg_grooming_charge_ai
AFTER INSERT OR UPDATE OF status, total_price ON public.grooming_appointments
FOR EACH ROW EXECUTE FUNCTION public.trg_grooming_charge();

-- 4) Backfill: create charges for existing closed stays
UPDATE public.boarding_stays SET check_out_at = check_out_at WHERE check_out_at IS NOT NULL;
UPDATE public.daycare_stays  SET check_out_at = check_out_at WHERE check_out_at IS NOT NULL;
UPDATE public.grooming_appointments SET status = status WHERE status = 'done';
