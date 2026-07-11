import { useSignedStorageUrl } from "@/hooks/use-signed-storage-url";

/** Miniatura clicável da carteira de vacinação (bucket privado `dogs`). */
export function VaccineCardThumb({ value }: { value: string | null | undefined }) {
  const { data: url } = useSignedStorageUrl("dogs", value);
  if (!value || !url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
      <img src={url} alt="carteira de vacinação" className="h-14 w-14 rounded-md border object-cover" />
    </a>
  );
}

/** Link de texto para abrir a carteira de vacinação. */
export function VaccineCardLink({
  value,
  children,
  className,
}: {
  value: string | null | undefined;
  children: React.ReactNode;
  className?: string;
}) {
  const { data: url } = useSignedStorageUrl("dogs", value);
  if (!value || !url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}
