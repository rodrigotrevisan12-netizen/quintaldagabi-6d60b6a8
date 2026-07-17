/**
 * Checagem de arquivo do lado do navegador — só para dar um aviso educado
 * e imediato ao usuário. A proteção "de verdade" está configurada direto
 * nos buckets do Supabase (file_size_limit / allowed_mime_types), que o
 * servidor aplica de qualquer forma, mesmo que essa checagem aqui seja
 * burlada ou pulada.
 */
export function validateFile(
  file: File,
  opts: { maxSizeMB: number; allowedTypes: string[] },
): string | null {
  if (!opts.allowedTypes.includes(file.type)) {
    return "Tipo de arquivo não permitido.";
  }
  const maxBytes = opts.maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `Arquivo muito grande (máximo ${opts.maxSizeMB}MB).`;
  }
  return null;
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const IMAGE_VIDEO_TYPES = [...IMAGE_TYPES, "video/mp4", "video/quicktime", "video/webm"];
export const ATTACHMENT_TYPES = [
  ...IMAGE_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
