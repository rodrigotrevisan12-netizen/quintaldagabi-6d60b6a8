-- ============================================================================
-- MULTIEMPRESA — FASE 1: FUNDAÇÃO
-- ============================================================================
-- O que esta migração faz:
--   1. Cria a tabela `companies` (empresa + identidade visual/white-label).
--   2. Cria a empresa padrão "Quintal da Gabi" e migra todos os dados
--      existentes para ela (nada é perdido).
--   3. Adiciona `company_id` às 22 tabelas "raiz" do sistema + profiles/user_roles.
--   4. Cria função `get_current_company_id()` — a empresa do usuário logado.
--   5. Cria trigger que preenche `company_id` sozinho em todo INSERT novo.
--   6. Cria políticas RESTRICTIVE de isolamento por empresa em todas as 55
--      tabelas de negócio — SEM tocar em nenhuma política existente.
--   7. Cria a função `create_company_and_admin()`, usada no fluxo de
--      "criar minha empresa" no primeiro acesso.
--
-- IMPORTANTE: aplique isso primeiro em um projeto Supabase de TESTE.
-- ============================================================================

-- ID fixo da empresa padrão, para conseguirmos referenciá-la em todas as
-- instruções abaixo sem precisar de variáveis de sessão.
-- 00000000-0000-0000-0000-000000000001

-- ============================================================================
-- 1) TABELA companies
-- ============================================================================
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#FF7F50',
  secondary_color TEXT NOT NULL DEFAULT '#FF9F43',
  accent_color TEXT NOT NULL DEFAULT '#FFCA3A',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Empresa padrão: é para onde todo o histórico atual (Quintal da Gabi) vai.
INSERT INTO public.companies (id, name, slug, primary_color, secondary_color, accent_color)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Quintal da Gabi',
  'quintal-da-gabi',
  '#FF7F50', '#FF9F43', '#FFCA3A'
);

-- ============================================================================
-- 2) company_id nas tabelas "raiz"
-- ============================================================================
-- Cada uma recebe a coluna, é migrada para a empresa padrão, e só então
-- vira NOT NULL — assim nenhum dado atual fica órfão no meio do processo.

DO $$
DECLARE
  root_tables TEXT[] := ARRAY[
    'units', 'dogs', 'tutors', 'employees', 'tasks', 'occurrences',
    'financial_transactions', 'documents', 'document_templates', 'dog_stories',
    'daily_reports', 'internal_communications', 'chat_messages',
    'training_courses', 'receipts', 'grooming_appointments', 'grooming_services',
    'boarding_stays', 'daycare_stays', 'arrival_notifications',
    'daycare_packages', 'daily_schedule_items'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY root_tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN company_id UUID REFERENCES public.companies(id)',
      t
    );
    EXECUTE format(
      'UPDATE public.%I SET company_id = %L WHERE company_id IS NULL',
      t, '00000000-0000-0000-0000-000000000001'
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN company_id SET NOT NULL',
      t
    );
    EXECUTE format(
      'CREATE INDEX idx_%s_company ON public.%I(company_id)',
      t, t
    );
  END LOOP;
END $$;

-- profiles e user_roles: aqui company_id fica opcional (NULL = "sem empresa
-- ainda", estado temporário entre o cadastro e a criação/vínculo da empresa).
ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.user_roles ADD COLUMN company_id UUID REFERENCES public.companies(id);

UPDATE public.profiles SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.user_roles SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

CREATE INDEX idx_profiles_company ON public.profiles(company_id);
CREATE INDEX idx_user_roles_company ON public.user_roles(company_id);

-- ============================================================================
-- 3) Funções auxiliares
-- ============================================================================

-- Empresa do usuário autenticado (NULL se ainda não tiver empresa).
CREATE OR REPLACE FUNCTION public.get_current_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Preenche company_id sozinho em todo INSERT novo, a partir do usuário logado.
CREATE OR REPLACE FUNCTION public.set_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := public.get_current_company_id();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  root_tables TEXT[] := ARRAY[
    'units', 'dogs', 'tutors', 'employees', 'tasks', 'occurrences',
    'financial_transactions', 'documents', 'document_templates', 'dog_stories',
    'daily_reports', 'internal_communications', 'chat_messages',
    'training_courses', 'receipts', 'grooming_appointments', 'grooming_services',
    'boarding_stays', 'daycare_stays', 'arrival_notifications',
    'daycare_packages', 'daily_schedule_items'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY root_tables LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_set_company BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_company_id()',
      t, t
    );
  END LOOP;
END $$;

-- ============================================================================
-- 4) Políticas RESTRICTIVE de isolamento — tabelas raiz
-- ============================================================================
-- Uma política RESTRICTIVE é combinada com "E" a todas as políticas
-- permissivas já existentes na tabela. Ou seja: isola por empresa sem
-- precisar reescrever nenhuma regra antiga de admin/funcionário/tutor.

DO $$
DECLARE
  root_tables TEXT[] := ARRAY[
    'units', 'dogs', 'tutors', 'employees', 'tasks', 'occurrences',
    'financial_transactions', 'documents', 'document_templates', 'dog_stories',
    'daily_reports', 'internal_communications', 'chat_messages',
    'training_courses', 'receipts', 'grooming_appointments', 'grooming_services',
    'boarding_stays', 'daycare_stays', 'arrival_notifications',
    'daycare_packages', 'daily_schedule_items'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY root_tables LOOP
    EXECUTE format(
      'CREATE POLICY "%s_company_isolation" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (company_id = public.get_current_company_id()) WITH CHECK (company_id = public.get_current_company_id())',
      t, t
    );
  END LOOP;
END $$;

-- profiles e user_roles: isolamento próprio (compara direto o id do usuário
-- e o company_id, sem depender de coluna company_id obrigatória).
CREATE POLICY "profiles_company_isolation" ON public.profiles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (id = auth.uid() OR company_id = public.get_current_company_id())
  WITH CHECK (id = auth.uid() OR company_id = public.get_current_company_id());

CREATE POLICY "user_roles_company_isolation" ON public.user_roles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (user_id = auth.uid() OR company_id = public.get_current_company_id())
  WITH CHECK (user_id = auth.uid() OR company_id = public.get_current_company_id());

-- companies: cada usuário só enxerga/edita a própria empresa.
CREATE POLICY "companies_read_own" ON public.companies
  FOR SELECT TO authenticated
  USING (id = public.get_current_company_id());

CREATE POLICY "companies_admin_update_own" ON public.companies
  FOR UPDATE TO authenticated
  USING (id = public.get_current_company_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = public.get_current_company_id() AND public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 5) Políticas RESTRICTIVE de isolamento — tabelas "filhas"
-- ============================================================================
-- Essas tabelas não recebem coluna company_id própria: o isolamento é
-- verificado pela tabela-mãe, via a chave estrangeira que já existe.

CREATE OR REPLACE FUNCTION public._child_policy(
  _table TEXT, _parent_table TEXT, _fk_column TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format(
    'CREATE POLICY "%s_company_isolation" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
       USING (EXISTS (SELECT 1 FROM public.%I p WHERE p.id = public.%I.%I AND p.company_id = public.get_current_company_id()))
       WITH CHECK (EXISTS (SELECT 1 FROM public.%I p WHERE p.id = public.%I.%I AND p.company_id = public.get_current_company_id()))',
    _table, _table, _parent_table, _table, _fk_column, _parent_table, _table, _fk_column
  );
END;
$$;

SELECT public._child_policy('dog_allergies', 'dogs', 'dog_id');
SELECT public._child_policy('dog_behavior', 'dogs', 'dog_id');
SELECT public._child_policy('dog_behavior_history', 'dogs', 'dog_id');
SELECT public._child_policy('dog_dewormings', 'dogs', 'dog_id');
SELECT public._child_policy('dog_diet_restrictions', 'dogs', 'dog_id');
SELECT public._child_policy('dog_flea_treatments', 'dogs', 'dog_id');
SELECT public._child_policy('dog_medical_history', 'dogs', 'dog_id');
SELECT public._child_policy('dog_medications', 'dogs', 'dog_id');
SELECT public._child_policy('dog_vaccines', 'dogs', 'dog_id');

SELECT public._child_policy('boarding_belongings', 'boarding_stays', 'stay_id');
SELECT public._child_policy('boarding_daily_logs', 'boarding_stays', 'stay_id');
SELECT public._child_policy('boarding_food', 'boarding_stays', 'stay_id');
SELECT public._child_policy('boarding_medications', 'boarding_stays', 'stay_id');

SELECT public._child_policy('daily_report_entries', 'daily_reports', 'report_id');
SELECT public._child_policy('daily_report_media', 'daily_reports', 'report_id');

SELECT public._child_policy('daily_schedule_history', 'daily_schedule_items', 'item_id');
SELECT public._child_policy('daily_schedule_participants', 'daily_schedule_items', 'item_id');
SELECT public._child_policy('daily_schedule_photos', 'daily_schedule_items', 'item_id');

SELECT public._child_policy('daycare_activities', 'daycare_stays', 'stay_id');
SELECT public._child_policy('daycare_feedings', 'daycare_stays', 'stay_id');
SELECT public._child_policy('daycare_medications', 'daycare_stays', 'stay_id');

SELECT public._child_policy('document_signatures', 'documents', 'document_id');

SELECT public._child_policy('grooming_appointment_services', 'grooming_appointments', 'appointment_id');
SELECT public._child_policy('grooming_photos', 'grooming_appointments', 'appointment_id');

SELECT public._child_policy('internal_communication_attachments', 'internal_communications', 'comm_id');
SELECT public._child_policy('internal_communication_reads', 'internal_communications', 'comm_id');

SELECT public._child_policy('tutor_authorized_pickups', 'tutors', 'tutor_id');
SELECT public._child_policy('tutor_emergency_contacts', 'tutors', 'tutor_id');

SELECT public._child_policy('unit_settings', 'units', 'unit_id');

SELECT public._child_policy('training_materials', 'training_courses', 'course_id');
SELECT public._child_policy('training_progress', 'training_courses', 'course_id');

DROP FUNCTION public._child_policy(TEXT, TEXT, TEXT);

-- ============================================================================
-- 6) Fluxo "criar minha empresa" (primeiro acesso de um novo administrador)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_company_and_admin(_name TEXT, _slug TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND company_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Este usuário já pertence a uma empresa.';
  END IF;

  INSERT INTO public.companies (name, slug) VALUES (_name, _slug)
  RETURNING id INTO _company_id;

  UPDATE public.profiles SET company_id = _company_id WHERE id = auth.uid();

  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (auth.uid(), 'admin', _company_id)
  ON CONFLICT (user_id, role, unit_id) DO UPDATE SET company_id = EXCLUDED.company_id;

  RETURN _company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_company_and_admin(TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 7) Ajusta o cadastro inicial (handle_new_user) para já nascer sem empresa
-- ============================================================================
-- Deixamos de atribuir automaticamente a empresa "Quintal da Gabi" para
-- novos cadastros: a partir de agora, todo mundo que se cadastra sozinho
-- (sem convite) precisa passar pelo fluxo de "criar minha empresa".
-- Quem é convidado (funcionário/tutor) já recebe company_id explicitamente
-- pelas server functions de convite (ver Fase 2).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
