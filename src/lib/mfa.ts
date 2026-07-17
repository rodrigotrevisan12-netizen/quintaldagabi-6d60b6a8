import { supabase } from "@/integrations/supabase/client";

/**
 * Verifica se, DEPOIS do login com senha, ainda falta confirmar um código
 * de dois fatores para liberar acesso total (AAL2). Se retornar true, a
 * tela de login precisa pedir o código antes de deixar a pessoa entrar.
 */
export async function needsMfaStepUp(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return false;
  return data.nextLevel === "aal2" && data.currentLevel !== "aal2";
}

/**
 * Lista o(s) fator(es) TOTP já cadastrados pra essa conta (normalmente 0 ou 1).
 */
export async function listTotpFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data.totp ?? [];
}

/**
 * Inicia o cadastro de um novo fator TOTP — devolve o QR code (SVG) e o
 * segredo, pra digitar manualmente caso o app não consiga ler o QR.
 */
export async function enrollTotp() {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) throw error;
  return data;
}

/**
 * Confirma o cadastro, validando o primeiro código gerado pelo app do
 * usuário. Só depois disso o fator fica realmente ativo.
 */
export async function confirmTotpEnrollment(factorId: string, code: string) {
  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr) throw challengeErr;
  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyErr) throw verifyErr;
}

/**
 * Usado na tela de login: depois da senha, valida o código de 6 dígitos
 * do app autenticador pra liberar a sessão completa (AAL2).
 */
export async function verifyLoginMfaCode(factorId: string, code: string) {
  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr) throw challengeErr;
  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyErr) throw verifyErr;
}

export async function unenrollTotp(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}
