
-- Onda 2: Financeiro integrado
-- 1) Auto-gera receita (pendente) quando serviço é concluído; baixa quando recebido
--    e link bidirecional via reference_type/reference_id.

-- Helper: tutor_id a partir de dog_id
CREATE OR REPLACE FUNCTION public.tutor_of_dog(_dog_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tutor_id FROM public.dogs WHERE id = _dog_id;
$$;

-- unit_id default (primeira ativa) — fallback para serviços sem unit_id explícito
CREATE OR REPLACE FUNCTION public.default_unit_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.units WHERE is_active = true ORDER BY created_at LIMIT 1;
$$;

-- Upsert de receita vinculada a um serviço
CREATE OR REPLACE FUNCTION public.upsert_service_charge(
  _ref_type text, _ref_id uuid, _tutor_id uuid, _unit_id uuid,
  _category fin_revenue_category, _description text, _amount numeric, _due date
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing_id uuid;
  existing_status fin_status;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RETURN; END IF;

  SELECT id, status INTO existing_id, existing_status
  FROM public.financial_transactions
  WHERE reference_type = _ref_type AND reference_id = _ref_id
  LIMIT 1;

  IF existing_id IS NULL THEN
    INSERT INTO public.financial_transactions
      (unit_id, kind, revenue_category, description, amount, due_date, status, tutor_id, reference_type, reference_id)
    VALUES
      (COALESCE(_unit_id, public.default_unit_id()), 'receita', _category, _description, _amount, _due, 'pendente', _tutor_id, _ref_type, _ref_id);
  ELSIF existing_status <> 'recebido' AND existing_status <> 'cancelado' THEN
    -- Atualiza valor/descrição enquanto ainda não foi quitado
    UPDATE public.financial_transactions
       SET amount = _amount, description = _description, tutor_id = _tutor_id,
           due_date = COALESCE(due_date, _due), updated_at = now()
     WHERE id = existing_id;
  END IF;
END $$;

-- ============ GROOMING ============
CREATE OR REPLACE FUNCTION public.trg_grooming_charge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tutor uuid; v_dog_name text; v_due date;
BEGIN
  -- Cria/atualiza cobrança apenas quando finalizado e com preço
  IF NEW.status = 'done' AND COALESCE(NEW.total_price, 0) > 0 THEN
    SELECT tutor_id INTO v_tutor FROM public.dogs WHERE id = NEW.dog_id;
    SELECT name INTO v_dog_name FROM public.dogs WHERE id = NEW.dog_id;
    v_due := COALESCE(NEW.finished_at::date, NEW.scheduled_at::date, CURRENT_DATE);
    PERFORM public.upsert_service_charge(
      'grooming_appointment', NEW.id, v_tutor, NULL,
      'banho_tosa'::fin_revenue_category,
      'Banho e tosa — ' || COALESCE(v_dog_name, 'cão'),
      NEW.total_price, v_due
    );
  ELSIF NEW.status = 'cancelled' OR NEW.status = 'no_show' THEN
    UPDATE public.financial_transactions
      SET status = 'cancelado', updated_at = now()
    WHERE reference_type = 'grooming_appointment' AND reference_id = NEW.id
      AND status NOT IN ('recebido','cancelado');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_grooming_charge ON public.grooming_appointments;
CREATE TRIGGER trg_grooming_charge
  AFTER INSERT OR UPDATE OF status, total_price ON public.grooming_appointments
  FOR EACH ROW EXECUTE FUNCTION public.trg_grooming_charge();

-- ============ BOARDING ============
CREATE OR REPLACE FUNCTION public.trg_boarding_charge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tutor uuid; v_dog_name text; v_nights int; v_total numeric;
BEGIN
  IF NEW.check_out_at IS NOT NULL AND COALESCE(NEW.daily_rate, 0) > 0 THEN
    v_nights := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (NEW.check_out_at - NEW.check_in_at))/86400.0)::int);
    v_total := NEW.daily_rate * v_nights;
    SELECT tutor_id INTO v_tutor FROM public.dogs WHERE id = NEW.dog_id;
    SELECT name INTO v_dog_name FROM public.dogs WHERE id = NEW.dog_id;
    PERFORM public.upsert_service_charge(
      'boarding_stay', NEW.id, v_tutor, NEW.unit_id,
      'hospedagem'::fin_revenue_category,
      'Hospedagem (' || v_nights || ' diárias) — ' || COALESCE(v_dog_name, 'cão'),
      v_total, NEW.check_out_at::date
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_boarding_charge ON public.boarding_stays;
CREATE TRIGGER trg_boarding_charge
  AFTER INSERT OR UPDATE OF check_out_at, daily_rate ON public.boarding_stays
  FOR EACH ROW EXECUTE FUNCTION public.trg_boarding_charge();

-- ============ DAYCARE ============
-- Daycare não tem preço próprio — busca diária em unit_settings (chave 'daycare_daily_rate')
CREATE OR REPLACE FUNCTION public.trg_daycare_charge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tutor uuid; v_dog_name text; v_rate numeric;
BEGIN
  IF NEW.check_out_at IS NOT NULL THEN
    SELECT (value)::numeric INTO v_rate
      FROM public.unit_settings
      WHERE unit_id = NEW.unit_id AND key = 'daycare_daily_rate'
      LIMIT 1;
    IF v_rate IS NULL OR v_rate <= 0 THEN RETURN NEW; END IF;

    SELECT tutor_id INTO v_tutor FROM public.dogs WHERE id = NEW.dog_id;
    SELECT name INTO v_dog_name FROM public.dogs WHERE id = NEW.dog_id;
    PERFORM public.upsert_service_charge(
      'daycare_stay', NEW.id, v_tutor, NEW.unit_id,
      'creche'::fin_revenue_category,
      'Creche — ' || COALESCE(v_dog_name, 'cão') || ' (' || to_char(NEW.check_in_at, 'DD/MM') || ')',
      v_rate, NEW.check_out_at::date
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_daycare_charge ON public.daycare_stays;
CREATE TRIGGER trg_daycare_charge
  AFTER INSERT OR UPDATE OF check_out_at ON public.daycare_stays
  FOR EACH ROW EXECUTE FUNCTION public.trg_daycare_charge();

-- ============ Visão de débitos por tutor ============
CREATE OR REPLACE VIEW public.v_tutor_balances AS
SELECT
  t.id AS tutor_id,
  t.full_name,
  COALESCE(SUM(CASE WHEN ft.status = 'pendente' OR ft.status = 'vencido' THEN ft.amount ELSE 0 END), 0)::numeric AS open_amount,
  COUNT(*) FILTER (WHERE ft.status IN ('pendente','vencido')) AS open_count,
  MAX(ft.due_date) FILTER (WHERE ft.status IN ('pendente','vencido')) AS last_due
FROM public.tutors t
LEFT JOIN public.financial_transactions ft
  ON ft.tutor_id = t.id AND ft.kind = 'receita'
GROUP BY t.id, t.full_name;

GRANT SELECT ON public.v_tutor_balances TO authenticated;
