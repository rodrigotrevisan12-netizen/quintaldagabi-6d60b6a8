
-- ESTOU CHEGANDO
CREATE TABLE public.arrival_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  dog_id UUID REFERENCES public.dogs(id) ON DELETE SET NULL,
  purpose TEXT NOT NULL DEFAULT 'pickup',
  eta_minutes INT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'on_the_way',
  arrived_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  unit_id UUID REFERENCES public.units(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arrival_notifications TO authenticated;
GRANT ALL ON public.arrival_notifications TO service_role;
ALTER TABLE public.arrival_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arrival access" ON public.arrival_notifications FOR ALL TO authenticated
  USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
         OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
         OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE TRIGGER trg_arrival_updated BEFORE UPDATE ON public.arrival_notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_arrival_status ON public.arrival_notifications(status, created_at DESC);

-- FUNCIONÁRIOS
DO $$ BEGIN
  CREATE TYPE employee_role AS ENUM ('tosador','banhista','recepcionista','cuidador','gerente','veterinario','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  job_role employee_role NOT NULL DEFAULT 'outro',
  phone TEXT,
  email TEXT,
  hired_at DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  unit_id UUID REFERENCES public.units(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage employees" ON public.employees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "employees read self" ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TREINAMENTO
DO $$ BEGIN
  CREATE TYPE training_material_type AS ENUM ('video','pdf','procedimento','checklist','foto','link');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_onboarding BOOLEAN NOT NULL DEFAULT false,
  required BOOLEAN NOT NULL DEFAULT false,
  order_index INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_courses TO authenticated;
GRANT ALL ON public.training_courses TO service_role;
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads courses" ON public.training_courses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "admins manage courses" ON public.training_courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON public.training_courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.training_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  material_type training_material_type NOT NULL,
  content TEXT,
  file_url TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_materials TO authenticated;
GRANT ALL ON public.training_materials TO service_role;
ALTER TABLE public.training_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads materials" ON public.training_materials FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "admins manage materials" ON public.training_materials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_materials_updated BEFORE UPDATE ON public.training_materials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  views INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  rating INT,
  feedback TEXT,
  certificate_issued BOOLEAN NOT NULL DEFAULT false,
  certificate_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_progress TO authenticated;
GRANT ALL ON public.training_progress TO service_role;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress or admin" ON public.training_progress FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_progress_updated BEFORE UPDATE ON public.training_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- COMUNICAÇÃO INTERNA
DO $$ BEGIN
  CREATE TYPE comm_type AS ENUM ('aviso','comunicado','solicitacao','ocorrencia','mensagem');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.internal_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comm_type comm_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_broadcast BOOLEAN NOT NULL DEFAULT false,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'aberto',
  unit_id UUID REFERENCES public.units(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_communications TO authenticated;
GRANT ALL ON public.internal_communications TO service_role;
ALTER TABLE public.internal_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads team comms" ON public.internal_communications FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR (public.has_role(auth.uid(),'funcionario')
        AND (is_broadcast OR recipient_id = auth.uid() OR author_id = auth.uid()))
  );
CREATE POLICY "team writes comms" ON public.internal_communications FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid()
              AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario')));
CREATE POLICY "author or admin updates" ON public.internal_communications FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "author or admin deletes" ON public.internal_communications FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_comm_updated BEFORE UPDATE ON public.internal_communications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_comm_created ON public.internal_communications(created_at DESC);
CREATE INDEX idx_comm_type ON public.internal_communications(comm_type);

CREATE TABLE public.internal_communication_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comm_id UUID NOT NULL REFERENCES public.internal_communications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comm_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_communication_reads TO authenticated;
GRANT ALL ON public.internal_communication_reads TO service_role;
ALTER TABLE public.internal_communication_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reads" ON public.internal_communication_reads FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid());

CREATE TABLE public.internal_communication_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comm_id UUID NOT NULL REFERENCES public.internal_communications(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_communication_attachments TO authenticated;
GRANT ALL ON public.internal_communication_attachments TO service_role;
ALTER TABLE public.internal_communication_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads attachments" ON public.internal_communication_attachments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "team writes attachments" ON public.internal_communication_attachments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "author or admin deletes attachments" ON public.internal_communication_attachments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin')
         OR comm_id IN (SELECT id FROM public.internal_communications WHERE author_id = auth.uid()));

-- STORAGE POLICIES (buckets já criados via tool)
CREATE POLICY "team reads training" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'training' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario')));
CREATE POLICY "admin writes training" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'training' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin updates training" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'training' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin deletes training" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'training' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "team reads comms bucket" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comms' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario')));
CREATE POLICY "team writes comms bucket" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comms' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario')));
CREATE POLICY "team deletes comms bucket" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'comms' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario')));
