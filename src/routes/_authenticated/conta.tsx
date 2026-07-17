import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, Loader2, KeyRound } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listTotpFactors, enrollTotp, confirmTotpEnrollment, unenrollTotp } from "@/lib/mfa";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({ meta: [{ title: "Segurança da conta — Central Pet" }] }),
  component: ContaSegurancaPage,
});

function ContaSegurancaPage() {
  const qc = useQueryClient();
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const factorsQuery = useQuery({
    queryKey: ["mfa-factors"],
    queryFn: listTotpFactors,
  });

  const hasFactor = (factorsQuery.data ?? []).length > 0;

  async function startEnroll() {
    try {
      const data = await enrollTotp();
      setEnrolling({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    } catch (e: any) {
      toast.error(e.message ?? "Não foi possível iniciar o cadastro.");
    }
  }

  async function handleConfirm() {
    if (!enrolling) return;
    if (code.trim().length !== 6) {
      toast.error("Digite o código de 6 dígitos do seu app autenticador.");
      return;
    }
    setConfirming(true);
    try {
      await confirmTotpEnrollment(enrolling.factorId, code.trim());
      toast.success("Verificação em duas etapas ativada!");
      setEnrolling(null);
      setCode("");
      qc.invalidateQueries({ queryKey: ["mfa-factors"] });
    } catch (e: any) {
      toast.error(e.message ?? "Código inválido. Tente novamente.");
    } finally {
      setConfirming(false);
    }
  }

  async function handleRemove() {
    if (!removingId) return;
    try {
      await unenrollTotp(removingId);
      toast.success("Verificação em duas etapas desativada.");
      setRemoveOpen(false);
      setRemovingId(null);
      qc.invalidateQueries({ queryKey: ["mfa-factors"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao desativar.");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <header>
        <h1 className="font-display text-2xl font-semibold">Segurança da conta</h1>
        <p className="text-sm text-muted-foreground">
          Ative a verificação em duas etapas para proteger sua conta mesmo se alguém descobrir sua senha.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasFactor ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
            Verificação em duas etapas (2FA)
          </CardTitle>
          <CardDescription>
            {hasFactor
              ? "Ativa. A cada login, além da senha, será pedido um código do seu app autenticador."
              : "Desativada. Use um app como Google Authenticator, Microsoft Authenticator ou Authy."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {factorsQuery.isLoading ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : hasFactor ? (
            <Button
              variant="destructive"
              onClick={() => {
                setRemovingId(factorsQuery.data![0].id);
                setRemoveOpen(true);
              }}
            >
              Desativar verificação em duas etapas
            </Button>
          ) : enrolling ? (
            <div className="space-y-4">
              <div className="flex justify-center rounded-lg border bg-white p-4">
                <div dangerouslySetInnerHTML={{ __html: enrolling.qrCode }} />
              </div>
              <p className="text-xs text-muted-foreground">
                Escaneie o QR code com seu app autenticador. Se não conseguir, digite este código manualmente:{" "}
                <code className="rounded bg-muted px-1 py-0.5">{enrolling.secret}</code>
              </p>
              <div>
                <Label htmlFor="mfa-code">Código de 6 dígitos</Label>
                <Input
                  id="mfa-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleConfirm} disabled={confirming}>
                  {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar e ativar
                </Button>
                <Button variant="ghost" onClick={() => { setEnrolling(null); setCode(""); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={startEnroll}>
              <KeyRound className="mr-2 h-4 w-4" />
              Ativar verificação em duas etapas
            </Button>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar verificação em duas etapas?</AlertDialogTitle>
            <AlertDialogDescription>
              Sua conta ficará protegida só pela senha. Recomendamos manter ativado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
