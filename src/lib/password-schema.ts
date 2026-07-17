import { z } from "zod";

/**
 * Regra de senha forte — usada sempre que uma senha está sendo CRIADA
 * (cadastro, redefinição). O login em si usa uma regra mais simples (só
 * tamanho mínimo), porque ali a senha já existe e não dá pra "forçar"
 * retroativamente uma regra nova em quem já tem conta.
 */
export const strongPasswordSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres")
  .max(72, "A senha não pode ter mais de 72 caracteres")
  .regex(/[a-z]/, "A senha precisa ter pelo menos uma letra minúscula")
  .regex(/[A-Z]/, "A senha precisa ter pelo menos uma letra maiúscula")
  .regex(/[0-9]/, "A senha precisa ter pelo menos um número");

export const PASSWORD_REQUIREMENTS_TEXT =
  "Mínimo de 8 caracteres, com letra maiúscula, letra minúscula e número.";
