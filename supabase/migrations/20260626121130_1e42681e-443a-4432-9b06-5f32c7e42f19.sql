
-- signer_role enum + column
DO $$ BEGIN
  CREATE TYPE public.signer_role AS ENUM ('admin','tutor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.document_signatures
  ADD COLUMN IF NOT EXISTS signer_role public.signer_role;

UPDATE public.document_signatures SET signer_role = 'admin' WHERE signer_role IS NULL;
ALTER TABLE public.document_signatures ALTER COLUMN signer_role SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS document_signatures_role_unique
  ON public.document_signatures (document_id, signer_role);

-- Tighten policies
DROP POLICY IF EXISTS "signatures staff all" ON public.document_signatures;
DROP POLICY IF EXISTS "signatures staff read" ON public.document_signatures;
DROP POLICY IF EXISTS "signatures admin insert" ON public.document_signatures;
DROP POLICY IF EXISTS "signatures tutor insert own" ON public.document_signatures;
DROP POLICY IF EXISTS "signatures tutor read own" ON public.document_signatures;

CREATE POLICY "signatures staff read" ON public.document_signatures
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));

CREATE POLICY "signatures admin insert" ON public.document_signatures
  FOR INSERT TO authenticated
  WITH CHECK (
    signer_role = 'admin'
    AND public.has_role(auth.uid(),'admin')
    AND signer_user_id = auth.uid()
  );

CREATE POLICY "signatures tutor insert own" ON public.document_signatures
  FOR INSERT TO authenticated
  WITH CHECK (
    signer_role = 'tutor'
    AND signer_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.tutors t ON t.id = d.tutor_id
      WHERE d.id = document_signatures.document_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "signatures tutor read own" ON public.document_signatures
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.tutors t ON t.id = d.tutor_id
      WHERE d.id = document_signatures.document_id
        AND t.user_id = auth.uid()
    )
  );

-- Auto status when both signatures present
CREATE OR REPLACE FUNCTION public.trg_doc_signature_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  SELECT count(DISTINCT signer_role) INTO n
    FROM public.document_signatures
   WHERE document_id = NEW.document_id;
  IF n >= 2 THEN
    UPDATE public.documents
       SET status = 'signed', signed_at = COALESCE(signed_at, now())
     WHERE id = NEW.document_id
       AND status <> 'cancelled';
  ELSE
    UPDATE public.documents
       SET status = 'pending_signature'
     WHERE id = NEW.document_id
       AND status NOT IN ('signed','cancelled');
  END IF;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.trg_doc_signature_complete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS doc_signature_complete ON public.document_signatures;
CREATE TRIGGER doc_signature_complete
AFTER INSERT ON public.document_signatures
FOR EACH ROW EXECUTE FUNCTION public.trg_doc_signature_complete();

-- Tutor self-service: grooming appointments
DROP POLICY IF EXISTS "ga tutor insert own" ON public.grooming_appointments;
CREATE POLICY "ga tutor insert own" ON public.grooming_appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dogs d
      JOIN public.tutors t ON t.id = d.tutor_id
      WHERE d.id = grooming_appointments.dog_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "gas tutor insert own" ON public.grooming_appointment_services;
CREATE POLICY "gas tutor insert own" ON public.grooming_appointment_services
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.grooming_appointments a
      JOIN public.dogs d ON d.id = a.dog_id
      JOIN public.tutors t ON t.id = d.tutor_id
      WHERE a.id = grooming_appointment_services.appointment_id
        AND t.user_id = auth.uid()
    )
  );

-- Default templates
INSERT INTO public.document_templates (type, title, body, is_active)
SELECT 'autorizacao_imagem'::document_type,
       'Autorização de Uso de Imagem',
$$AUTORIZAÇÃO DE USO DE IMAGEM

Eu, {{tutor.nome}}, CPF {{tutor.cpf}}, residente em {{tutor.endereco}}, na qualidade de tutor(a) do(a) cão {{cao.nome}} ({{cao.raca}}), AUTORIZO a Central Pet a captar, utilizar e divulgar imagens, vídeos e áudios do meu pet, com finalidade institucional, promocional, em redes sociais, materiais impressos e digitais, sem qualquer ônus ou contraprestação.

Esta autorização é concedida em caráter gratuito, por prazo indeterminado, podendo ser revogada por escrito a qualquer momento.

{{data.hoje}}$$,
       true
WHERE NOT EXISTS (SELECT 1 FROM public.document_templates WHERE type = 'autorizacao_imagem');

INSERT INTO public.document_templates (type, title, body, is_active)
SELECT 'autorizacao_atendimento_veterinario'::document_type,
       'Autorização para Atendimento Veterinário Emergencial',
$$AUTORIZAÇÃO PARA ATENDIMENTO VETERINÁRIO EMERGENCIAL

Eu, {{tutor.nome}}, CPF {{tutor.cpf}}, residente em {{tutor.endereco}}, tutor(a) do(a) cão {{cao.nome}} ({{cao.raca}}), AUTORIZO a equipe da Central Pet a, em caso de emergência médica e impossibilidade de contato comigo em tempo hábil:

1. Conduzir meu pet à clínica veterinária mais próxima ou de minha preferência;
2. Autorizar exames, procedimentos clínicos e cirúrgicos considerados imprescindíveis pelo médico veterinário;
3. Adiantar despesas relacionadas, que serão por mim reembolsadas mediante apresentação de comprovantes.

Declaro que a equipe envidará todos os esforços para localizar-me previamente, e que esta autorização visa exclusivamente preservar a vida e a saúde do animal.

{{data.hoje}}$$,
       true
WHERE NOT EXISTS (SELECT 1 FROM public.document_templates WHERE type = 'autorizacao_atendimento_veterinario');

INSERT INTO public.document_templates (type, title, body, is_active)
SELECT 'autorizacao_medicamentos'::document_type,
       'Autorização para Administração de Medicamentos',
$$AUTORIZAÇÃO PARA ADMINISTRAÇÃO DE MEDICAMENTOS

Eu, {{tutor.nome}}, CPF {{tutor.cpf}}, tutor(a) do(a) cão {{cao.nome}} ({{cao.raca}}), AUTORIZO a equipe da Central Pet a administrar ao meu pet, durante sua permanência nas dependências da empresa, os medicamentos por mim fornecidos, conforme prescrição e orientações abaixo:

Medicamento(s): ________________________________________________
Dose / Via / Horário: ___________________________________________
Período: ________________________________________________________
Observações: ____________________________________________________

Declaro que os medicamentos estão dentro do prazo de validade, em embalagem identificada, e que assumo total responsabilidade por sua prescrição e indicação.

{{data.hoje}}$$,
       true
WHERE NOT EXISTS (SELECT 1 FROM public.document_templates WHERE type = 'autorizacao_medicamentos');
