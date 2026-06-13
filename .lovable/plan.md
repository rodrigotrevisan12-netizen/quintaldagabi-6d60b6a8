## Plano — Próximas fases

Vou entregar em 4 fases curtas. Após cada uma, você testa e a gente segue.

### Fase A — Cadastro de Clientes (Tutores)
Tabela `tutors` com: nome, CPF, RG, data de nascimento, endereço (rua, número, complemento, bairro, cidade, estado, CEP), telefone, WhatsApp, e-mail, observações.
Tabelas relacionadas:
- `tutor_emergency_contacts` (nome, telefone, parentesco)
- `tutor_authorized_pickups` (nome, documento, telefone, parentesco)

Telas:
- Lista de tutores (busca por nome/CPF/telefone)
- Formulário de criar/editar tutor (com seções: dados pessoais, endereço, contatos de emergência, autorizados)
- Detalhe do tutor

Quando o tutor é cadastrado, a admin pode opcionalmente **enviar convite** (cria usuário no Auth com o e-mail dele e vincula ao tutor). Ele entra usando "esqueci a senha".

### Fase B — Cadastro de Cães + Saúde
Tabela `dogs`: tutor_id, foto, nome, raça, porte (mini/pequeno/médio/grande/gigante), peso, sexo, castrado, data de nascimento, microchip, veterinário (nome + telefone), plano contratado, observações.

Saúde (tabelas separadas, com histórico):
- `dog_vaccines` (tipo: V8/V10/Antirrábica/Gripe/Giárdia/outra, data aplicação, próxima dose, lote, veterinário)
- `dog_dewormings` (data, produto, próxima dose)
- `dog_flea_treatments` (data, produto, próxima dose)
- `dog_allergies` (descrição, gravidade)
- `dog_diet_restrictions` (descrição)
- `dog_medications` (nome, dose, frequência, ativo)
- `dog_medical_history` (data, ocorrência, veterinário)

Telas:
- Lista de cães (com foto, tutor, alertas)
- Detalhe do cão com abas: Geral / Saúde / Histórico
- Upload de foto (Storage bucket `dogs`)

### Fase C — Dashboard real + alertas
Função SQL para alertas:
- Vacinas vencendo nos próximos 30 dias ou vencidas
- Vermífugo/antipulgas vencidos
- (Pagamentos virão na fase financeira)

Dashboard com cards reais:
- Cães presentes (placeholder até existir check-in)
- Hospedagens ativas (placeholder até agenda)
- Banhos agendados hoje (placeholder até agenda)
- Ocorrências do dia (tabela `daily_incidents` simples)
- Tarefas pendentes (tabela `tasks`)
- Alertas de vacinas (lista clicável)
- Indicadores financeiros (placeholder)
- Alertas de pagamento (placeholder)

Os placeholders ficam visíveis com label "em breve" — para não fingir dados.

### Fase D — Menu lateral expandido
Expandir o menu com seções preparadas (mesmo que algumas ainda sejam "em breve"):
- Início
- Agenda
- Tutores
- Cães
- Saúde (alertas)
- Hospedagem (em breve)
- Banho & tosa (em breve)
- Ocorrências
- Tarefas
- Financeiro (em breve)
- Relatórios (em breve)
- Configurações

### O que NÃO entra agora
- Agenda completa, check-in/check-out, hospedagem, banho/tosa — fase própria
- Financeiro real, pagamentos, NF-e
- WhatsApp, câmeras, Google Agenda
- Build mobile (Capacitor)

### Detalhes técnicos
- Stack atual: TanStack Start + Supabase + shadcn
- Todas as tabelas com RLS: admin e funcionário leem/escrevem; tutor só vê os próprios cães/dados
- Server functions com `requireSupabaseAuth` para envio de convite
- Storage bucket `dogs` (público para leitura de foto, escrita só autenticado)
- Validação Zod em todos os formulários
- Alertas calculados via VIEW SQL para ficar barato

### Como vou tocar
Começo pela **Fase A** (cadastro de tutores ponta a ponta) e te peço para testar antes de seguir. Se aprovar o plano, manda "ok" ou ajusta o que quiser.