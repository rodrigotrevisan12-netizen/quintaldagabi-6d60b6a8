import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/reembolso")({
  head: () => ({
    meta: [
      { title: "Política de Reembolso — Central Pet" },
      { name: "description", content: "Política de Reembolso da plataforma Central Pet." },
    ],
  }),
  component: ReembolsoPage,
});

function ReembolsoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <Link to="/" className="text-sm text-[#FF7F50] hover:underline">
        ← Voltar para a página inicial
      </Link>

      <h1 className="mb-2 mt-6 text-3xl font-extrabold text-gray-800">Política de Reembolso</h1>
      <p className="mb-8 text-sm text-gray-500">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

      <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-lg font-bold text-gray-800">1. Direito de arrependimento (primeira compra)</h2>
          <p>
            Em conformidade com o artigo 49 do Código de Defesa do Consumidor (Lei nº 8.078/1990), você tem o
            direito de cancelar sua assinatura e solicitar o <strong>reembolso integral</strong> em até{" "}
            <strong>7 (sete) dias corridos</strong> a partir da data da sua primeira contratação, sem necessidade de
            justificativa, já que a compra foi feita fora de um estabelecimento comercial físico.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">2. Renovações e ciclos seguintes</h2>
          <p>
            Após o período de 7 dias mencionado acima, ou em renovações subsequentes da assinatura (cobranças
            recorrentes de ciclos já utilizados), não realizamos reembolso proporcional pelo tempo não utilizado.
            Você pode cancelar a renovação automática a qualquer momento; o cancelamento impede cobranças futuras,
            mas o acesso à Plataforma permanece ativo até o fim do período já pago.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">3. Cobranças indevidas ou por erro técnico</h2>
          <p>
            Caso identifique uma cobrança duplicada, incorreta, ou decorrente de falha comprovada da Plataforma,
            entre em contato com nosso suporte — esses casos são analisados e, quando confirmados, reembolsados
            integralmente, independentemente do prazo acima.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">4. Como solicitar</h2>
          <p>
            Solicitações de reembolso ou cancelamento devem ser feitas através dos canais de suporte da Plataforma,
            informando o e-mail cadastrado na assinatura. O processamento do reembolso é feito pelo nosso provedor
            de pagamentos (Paddle) e pode levar alguns dias úteis para refletir no seu extrato, dependendo do meio
            de pagamento utilizado.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">5. Mais informações</h2>
          <p>
            Esta Política de Reembolso complementa nossos{" "}
            <Link to="/termos" className="text-[#FF7F50] hover:underline">
              Termos de Serviço
            </Link>{" "}
            e nossa{" "}
            <Link to="/privacidade" className="text-[#FF7F50] hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
