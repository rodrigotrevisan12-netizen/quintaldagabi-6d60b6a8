import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Serviço — Central Pet" },
      { name: "description", content: "Termos de Serviço da plataforma Central Pet." },
    ],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <Link to="/" className="text-sm text-[#FF7F50] hover:underline">
        ← Voltar para a página inicial
      </Link>

      <h1 className="mb-2 mt-6 text-3xl font-extrabold text-gray-800">Termos de Serviço</h1>
      <p className="mb-8 text-sm text-gray-500">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

      <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-lg font-bold text-gray-800">1. Aceitação dos termos</h2>
          <p>
            Ao criar uma conta e utilizar a plataforma Central Pet ("Plataforma", "Serviço"), você concorda com
            estes Termos de Serviço. Se você está utilizando a Plataforma em nome de uma empresa, você declara ter
            autoridade para vincular essa empresa a estes termos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">2. Descrição do serviço</h2>
          <p>
            A Central Pet é um sistema de gestão para creches, hotéis e day cares caninos, oferecendo
            funcionalidades de agendamento, cadastro de cães e tutores, controle financeiro, comunicação interna,
            relatórios e demais ferramentas relacionadas à operação desse tipo de negócio.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">3. Cadastro e conta</h2>
          <p>
            Você é responsável por manter a confidencialidade das credenciais de acesso à sua conta e por todas as
            atividades realizadas nela. Notifique-nos imediatamente em caso de uso não autorizado.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">4. Planos, cobrança e cancelamento</h2>
          <p>
            O acesso à Plataforma é oferecido mediante assinatura paga, com cobrança recorrente conforme o plano
            escolhido (mensal, trimestral, semestral ou anual). Os pagamentos são processados por um provedor de
            pagamentos terceirizado (atualmente, Paddle), responsável pelo processamento seguro das transações.
          </p>
          <p>
            Você pode cancelar sua assinatura a qualquer momento; o cancelamento produz efeitos ao final do período
            já pago, sem reembolso proporcional, salvo disposição legal em contrário.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">5. Uso aceitável</h2>
          <p>
            Você concorda em não utilizar a Plataforma para fins ilícitos, não tentar acessar áreas restritas do
            sistema sem autorização, e não realizar engenharia reversa, cópia ou revenda não autorizada do software.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">6. Dados inseridos por você</h2>
          <p>
            Você é responsável pela veracidade e legalidade dos dados que insere na Plataforma (incluindo dados de
            tutores, funcionários e animais), e deve possuir base legal adequada para o tratamento desses dados,
            conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Consulte também nossa{" "}
            <Link to="/privacidade" className="text-[#FF7F50] hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">7. Limitação de responsabilidade</h2>
          <p>
            A Plataforma é fornecida "como está". Não garantimos disponibilidade ininterrupta do serviço e não nos
            responsabilizamos por decisões de negócio tomadas com base nos dados ou relatórios gerados pela
            Plataforma, incluindo sugestões de precificação, que são estimativas e não substituem orientação
            contábil ou jurídica profissional.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">8. Alterações destes termos</h2>
          <p>
            Podemos atualizar estes Termos periodicamente. Alterações relevantes serão comunicadas através da
            própria Plataforma ou por e-mail.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">9. Legislação aplicável</h2>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil, ficando eleito o foro do
            domicílio do prestador do serviço para dirimir eventuais controvérsias.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">10. Contato</h2>
          <p>Em caso de dúvidas sobre estes Termos, entre em contato através dos canais de suporte da Plataforma.</p>
        </section>
      </div>
    </div>
  );
}
