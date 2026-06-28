
-- 1. unit_settings: add daycare_daily_rate
ALTER TABLE public.unit_settings
  ADD COLUMN IF NOT EXISTS daycare_daily_rate numeric(12,2);

-- 2. Fix trg_daycare_charge to use the new column
CREATE OR REPLACE FUNCTION public.trg_daycare_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tutor uuid; v_dog_name text; v_rate numeric; v_unit uuid;
BEGIN
  IF NEW.check_out_at IS NOT NULL THEN
    v_unit := COALESCE(NEW.unit_id, public.default_unit_id());
    SELECT daycare_daily_rate INTO v_rate
      FROM public.unit_settings
      WHERE unit_id = v_unit
      LIMIT 1;
    IF v_rate IS NULL OR v_rate <= 0 THEN RETURN NEW; END IF;

    SELECT tutor_id INTO v_tutor FROM public.dogs WHERE id = NEW.dog_id;
    SELECT name INTO v_dog_name FROM public.dogs WHERE id = NEW.dog_id;
    PERFORM public.upsert_service_charge(
      'daycare_stay', NEW.id, v_tutor, v_unit,
      'creche'::fin_revenue_category,
      'Creche — ' || COALESCE(v_dog_name, 'cão') || ' (' || to_char(NEW.check_in_at, 'DD/MM') || ')',
      v_rate, NEW.check_out_at::date
    );
  END IF;
  RETURN NEW;
END $$;

-- 3. employees: salary + work_schedule
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS salary numeric(12,2),
  ADD COLUMN IF NOT EXISTS work_schedule text;

-- 4. dog_vaccines: card photo + tutor manage own
ALTER TABLE public.dog_vaccines
  ADD COLUMN IF NOT EXISTS card_photo_url text;

DROP POLICY IF EXISTS "tutor manage own vaccines" ON public.dog_vaccines;
CREATE POLICY "tutor manage own vaccines" ON public.dog_vaccines
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id=d.tutor_id
                 WHERE d.id=dog_vaccines.dog_id AND t.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id=d.tutor_id
                      WHERE d.id=dog_vaccines.dog_id AND t.user_id=auth.uid()));

-- 5. financial_transactions: tutor read own
DROP POLICY IF EXISTS "tutor read own fin" ON public.financial_transactions;
CREATE POLICY "tutor read own fin" ON public.financial_transactions
  FOR SELECT TO authenticated
  USING (tutor_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tutors t WHERE t.id = financial_transactions.tutor_id AND t.user_id = auth.uid()
  ));

-- 6. receipts: tutor read own
DROP POLICY IF EXISTS "tutor read own receipts" ON public.receipts;
CREATE POLICY "tutor read own receipts" ON public.receipts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.financial_transactions f
    JOIN public.tutors t ON t.id = f.tutor_id
    WHERE f.id = receipts.transaction_id AND t.user_id = auth.uid()
  ));
