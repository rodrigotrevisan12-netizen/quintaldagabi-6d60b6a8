import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Central Pet" },
      { name: "description", content: "Política de Privacidade da plataforma Central Pet." },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <Link to="/" className="text-sm text-[#FF7F50] hover:underline">
        ← Voltar para a página inicial
      </Link>

      <h1 className="mb-2 mt-6 text-3xl font-extrabold text-gray-800">Política de Privacidade</h1>
      <p className="mb-8 text-sm text-gray-500">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

      <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-lg font-bold text-gray-800">1. Quem somos</h2>
          <p>
            Esta Política de Privacidade descreve como a Central Pet ("nós", "Plataforma") coleta, usa, armazena e
            protege dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº
            13.709/2018).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">2. Dados que coletamos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Dados de cadastro de administradores, funcionários e tutores (nome, e-mail, telefone, endereço).</li>
            <li>Dados dos animais (nome, raça, informações de saúde, vacinas, comportamento).</li>
            <li>Dados financeiros necessários para cobrança da assinatura (processados pelo nosso provedor de pagamentos).</li>
            <li>Dados de uso da Plataforma (logs de acesso, ações realizadas no sistema).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">3. Como usamos os dados</h2>
          <p>Utilizamos os dados coletados para:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Fornecer e manter as funcionalidades da Plataforma.</li>
            <li>Processar pagamentos e gerenciar sua assinatura.</li>
            <li>Enviar comunicações operacionais (ex.: confirmações, avisos importantes sobre a conta).</li>
            <li>Melhorar a Plataforma e prevenir uso indevido ou fraudes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">4. Compartilhamento de dados</h2>
          <p>
            Não vendemos dados pessoais. Compartilhamos dados apenas com provedores necessários à operação do
            serviço, como nosso provedor de pagamentos (Paddle) e provedor de infraestrutura/hospedagem, sempre sob
            obrigações contratuais de confidencialidade e segurança.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">5. Armazenamento e segurança</h2>
          <p>
            Os dados são armazenados em servidores com controles de acesso e criptografia em trânsito. Adotamos
            medidas técnicas e organizacionais razoáveis para proteger os dados contra acesso não autorizado, perda
            ou alteração indevida.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">6. Seus direitos (titular dos dados)</h2>
          <p>Nos termos da LGPD, você pode solicitar, a qualquer momento:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Confirmação da existência de tratamento de dados.</li>
            <li>Acesso, correção ou atualização de dados incompletos, inexatos ou desatualizados.</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei.</li>
            <li>Portabilidade dos dados a outro fornecedor de serviço.</li>
            <li>Revogação do consentimento e eliminação dos dados tratados com base nele.</li>
          </ul>
          <p>Para exercer esses direitos, entre em contato através dos canais de suporte da Plataforma.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">7. Retenção de dados</h2>
          <p>
            Mantemos os dados pelo tempo necessário ao cumprimento das finalidades descritas nesta Política, ou
            conforme exigido por obrigações legais, fiscais ou regulatórias.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">8. Cookies</h2>
          <p>
            Utilizamos cookies e tecnologias similares essenciais ao funcionamento da Plataforma, como manutenção de
            sessão de login.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">9. Alterações desta política</h2>
          <p>
            Podemos atualizar esta Política periodicamente. A versão vigente estará sempre disponível nesta página.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">10. Encarregado de dados (DPO)</h2>
          <p>
            Nos termos do art. 41 da LGPD, a empresa responsável por esta Plataforma mantém um encarregado pelo
            tratamento de dados pessoais, responsável por receber comunicações da Autoridade Nacional de Proteção
            de Dados (ANPD), do titular dos dados, e prestar esclarecimentos. Se você é tutor ou funcionário
            cadastrado, pode exercer seus direitos diretamente pela Plataforma, na tela "Meus dados".
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800">11. Contato</h2>
          <p>
            Para dúvidas, solicitações ou exercício de direitos relacionados a esta Política, entre em contato
            através dos canais de suporte da Plataforma. Veja também nossos{" "}
            <Link to="/termos" className="text-[#FF7F50] hover:underline">
              Termos de Serviço
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
