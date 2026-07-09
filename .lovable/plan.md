## Já feito nesta mensagem
- Bug "Not Found" em **Meus cães** (tutor) corrigido: criei a rota de listagem `/tutor/caes` que faltava.

---

## Parte 1 — Cores por nome em português (rápido)

Na tela **Configurações → Aparência**, os campos "Cor primária / secundária / destaque / fundo" viram inputs de texto livre. Você digita `azul marinho`, `verde água`, `rosa claro`, `bege`, etc. e o sistema aplica.

Como vai funcionar:
- Dicionário PT-BR → HEX com ~120 cores populares (azul marinho, verde água, verde militar, salmão, terracota, off-white, grafite, dourado, rosa antigo, lilás, bordô, caramelo, etc.).
- Também aceito código hex direto (`#3B82F6`) e nomes CSS em inglês.
- Se digitar algo que não conheço, mostro aviso "cor não reconhecida — tente 'azul marinho' ou #123456" e mantenho a atual.
- Cor de fundo da tela também entra (novo token `--background` no tema).
- Preview ao vivo antes de salvar.

---

## Parte 2 — Multi-empresa (a reforma pesada)

Hoje tudo aponta pra uma unidade única (Quintal da Gabi). Pra vender, cada cliente precisa de dados 100% isolados.

### Modelo
Cria uma tabela **`companies`** (= empresa/cliente comprador). Cada `companies.id` é o "tenant".

Toda tabela de dados operacionais ganha `company_id uuid not null` com FK pra `companies`:
`dogs, tutors, employees, daycare_stays, daycare_packages, boarding_stays, boarding_*, grooming_*, financial_transactions, receipts, occurrences, documents, document_templates, tasks, daily_*, arrival_notifications, chat_messages, internal_communications, training_*, dog_stories, unit_settings, units` — no total ~40 tabelas.

`profiles` e `user_roles` ganham `company_id` também: um usuário pertence a uma empresa.

### RLS
Toda policy é reescrita pra incluir `company_id = public.current_company_id()`, onde `current_company_id()` é função `SECURITY DEFINER` que lê o `company_id` do `profile` do `auth.uid()`. Isso garante que admin/funcionário/tutor da empresa A jamais enxerga dados da empresa B.

### Storage
Buckets (`dogs`, `grooming`, `documents`, `reports`, `training`, `comms`, `stories`) passam a usar prefixo `company_id/...` no path e as policies validam esse prefixo.

### Backfill
Migração cria uma company inicial "Quintal da Gabi" e associa **todos** os dados existentes + profiles + roles a ela. Nada é perdido.

### Cadastro de novo cliente
Página pública nova `/comprar`:
1. Pessoa preenche: nome da empresa, e-mail, senha, telefone.
2. Cria `auth.users` + `companies` + `profiles(role=admin, company_id=nova)` + `user_roles(admin)` numa transação (via server function `signupCompany`).
3. Cria `trial_expires_at = now() + 14 dias`.
4. Redireciona pro app já logada como admin da própria empresa.

Ela não vê nem edita Quintal da Gabi — só a empresa dela.

---

## Parte 3 — Trial 14 dias + Stripe

### Estado da assinatura
Em `companies`:
- `trial_expires_at timestamptz`
- `subscription_status text` — `trialing | active | past_due | canceled`
- `stripe_customer_id text`
- `stripe_subscription_id text`
- `plan text` (por enquanto um plano só — dá pra expandir depois)

### Gate de acesso
Layout `_authenticated` verifica: se `subscription_status ∈ (trialing, active)` → libera. Senão → força a tela `/assinatura` (só admin consegue pagar; funcionários/tutores veem "sistema suspenso, avise o admin").

Banner no topo quando faltam ≤3 dias de trial.

### Pagamento (Stripe built-in do Lovable)
Uso `enable_stripe_payments` (built-in, sem chave — o Lovable gerencia). Fluxo:
1. Admin clica "Assinar" em `/assinatura`.
2. Server function cria Checkout Session (assinatura recorrente mensal).
3. Ao voltar do Stripe: webhook em `/api/public/stripe-webhook` atualiza `subscription_status = active`, salva `stripe_subscription_id`.
4. Webhook também trata `customer.subscription.deleted` e `invoice.payment_failed` (marca `past_due` / `canceled`).

Ambiente de teste sai imediato — você testa sem cartão real. Pra aceitar dinheiro de verdade depois é só reivindicar a conta Stripe.

**Preço mensal do plano**: preciso que você me diga. Sugestão: R$ 149/mês ou R$ 199/mês por empresa. Podemos criar mais planos (Básico/Pro) depois.

---

## Ordem de execução (proponho fazer em blocos separados, com sua aprovação entre eles)

**Bloco A — Cores por nome** (rápido, ~1 arquivo). Faço já se aprovar.

**Bloco B — Migração multi-empresa** (pesado, migração SQL grande + backfill). Você aprova o SQL antes de rodar. Depois disso ajusto o código do app pra sempre filtrar/inserir com `company_id`.

**Bloco C — Página `/comprar` + signup de nova empresa** (server function + tela pública).

**Bloco D — Stripe: enable + tela `/assinatura` + webhook + gate de trial**. Aqui você precisa me confirmar o preço mensal e me dizer se o produto vendido é "software SaaS" (pra eu classificar certo no Stripe).

---

## Riscos que você precisa saber
- Bloco B é irreversível na prática (adicionar `company_id NOT NULL` em 40 tabelas). Vou fazer backup lógico via SQL antes.
- Enquanto o Bloco B roda, o app fica ~1min instável. Faz de madrugada se possível.
- Custom domain (`quintaldagabi.lovable.app`) continua sendo da Gabi. Novos clientes usam subdomínios `.lovable.app` ou compram o próprio domínio depois.
- Trial não bloqueia dados: se expirar, empresa fica "congelada" — dados preservados, só bloqueio de acesso até pagar.

---

## O que preciso de você pra seguir
1. **Aprovar** este plano em geral (sim/não).
2. **Preço mensal** do plano (ex: R$ 149).
3. **Confirmar**: começo pelo Bloco A (cores) agora, e nas próximas mensagens fazemos B, C, D?
