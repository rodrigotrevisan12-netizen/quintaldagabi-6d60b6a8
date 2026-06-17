
-- Enums
CREATE TYPE public.document_type AS ENUM (
  'contrato_creche',
  'contrato_hospedagem',
  'contrato_banho_tosa',
  'termo_responsabilidade',
  'autorizacao_imagem'
);

CREATE TYPE public.document_status AS ENUM ('draft', 'pending_signature', 'signed', 'cancelled');
CREATE TYPE public.signature_method AS ENUM ('typed', 'drawn');

-- Templates
CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.document_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_templates TO authenticated;
GRANT ALL ON public.document_templates TO service_role;

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates read staff" ON public.document_templates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY "templates write admin" ON public.document_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER document_templates_updated BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.document_type NOT NULL,
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  dog_id UUID REFERENCES public.dogs(id) ON DELETE SET NULL,
  reference_table TEXT,
  reference_id UUID,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status public.document_status NOT NULL DEFAULT 'draft',
  pdf_path TEXT,
  sign_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_by UUID REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX documents_tutor_idx ON public.documents(tutor_id);
CREATE INDEX documents_dog_idx ON public.documents(dog_id);
CREATE UNIQUE INDEX documents_sign_token_idx ON public.documents(sign_token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents staff all" ON public.documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY "documents tutor read own" ON public.documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tutors t WHERE t.id = documents.tutor_id AND t.user_id = auth.uid()));

CREATE POLICY "documents tutor sign own" ON public.documents FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tutors t WHERE t.id = documents.tutor_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tutors t WHERE t.id = documents.tutor_id AND t.user_id = auth.uid()));

CREATE TRIGGER documents_updated BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Signatures
CREATE TABLE public.document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  signer_user_id UUID REFERENCES auth.users(id),
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  method public.signature_method NOT NULL,
  signature_data TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX document_signatures_document_idx ON public.document_signatures(document_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_signatures TO authenticated;
GRANT ALL ON public.document_signatures TO service_role;

ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signatures staff all" ON public.document_signatures FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY "signatures tutor read own" ON public.document_signatures FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.tutors t ON t.id = d.tutor_id
    WHERE d.id = document_signatures.document_id AND t.user_id = auth.uid()
  ));

CREATE POLICY "signatures tutor insert own" ON public.document_signatures FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.tutors t ON t.id = d.tutor_id
    WHERE d.id = document_signatures.document_id AND t.user_id = auth.uid()
  ));

-- Seed templates
INSERT INTO public.document_templates (type, title, body) VALUES
('contrato_creche', 'Contrato de Creche',
'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CRECHE PARA CÃES

CONTRATANTE: {{tutor.nome}}, CPF {{tutor.cpf}}, residente em {{tutor.endereco}}.
CONTRATADA: Quintal da Gabi.

OBJETO: Prestação de serviços de creche diária para o cão {{cao.nome}}, raça {{cao.raca}}.

O contratante declara estar ciente das normas da creche e autoriza os procedimentos descritos.

Data: {{data.hoje}}'),

('contrato_hospedagem', 'Contrato de Hospedagem',
'CONTRATO DE HOSPEDAGEM CANINA

CONTRATANTE: {{tutor.nome}}, CPF {{tutor.cpf}}.
CONTRATADA: Quintal da Gabi.

OBJETO: Hospedagem do cão {{cao.nome}} no período de {{estadia.entrada}} a {{estadia.saida}}.

Valor da diária: R$ {{estadia.valor_diaria}}.

Data: {{data.hoje}}'),

('contrato_banho_tosa', 'Contrato de Banho e Tosa',
'CONTRATO DE SERVIÇOS DE BANHO E TOSA

CONTRATANTE: {{tutor.nome}}, CPF {{tutor.cpf}}.
CONTRATADA: Quintal da Gabi.

OBJETO: Serviços de banho e tosa para o cão {{cao.nome}}.

O contratante autoriza os procedimentos estéticos descritos.

Data: {{data.hoje}}'),

('termo_responsabilidade', 'Termo de Responsabilidade',
'TERMO DE RESPONSABILIDADE

Eu, {{tutor.nome}}, CPF {{tutor.cpf}}, declaro ser responsável pelo cão {{cao.nome}} e me responsabilizo por todas as informações prestadas sobre saúde, comportamento e vacinação.

Data: {{data.hoje}}'),

('autorizacao_imagem', 'Autorização de Uso de Imagem',
'AUTORIZAÇÃO DE USO DE IMAGEM

Eu, {{tutor.nome}}, CPF {{tutor.cpf}}, autorizo a Quintal da Gabi a utilizar fotos e vídeos do cão {{cao.nome}} em redes sociais e materiais de divulgação, sem fins comerciais lucrativos diretos.

Data: {{data.hoje}}');
