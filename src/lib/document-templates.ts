import { format } from "date-fns";

export type TemplateVars = {
  tutor?: { nome?: string | null; cpf?: string | null; endereco?: string | null; email?: string | null };
  cao?: { nome?: string | null; raca?: string | null; idade?: string | null };
  estadia?: {
    entrada?: string | null;
    saida?: string | null;
    valor_diaria?: string | number | null;
  };
  pacote?: { nome?: string | null; valor?: string | number | null; descricao?: string | null };
  data?: { hoje?: string };
};

export function renderTemplate(body: string, vars: TemplateVars): string {
  const flat: Record<string, string> = {
    "tutor.nome": vars.tutor?.nome ?? "________",
    "tutor.cpf": vars.tutor?.cpf ?? "________",
    "tutor.endereco": vars.tutor?.endereco ?? "________",
    "tutor.email": vars.tutor?.email ?? "________",
    "cao.nome": vars.cao?.nome ?? "________",
    "cao.raca": vars.cao?.raca ?? "________",
    "cao.idade": vars.cao?.idade ?? "________",
    "estadia.entrada": vars.estadia?.entrada ?? "________",
    "estadia.saida": vars.estadia?.saida ?? "________",
    "estadia.valor_diaria": String(vars.estadia?.valor_diaria ?? "________"),
    "pacote.nome": vars.pacote?.nome ?? "________",
    "pacote.valor": String(vars.pacote?.valor ?? "________"),
    "pacote.descricao": vars.pacote?.descricao ?? "________",
    "data.hoje": vars.data?.hoje ?? format(new Date(), "dd/MM/yyyy"),
  };
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => flat[key] ?? `{{${key}}}`);
}

export const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  contrato_creche: "Contrato de Creche",
  contrato_hospedagem: "Contrato de Hospedagem",
  contrato_banho_tosa: "Contrato de Banho e Tosa",
  termo_responsabilidade: "Termo de Responsabilidade",
  autorizacao_imagem: "Autorização de Uso de Imagem",
  autorizacao_atendimento_veterinario: "Autorização — Atendimento Veterinário Emergencial",
  autorizacao_medicamentos: "Autorização — Administração de Medicamentos",
};

export const DOCUMENT_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending_signature: "Aguardando assinatura",
  signed: "Assinado",
  cancelled: "Cancelado",
};

export type SignatureBlock = {
  role: "admin" | "tutor";
  name: string;
  email?: string | null;
  signedAt: string;
  method: "typed" | "drawn";
  image?: string;
};

export function generatePdfFromText(
  title: string,
  body: string,
  signatures?: SignatureBlock[],
): Promise<Blob> {
  return import("jspdf").then(({ jsPDF }) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const width = pageWidth - margin * 2;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, margin);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, width);
    let y = margin + 30;
    const ensure = (need: number) => {
      if (y > pageHeight - margin - need) {
        doc.addPage();
        y = margin;
      }
    };
    for (const line of lines) {
      ensure(20);
      doc.text(line, margin, y);
      y += 15;
    }

    if (signatures && signatures.length) {
      ensure(80);
      y += 24;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Assinaturas", margin, y);
      y += 14;
      doc.setDrawColor(180);
      doc.line(margin, y, pageWidth - margin, y);
      y += 14;

      for (const sig of signatures) {
        ensure(110);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(
          sig.role === "admin" ? "EMPRESA (Central Pet)" : "TUTOR(A)",
          margin,
          y,
        );
        y += 14;
        if (sig.image && sig.image.startsWith("data:image")) {
          try { doc.addImage(sig.image, "PNG", margin, y, 160, 50); } catch { /* ignore */ }
          y += 56;
        } else {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(16);
          doc.text(sig.name, margin, y + 18);
          y += 34;
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`${sig.name}${sig.email ? ` — ${sig.email}` : ""}`, margin, y);
        y += 12;
        doc.text(
          `Assinado em ${sig.signedAt} (${sig.method === "drawn" ? "desenhada" : "digitada"})`,
          margin,
          y,
        );
        y += 18;
      }

      ensure(40);
      y += 6;
      doc.setDrawColor(180);
      doc.line(margin, y, pageWidth - margin, y);
      y += 14;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(110);
      const note =
        "Assinatura realizada eletronicamente através da plataforma Central Pet. " +
        "Cada parte foi autenticada pelo e-mail de acesso e pela data/hora registradas acima, " +
        "garantindo a validade e a rastreabilidade do documento.";
      const noteLines = doc.splitTextToSize(note, width);
      for (const l of noteLines) {
        ensure(14);
        doc.text(l, margin, y);
        y += 11;
      }
      doc.setTextColor(0);
    }

    return doc.output("blob");
  });
}
