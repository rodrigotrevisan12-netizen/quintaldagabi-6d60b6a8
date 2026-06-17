import { format } from "date-fns";

export type TemplateVars = {
  tutor?: { nome?: string | null; cpf?: string | null; endereco?: string | null; email?: string | null };
  cao?: { nome?: string | null; raca?: string | null; idade?: string | null };
  estadia?: {
    entrada?: string | null;
    saida?: string | null;
    valor_diaria?: string | number | null;
  };
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
};

export const DOCUMENT_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending_signature: "Aguardando assinatura",
  signed: "Assinado",
  cancelled: "Cancelado",
};

export function generatePdfFromText(title: string, body: string, signature?: { name: string; signedAt: string; method: string; image?: string }): Promise<Blob> {
  return import("jspdf").then(({ jsPDF }) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const width = doc.internal.pageSize.getWidth() - margin * 2;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, margin);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, width);
    let y = margin + 30;
    const pageHeight = doc.internal.pageSize.getHeight();
    for (const line of lines) {
      if (y > pageHeight - margin - 60) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 15;
    }

    if (signature) {
      if (y > pageHeight - margin - 120) {
        doc.addPage();
        y = margin;
      }
      y += 30;
      doc.setFont("helvetica", "bold");
      doc.text("Assinatura", margin, y);
      y += 18;
      doc.setFont("helvetica", "normal");
      if (signature.image && signature.image.startsWith("data:image")) {
        try {
          doc.addImage(signature.image, "PNG", margin, y, 180, 60);
          y += 70;
        } catch {
          // ignore
        }
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(16);
        doc.text(signature.name, margin, y + 20);
        y += 40;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`${signature.name} — assinado em ${signature.signedAt} (${signature.method})`, margin, y);
    }

    return doc.output("blob");
  });
}
