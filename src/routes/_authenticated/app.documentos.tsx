import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2, FileText, Download, X, PenLine } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  renderTemplate,
  DOCUMENT_TYPE_LABEL,
  DOCUMENT_STATUS_LABEL,
  generatePdfFromText,
} from "@/lib/document-templates";

export const Route = createFileRoute("/_authenticated/app/documentos")({
  head: () => ({ meta: [{ title: "Documentos — Quintal da Gabi" }] }),
  component: DocumentosPage,
});

type Doc = {
  id: string;
  type: string;
  title: string;
  body: string;
  status: string;
  tutor_id: string;
  dog_id: string | null;
  pdf_path: string | null;
  signed_at: string | null;
  created_at: string;
  tutor: { full_name: string } | null;
  dog: { name: string } | null;
};

function DocumentosPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [opened, setOpened] = useState<Doc | null>(null);

  const docsQuery = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id,type,title,body,status,tutor_id,dog_id,pdf_path,signed_at,created_at,tutor:tutors(full_name),dog:dogs(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Doc[];
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Documentos</h1>
          <p className="text-sm text-muted-foreground">Contratos, termos e autorizações com assinatura digital.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />Novo documento
        </Button>
      </header>

      <div className="rounded-2xl border border-border bg-card">
        {docsQuery.isLoading ? (
          <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (docsQuery.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum documento ainda. Clique em "Novo documento" para começar.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(docsQuery.data ?? []).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/40">
                <button onClick={() => setOpened(d)} className="flex flex-1 items-center gap-3 text-left">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{d.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.tutor?.full_name ?? "—"}
                      {d.dog?.name ? ` · ${d.dog.name}` : ""}
                      {" · "}
                      {format(new Date(d.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </button>
                <Badge variant={d.status === "signed" ? "default" : d.status === "cancelled" ? "destructive" : "secondary"}>
                  {DOCUMENT_STATUS_LABEL[d.status]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateDocumentSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(doc) => {
          setCreating(false);
          qc.invalidateQueries({ queryKey: ["documents"] });
          setOpened(doc);
        }}
      />

      <DocumentDetail doc={opened} onClose={() => setOpened(null)} onChanged={() => qc.invalidateQueries({ queryKey: ["documents"] })} />
    </div>
  );
}

function CreateDocumentSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (doc: Doc) => void;
}) {
  const [templateId, setTemplateId] = useState<string>("");
  const [tutorId, setTutorId] = useState<string>("");
  const [dogId, setDogId] = useState<string>("");
  const [valorDiaria, setValorDiaria] = useState<string>("");
  const [entrada, setEntrada] = useState<string>("");
  const [saida, setSaida] = useState<string>("");

  const templatesQuery = useQuery({
    queryKey: ["document_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("id,type,title,body")
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const tutorsQuery = useQuery({
    queryKey: ["tutors-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutors")
        .select("id,full_name,cpf,email,address_street,address_number,address_neighborhood,address_city,address_state")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const dogsQuery = useQuery({
    queryKey: ["dogs-by-tutor", tutorId],
    queryFn: async () => {
      const { data, error } = await supabase.from("dogs").select("id,name,breed").eq("tutor_id", tutorId).order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tutorId,
  });

  const create = useMutation({
    mutationFn: async () => {
      const tpl = templatesQuery.data?.find((t) => t.id === templateId);
      const tutor = tutorsQuery.data?.find((t) => t.id === tutorId);
      const dog = dogsQuery.data?.find((d) => d.id === dogId);
      if (!tpl || !tutor) throw new Error("Selecione modelo e tutor.");

      const endereco = [tutor.address_street, tutor.address_number, tutor.address_neighborhood, tutor.address_city, tutor.address_state]
        .filter(Boolean).join(", ");
      const body = renderTemplate(tpl.body, {
        tutor: { nome: tutor.full_name, cpf: tutor.cpf as string | null, endereco, email: tutor.email },
        cao: dog ? { nome: dog.name, raca: dog.breed as string | null } : undefined,
        estadia: { entrada, saida, valor_diaria: valorDiaria },
      });

      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("documents")
        .insert({
          type: tpl.type,
          template_id: tpl.id,
          tutor_id: tutorId,
          dog_id: dogId || null,
          title: tpl.title,
          body,
          status: "pending_signature",
          created_by: user.user?.id,
        })
        .select("id,type,title,body,status,tutor_id,dog_id,pdf_path,signed_at,created_at,tutor:tutors(full_name),dog:dogs(name)")
        .single();
      if (error) throw error;
      return data as unknown as Doc;
    },
    onSuccess: (doc) => {
      toast.success("Documento criado.");
      setTemplateId("");
      setTutorId("");
      setDogId("");
      setValorDiaria("");
      setEntrada("");
      setSaida("");
      onCreated(doc);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Novo documento</SheetTitle>
          <SheetDescription>Escolha o modelo, o tutor e (opcional) o cão.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(templatesQuery.data ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tutor</Label>
            <Select value={tutorId} onValueChange={(v) => { setTutorId(v); setDogId(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(tutorsQuery.data ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cão (opcional)</Label>
            <Select value={dogId} onValueChange={setDogId} disabled={!tutorId}>
              <SelectTrigger><SelectValue placeholder={tutorId ? "Selecione" : "Selecione um tutor primeiro"} /></SelectTrigger>
              <SelectContent>
                {(dogsQuery.data ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Entrada (estadia)</Label>
              <Input type="date" value={entrada} onChange={(e) => setEntrada(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Saída (estadia)</Label>
              <Input type="date" value={saida} onChange={(e) => setSaida(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Valor diária (R$)</Label>
            <Input type="number" step="0.01" value={valorDiaria} onChange={(e) => setValorDiaria(e.target.value)} />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !templateId || !tutorId}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function DocumentDetail({
  doc,
  onClose,
  onChanged,
}: {
  doc: Doc | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [signOpen, setSignOpen] = useState(false);

  const sigsQuery = useQuery({
    queryKey: ["doc-sigs", doc?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_signatures")
        .select("*")
        .eq("document_id", doc!.id)
        .order("signed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!doc,
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("documents")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", doc!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Documento cancelado."); onChanged(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function downloadPdf() {
    if (!doc) return;
    const sig = sigsQuery.data?.[0];
    const blob = await generatePdfFromText(doc.title, doc.body, sig
      ? {
          name: sig.signer_name,
          signedAt: format(new Date(sig.signed_at), "dd/MM/yyyy HH:mm"),
          method: sig.method === "drawn" ? "desenhada" : "digitada",
          image: sig.method === "drawn" ? sig.signature_data : undefined,
        }
      : undefined);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title.replace(/\s+/g, "_")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Sheet open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl">
        {doc && (
          <>
            <SheetHeader>
              <SheetTitle>{doc.title}</SheetTitle>
              <SheetDescription>
                {doc.tutor?.full_name} {doc.dog?.name ? `· ${doc.dog.name}` : ""}
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="documento" className="mt-4">
              <TabsList>
                <TabsTrigger value="documento">Documento</TabsTrigger>
                <TabsTrigger value="assinaturas">Assinaturas ({sigsQuery.data?.length ?? 0})</TabsTrigger>
              </TabsList>
              <TabsContent value="documento" className="mt-4">
                <div className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed">
                  {doc.body}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={downloadPdf}>
                    <Download className="mr-2 h-4 w-4" />Baixar PDF
                  </Button>
                  {doc.status !== "signed" && doc.status !== "cancelled" && (
                    <Button onClick={() => setSignOpen(true)}>
                      <PenLine className="mr-2 h-4 w-4" />Assinar
                    </Button>
                  )}
                  {doc.status !== "cancelled" && (
                    <Button variant="ghost" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                      <X className="mr-2 h-4 w-4" />Cancelar documento
                    </Button>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="assinaturas" className="mt-4 space-y-2">
                {(sigsQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem assinaturas ainda.</p>
                ) : (
                  (sigsQuery.data ?? []).map((s: any) => (
                    <div key={s.id} className="rounded-xl border border-border p-3 text-sm">
                      <p className="font-medium">{s.signer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(s.signed_at), "dd/MM/yyyy HH:mm")} · {s.method === "drawn" ? "desenhada" : "digitada"}
                        {s.ip_address ? ` · IP ${s.ip_address}` : ""}
                      </p>
                      {s.method === "drawn" && s.signature_data?.startsWith("data:image") && (
                        <img src={s.signature_data} alt="" className="mt-2 h-16 rounded border border-border bg-white" />
                      )}
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>

            <SignDialog
              open={signOpen}
              docId={doc.id}
              defaultName={doc.tutor?.full_name ?? ""}
              onClose={() => setSignOpen(false)}
              onSigned={() => {
                setSignOpen(false);
                onChanged();
                onClose();
              }}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SignDialog({
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
  function clearCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  }

  const sign = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Informe seu nome.");
      const method = tab;
      let data: string;
      if (method === "drawn") {
        const c = canvasRef.current!;
        data = c.toDataURL("image/png");
      } else {
        if (!typedSig.trim()) throw new Error("Digite a assinatura.");
        data = typedSig;
      }
      const { data: user } = await supabase.auth.getUser();
      const { error: sErr } = await supabase.from("document_signatures").insert({
        document_id: docId,
        signer_user_id: user.user?.id,
        signer_name: name,
        signer_email: user.user?.email,
        method,
        signature_data: data,
        user_agent: navigator.userAgent,
      });
      if (sErr) throw sErr;
      const { error: dErr } = await supabase
        .from("documents")
        .update({ status: "signed", signed_at: new Date().toISOString() })
        .eq("id", docId);
      if (dErr) throw dErr;
    },
    onSuccess: () => { toast.success("Documento assinado."); onSigned(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assinar documento</DialogTitle>
          <DialogDescription>Sua assinatura será registrada com data, hora e navegador.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => sign.mutate()} disabled={sign.isPending}>
            {sign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
