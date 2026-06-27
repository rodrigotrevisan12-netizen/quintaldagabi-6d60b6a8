# Plano — Stories, Calendário, Financeiro (despesas), Hospedagem e correções

## 1. Stories dos cães
- Nova tabela `dog_stories` (dog_id, media_url, media_type [photo|video], caption, expires_at = now+24h, created_by).
- Bucket privado `stories`.
- RLS:
  - Staff/admin: inserir e ver tudo.
  - Tutor: SELECT apenas onde `dog_id` pertence ao seu tutor (via `tutor_of_dog`).
- Rotas:
  - `/app/stories` — funcionário publica (escolhe cão, foto/vídeo, legenda).
  - `/tutor/stories` — feed em estilo Instagram só com cães do tutor.
- Reaproveita `caes/$id/timeline` adicionando bloco "Stories" recentes.

## 2. Calendário visual
- Nova rota `/app/calendario` com `@fullcalendar/react` (month/week/day).
- Eventos agregados a partir de:
  - `grooming_appointments` (banho/tosa)
  - `boarding_stays` (hospedagens)
  - `daycare_stays` (reservas/creche)
  - `daily_schedule_items` (programação)
  - `arrival_notifications` (chegadas do dia)
- Cores por tipo, click abre detalhe e link para a página correspondente.

## 3. Financeiro — Despesas
- A tabela `financial_transactions` já tem `kind` (receita/despesa) e `expense_category`. Aceitar e expor no UI:
  - Salários, Água, Energia, Aluguel, Produtos, Outras.
- Atualizar `app.financeiro.tsx`:
  - Form "Nova despesa" com categoria, fornecedor opcional, valor, vencimento, status.
  - Aba **Despesas** com filtros por categoria + total mensal.
  - Métricas de Lucro já existem; passar a refletir despesas reais.

## 4. Hospedagem — abas sempre visíveis
- Em `app.hospedagem.$id.relatorio.tsx`, garantir que as abas **Diário / Medicamentos / Pertences / Ração** renderizem imediatamente após criar a estadia, sem depender de configuração extra (remover gates atuais).

## 5. Correções
### 5a. Check-out de creche
- Investigar `app.index.tsx` / página de creche e corrigir mutation que finaliza `daycare_stays` (setando `check_out_at`).

### 5b. Check-in mesmo com estadia anterior aberta
- No fluxo de novo check-in: se houver `daycare_stays` ou `boarding_stays` aberta para o cão, exibir AlertDialog "Há um atendimento em aberto desde X. Deseja finalizá-lo agora e iniciar um novo?". Ao confirmar: fechar a anterior (check_out_at=now) e criar a nova. Nunca bloquear.

### 5c. Contagem regressiva "Estou Chegando"
- Em `tutor.chegada.tsx` e `app.chegadas.tsx`, derivar `remaining = eta_minutes - minutosDesde(created_at)`, atualizar a cada 30s via `setInterval` + `useState`.
- Subscrição Realtime em `arrival_notifications` para refletir mudanças instantaneamente (admin/funcionário/tutor).
- Adicionar `arrival_notifications` à `supabase_realtime` publication.

## Migrations
1. Criar `dog_stories` + bucket + policies.
2. Habilitar Realtime para `arrival_notifications`.

## Dependências
- `bun add @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction`

Após aprovação eu executo as migrations e implemento os componentes.
