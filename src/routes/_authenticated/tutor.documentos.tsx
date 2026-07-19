import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Download, PenLine, Loader2 } from "lucide-react";
import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DOCUMENT_TYPE_LABEL,
  DOCUMENT_STATUS_LABEL,
  generatePdfFromText,
  type SignatureBlock,
} from "@/lib/document-templates";

export const Route = createFileRoute("/_authenticated/tutor/documentos")({
  head: () => ({ meta: [{ title: "Contratos — Central Pet" }] }),
  component: Docs,
});

type TutorDoc = {
  id: string;
  type: string;
  title: string;
  body: string;
  status: string;
  tutor_id: string;
  created_at: string;
};

function Docs() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [opened, setOpened] = useState<TutorDoc | null>(null);

  const tutorQuery = useQuery({
    queryKey: ["tutor-record", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => {
      const { data } = await supabase.from("tutors").select("id, full_name").eq("user_id", me!.userId).maybeSingle();
      return data;
    },
  });

  const docsQuery = useQuery({
    queryKey: ["tutor-docs", tutorQuery.data?.id],
    enabled: !!tutorQuery.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id,type,title,body,status,tutor_id,created_at")
        .eq("tutor_id", tutorQuery.data!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TutorDoc[];
    },
  });

  const docs = docsQuery.data ?? [];
  const pending = docs.filter((d) => d.status === "pending_signature");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold">Contratos & Termos</h1>
        <p className="text-sm text-muted-foreground">Documentos enviados pela Central Pet.</p>
      </header>

      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          Você tem {pending.length} documento{pending.length > 1 ? "s" : ""} aguardando sua assinatura.
        </div>
      )}

      {!docs.length ? (
        <p className="text-sm text-muted-foreground">Nenhum documento.</p>
      ) : (
        docs.map((d) => (
          <Card key={d.id} className="cursor-pointer transition hover:bg-muted/40" onClick={() => setOpened(d)}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOCUMENT_TYPE_LABEL[d.type] ?? d.type} · {format(new Date(d.created_at), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>
              <Badge variant={d.status === "signed" ? "default" : d.status === "cancelled" ? "destructive" : "secondary"} className="shrink-0">
                {DOCUMENT_STATUS_LABEL[d.status] ?? d.status}
              </Badge>
            </CardContent>
          </Card>
        ))
      )}

      <TutorDocDetail
        doc={opened}
        tutorName={tutorQuery.data?.full_name ?? ""}
        onClose={() => setOpened(null)}
        onChanged={() => qc.invalidateQueries({ queryKey: ["tutor-docs"] })}
      />
    </div>
  );
}

function TutorDocDetail({
  doc,
  tutorName,
  onClose,
  onChanged,
}: {
  doc: TutorDoc | null;
  tutorName: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [signOpen, setSignOpen] = useState(false);

  const sigsQuery = useQuery({
    queryKey: ["tutor-doc-sigs", doc?.id],
    enabled: !!doc,
    queryFn: async () => {
      const { data } = await supabase
        .from("document_signatures")
        .select("*")
        .eq("document_id", doc!.id);
      return data ?? [];
    },
  });

  const tutorSigned = (sigsQuery.data ?? []).some((s: any) => s.signer_role === "tutor");
  const adminSigned = (sigsQuery.data ?? []).some((s: any) => s.signer_role === "admin");

  async function downloadPdf() {
    if (!doc) return;
    const blocks: SignatureBlock[] = (sigsQuery.data ?? []).map((s: any) => ({
      role: s.signer_role,
      name: s.signer_name,
      email: s.signer_email,
      signedAt: format(new Date(s.signed_at), "dd/MM/yyyy HH:mm"),
      method: s.method,
      image: s.method === "drawn" ? s.signature_data : undefined,
    }));
    const blob = await generatePdfFromText(doc.title, doc.body, blocks);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title.replace(/\s+/g, "_")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Sheet open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        {doc && (
          <>
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle>{doc.title}</SheetTitle>
              <SheetDescription>{DOCUMENT_TYPE_LABEL[doc.type] ?? doc.type}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="whitespace-pre-wrap rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed">
                {doc.body}
              </div>
              <div className="rounded-xl border p-3 text-xs text-muted-foreground space-y-1">
                <p>{adminSigned ? "✅ Assinado pela empresa" : "⌛ Aguardando assinatura da empresa"}</p>
                <p>{tutorSigned ? "✅ Assinado por você" : "⌛ Aguardando sua assinatura"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={downloadPdf}>
                  <Download className="mr-2 h-4 w-4" />Baixar PDF
                </Button>
                {doc.status === "pending_signature" && !tutorSigned && (
                  <Button onClick={() => setSignOpen(true)}>
                    <PenLine className="mr-2 h-4 w-4" />Assinar agora
                  </Button>
                )}
              </div>
            </div>
            <TutorSignDialog
              open={signOpen}
              docId={doc.id}
              defaultName={tutorName}
              onClose={() => setSignOpen(false)}
              onSigned={() => { setSignOpen(false); onChanged(); sigsQuery.refetch(); }}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TutorSignDialog({
  open,
  docId,
  defaultName,
  onClose,
  onSigned,
}: {
  open: boolean;
  docId: string;
  defaultName: string;
  onClose: () => void;
  onSigned: () => void;
}) {
  const [tab, setTab] = useState<"typed" | "drawn">("typed");
  const [name, setName] = useState(defaultName);
  const [typedSig, setTypedSig] = useState(defaultName);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const ctx = c.getContext("2d")!;
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    drawing.current = true;
  }
  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const ctx = c.getContext("2d")!;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  }
  function endDraw() { drawing.current = false; }
  function clearCanvas() { canvasRef.current?.getContext("2d")?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); }

  const sign = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Informe seu nome.");
      const method = tab;
      let data: string;
      if (method === "drawn") {
        data = canvasRef.current!.toDataURL("image/png");
      } else {
        if (!typedSig.trim()) throw new Error("Digite a assinatura.");
        data = typedSig;
      }
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("document_signatures").insert({
        document_id: docId,
        signer_user_id: user.user?.id,
        signer_role: "tutor",
        signer_name: name,
        signer_email: user.user?.email,
        method,
        signature_data: data,
        user_agent: navigator.userAgent,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Documento assinado."); onSigned(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Assinar documento</SheetTitle>
          <SheetDescription>
            Sua assinatura será registrada com seu nome, e-mail, data e hora — eletronicamente através da plataforma Central Pet.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 py-4">
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "typed" | "drawn")}>
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="typed">Digitar</TabsTrigger>
              <TabsTrigger className="flex-1" value="drawn">Desenhar</TabsTrigger>
            </TabsList>
            <TabsContent value="typed" className="mt-3">
              <Input value={typedSig} onChange={(e) => setTypedSig(e.target.value)} className="font-serif italic text-2xl h-16" />
            </TabsContent>
            <TabsContent value="drawn" className="mt-3 space-y-2">
              <canvas
                ref={canvasRef}
                width={520}
                height={140}
                className="w-full touch-none rounded-xl border border-border bg-white"
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
              />
              <Button type="button" variant="ghost" size="sm" onClick={clearCanvas}>Limpar</Button>
            </TabsContent>
          </Tabs>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => sign.mutate()} disabled={sign.isPending}>
            {sign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar assinatura
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
