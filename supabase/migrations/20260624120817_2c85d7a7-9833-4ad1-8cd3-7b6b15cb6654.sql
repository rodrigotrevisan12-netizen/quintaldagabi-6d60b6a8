ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_set_password boolean NOT NULL DEFAULT false;

-- Backfill: usuários cujo auth.user nunca fez sign-in e foram criados por admin podem ter must_set_password=true
-- Conservador: deixar false e marcar true só nas próximas criações via inviteEmployee/inviteTutor.

CREATE OR REPLACE FUNCTION public.clear_must_set_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quando o usuário define/atualiza a senha (encrypted_password muda), liberamos o acesso
  IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
    UPDATE public.profiles SET must_set_password = false WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_must_set_password ON auth.users;
CREATE TRIGGER trg_clear_must_set_password
AFTER UPDATE OF encrypted_password ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.clear_must_set_password();