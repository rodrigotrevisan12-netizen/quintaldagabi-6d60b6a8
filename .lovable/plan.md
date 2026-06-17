# Fase D — Documentos, Programação, Boletins, Timeline

Quatro módulos grandes. Vou entregar em **4 sub-fases**, na ordem abaixo. Confirma e começo pela D1. Se quiser tudo de uma vez, me avisa.

---

## D1 — Documentos (contratos e termos)

### Modelos automáticos
- **Contrato de creche**
- **Contrato de hospedagem**
- **Contrato de banho e tosa**
- **Termo de responsabilidade**
- **Autorização de uso de imagem**

Cada modelo é um template com variáveis ({{tutor.nome}}, {{cao.nome}}, {{estadia.entrada}}, valores, datas). A administradora edita o texto base em Configurações; os documentos são gerados preenchendo as variáveis.

### Banco
- `document_templates` — tipo (enum), título, corpo (markdown/html), versão, ativo. Seed com os 5 modelos.
- `documents` — tipo, `tutor_id`, `dog_id` (opcional), referência (creche/hospedagem/grooming id, opcional), corpo renderizado, status (`draft`/`pending_signature`/`signed`/`cancelled`), pdf_path (storage), criado_por.
- `document_signatures` — `document_id`, signatário (tutor user_id ou nome+email), método (`typed`/`drawn`), assinatura (texto ou PNG base64 → storage), assinado_em, ip, user_agent.
- Storage bucket `documents` (privado).

### Telas
- **Documentos** (lista): filtros por tipo/tutor/status. Botão "Novo documento" → escolhe modelo + tutor + cão/estadia → preview → enviar para assinatura.
- **Detalhe**: visualização do contrato renderizado, botão **Baixar PDF**, painel de assinaturas (quem, quando, IP), botão **Cancelar**.
- **Página pública de assinatura** (`/assinar/$token`): tutor logado abre, lê, assina (digitada ou desenhada no canvas), confirma. Após assinar → status `signed`, PDF final gerado e salvo.
- **Histórico de assinaturas** por tutor (na ficha do tutor).
- **Configurações → Modelos**: editar texto base dos 5 modelos.

PDF: geração client-side com `jspdf` + `html2canvas` (sem dependência server pesada, compatível com Worker).

---

## D2 — Programação do Dia

### Banco
- `daily_schedule_items` — `date`, `start_time`, `end_time` (opcional), `activity`, `description`, `responsible_id` (profiles), `location`, `requires_photo` (bool), `requires_confirmation` (bool), `status` (`pending`/`done`/`not_done`), `completed_at`, `completed_by`, `notes`, `not_done_reason`.
- `daily_schedule_participants` — `item_id`, `dog_id`. (Lista de cães participantes.)
- `daily_schedule_photos` — `item_id`, url (bucket `documents` ou novo `schedule`).
- `daily_schedule_history` — snapshot ao mudar status (quem, quando, status anterior/novo, observação).

### Telas
- **Programação do Dia** (admin): visão diária com timeline por hora. Botão "Nova tarefa" abre sheet com todos os campos. Edição inline. Filtro por responsável/data.
- **Minha programação** (funcionário): lista das tarefas do dia atribuídas a ele. Cada item: botões **Concluído** / **Não realizado** (pede motivo) / **Pendente**. Se `requires_photo`, exige upload antes de concluir. Se `requires_confirmation`, pede checkbox de confirmação.
- **Histórico** (admin): filtro por data/responsável/status, vê quem fez/quando.
- Dashboard: card "Tarefas hoje" — total / concluídas / pendentes / não realizadas.

RLS: admin vê tudo; funcionário vê e atualiza só itens onde é `responsible_id`.

---

## D3 — Boletins diários

### Banco
- `daily_reports` — `dog_id`, `date`, `stay_id` (opcional — creche ou hospedagem), `author_id`, `published` (bool).
- `daily_report_entries` — `report_id`, tipo (enum: `alimentacao`/`hidratacao`/`brincadeira`/`passeio`/`descanso`/`comportamento`), hora, descrição, observação.
- `daily_report_media` — `report_id`, url, tipo (`photo`/`video`), legenda. Bucket `reports` (privado).
- Trigger: ao concluir check-out de creche/hospedagem, sugerir gerar boletim. Botão "Gerar boletim automático" agrega:
  - alimentações de `daycare_feedings`/`boarding_food`
  - medicações
  - atividades (`daycare_activities`)
  - logs diários (`boarding_daily_logs`)
  - tarefas concluídas da programação onde o cão participou
  - fotos do dia (banho & tosa, programação)

### Telas
- **Boletins** (funcionário/admin): lista por dia/cão. Editor: timeline com botão "+ Adicionar registro" (escolhe tipo), upload de fotos/vídeos.
- **Botão "Gerar automático"**: cria boletim pré-preenchido com dados do dia, funcionário só revisa e publica.
- **Visão tutor**: boletim publicado renderizado bonitinho, com fotos.
- RLS: equipe edita; tutor lê só do próprio cão e só publicados.

---

## D4 — Timeline do Pet (visão do tutor)

Página única por cão que **agrega tudo**, em ordem cronológica reversa:
- Estadias de creche (check-in/out)
- Estadias de hospedagem (com link para o relatório)
- Serviços de banho & tosa (com fotos antes/depois)
- Boletins publicados
- Vacinas, vermífugos, medicações, ocorrências de saúde
- Histórico comportamental
- Documentos assinados
- Fotos & vídeos (galeria separada)

### Telas
- **Timeline** (`/app/caes/$id/timeline`) com filtros por tipo de evento e período.
- Visão **galeria**: grid de todas as mídias (fotos + vídeos) do cão, ordenada por data.
- Tutor acessa por `/app/caes/$id` → aba "Timeline".
- Para a equipe, mesma página com mais ações (editar/remover entradas).

Backend: view SQL `dog_timeline_events` (UNION ALL das tabelas relevantes, com `event_type`, `event_at`, `summary`, `payload jsonb`). RLS herdada das tabelas-fonte; o tutor só vê o que já pode ver hoje.

---

## O que NÃO entra
- Assinatura digital com certificado ICP-Brasil (usamos assinatura simples + log de IP/user-agent, suficiente para uso interno).
- Envio automático de contrato por WhatsApp/e-mail.
- Edição rich-text WYSIWYG dos modelos (markdown simples já resolve).
- Notificação push de tarefas.

## Ordem
1. **D1 Documentos** — você testa criação, assinatura e PDF.
2. **D2 Programação** — você testa criação, execução pelo funcionário, histórico.
3. **D3 Boletins** — você testa registro manual e geração automática.
4. **D4 Timeline** — você testa visão consolidada.

Confirma "ok" para começar pela **D1**, ou ajusta a ordem/escopo.
