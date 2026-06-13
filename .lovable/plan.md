
# Plano — Quintal da Gabi

Plataforma de gestão para pet creche, hospedagem e banho e tosa. Web responsivo primeiro; o mesmo código vira app Android/iOS via Capacitor depois.

## Decisões já tomadas

- Começar com **1 unidade**, mas todo o banco já com `unit_id` para ligar multiunidade depois sem refatorar.
- **Login**: admin cadastra tutor com e-mail → tutor entra, clica "esqueci a senha", define senha pelo link recebido. Funcionários têm login/senha criados pela admin. Admin inicial: `gabrielamarquezinpirana@gmail.com`.
- **Visual**: verde claro + terracota, fundo creme, tipografia acolhedora mas profissional.
- **Backend**: Lovable Cloud (Postgres + Auth + Storage + envio de e-mail). Adequado a LGPD, com RLS e auditoria desde o início.
- **Mobile**: o mesmo app web, empacotado depois com Capacitor para publicar nas lojas. Sem código duplicado.

## Fases

### Fase 1 — Fundação (esta entrega)
- Design system: paleta verde/terracota/creme, tipografia, botões, cards, layout admin.
- Auth: e-mail+senha, fluxo "esqueci a senha", página `/reset-password`.
- Papéis: `admin`, `funcionario`, `tutor` (tabela `user_roles` + função `has_role`).
- Seed do admin inicial após o primeiro login.
- Shell do app:
  - **Admin/Funcionário**: dashboard com agenda do dia, atalhos.
  - **Tutor**: portal com seus cães e próximos serviços.
- Cadastros essenciais:
  - **Tutores** (clientes) — dados pessoais, contato, endereço, consentimento LGPD.
  - **Cães** — nome, raça, porte, sexo, castrado, nascimento, peso, foto, observações de comportamento, vacinas, alergias, medicamentos.
  - **Serviços** — creche (diária/meia), hospedagem (diária), banho, tosa, com preços.
- **Agenda**: marcar serviço (tutor + cão + serviço + data/hora + funcionário responsável). Visões dia/semana. Status (agendado, em andamento, concluído, cancelado).
- **Check-in / check-out** de hospedagem e creche.
- **Auditoria** automática (quem alterou o quê e quando) nas tabelas sensíveis.
- LGPD: aceite no cadastro, política de privacidade, exportar/excluir dados do tutor.

### Fase 2 — Operação completa
- Permissões granulares por funcionário (quais módulos vê/edita).
- Prontuário do cão (histórico de banhos/tosas com fotos, comportamento por estadia).
- Lista de espera, bloqueio de datas, capacidade da casa por dia.
- Notificações por e-mail (confirmação de agendamento, lembrete D-1, check-in/out).
- Portal do tutor: agendar online sujeito à aprovação, ver histórico, baixar relatório do cão.

### Fase 3 — Financeiro
- Lançamentos por agendamento (gera contas a receber).
- Formas de pagamento manuais (dinheiro, PIX manual, cartão maquininha).
- Relatórios: faturamento por serviço, por funcionário, por período.
- Despesas e fluxo de caixa simples.

### Fase 4 — Multiunidade
- Ativar seletor de unidade no topo. Cada cadastro, agenda e financeiro filtrado por `unit_id`.
- Admin vê consolidado; funcionário só sua unidade.

### Fase 5 — Mobile nativo
- Empacotar com Capacitor: build Android (Play Store) e iOS (App Store).
- Notificações push (FCM/APNs).
- Mesma base de dados e mesmas contas.

### Fase 6 — Integrações
WhatsApp Business (envio de confirmações), PIX/boleto/cartão (gateway a escolher — Stripe/Asaas/Mercado Pago), emissão de NFS-e (provedor municipal), assinatura digital de contratos, Google Agenda (sincronizar agenda do funcionário), câmeras (embed de stream RTSP/HLS por unidade).

## Detalhes técnicos (para registro)

- **Stack**: TanStack Start + React + Tailwind + shadcn, Lovable Cloud (Supabase).
- **Banco** (resumo Fase 1):
  - `profiles` (id=auth.uid, nome, telefone, unit_id padrão)
  - `units` (id, nome, endereço, ativo)
  - `app_role` enum + `user_roles` (user_id, role, unit_id)
  - `tutors` (id, profile_id, dados, lgpd_aceito_em, unit_id)
  - `dogs` (id, tutor_id, nome, raça, porte, etc., unit_id)
  - `vaccines`, `dog_notes`
  - `services` (id, nome, tipo, preço, unit_id)
  - `appointments` (id, dog_id, service_id, start_at, end_at, status, funcionario_id, unit_id)
  - `audit_log` (tabela, registro_id, acao, ator, payload, criado_em)
- RLS em tudo. Tutor só enxerga seus dados; funcionário enxerga sua unidade conforme permissão; admin enxerga tudo.
- Server functions para operações sensíveis (criação de tutor com convite por e-mail, criação de funcionário).
- E-mails via Lovable Emails (já integrado).

## O que NÃO entra agora

Pagamento online, NF-e, WhatsApp, Google Agenda, câmeras, build mobile, multiunidade ativa, financeiro completo. Tudo isso vira fase própria — a estrutura de dados já fica pronta para receber.

## Próximo passo

Se aprovar, começo pela **Fase 1**: design system + auth + cadastros de tutor/cão + agenda básica + portal do tutor. Entregamos em iterações curtas dentro dessa fase para você validar a cara e o fluxo antes de empilhar funcionalidade.
