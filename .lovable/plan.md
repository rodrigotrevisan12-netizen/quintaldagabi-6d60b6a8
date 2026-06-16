# Fase C — Operação diária (Creche, Hospedagem, Banho & Tosa)

Três módulos grandes. Vou entregar em **3 sub-fases** para você testar cada uma antes da próxima. Se preferir tudo de uma vez, me avisa.

---

## C1 — Creche (daycare)

### Banco
- `daycare_stays` — `dog_id`, `check_in_at`, `check_out_at` (null = presente), `check_in_by`, `check_out_by`, `pickup_person` (texto, validado contra `tutor_authorized_pickups`), observações.
- `daycare_feedings` — `stay_id`, hora, tipo (ração/petisco/úmida), quantidade, observação.
- `daycare_medications` — `stay_id`, hora, medicamento, dose, aplicado_por.
- `daycare_activities` — `stay_id`, hora, atividade (passeio, brincadeira, soneca, socialização, treino, outra), duração, observação.
- `unit_settings` — `unit_id`, `daycare_capacity` (int). Configurável em Configurações.

Enums: `daycare_feeding_type`, `daycare_activity_type`.

### Telas
- **Agenda → Creche (hoje)**: lista de cães presentes (foto, nome, tutor, hora check-in, alertas de medicação pendente). Botão **Check-out** por linha.
- **Botão Check-in**: dialog seleciona cão (busca), opcional pessoa que trouxe, observação. Bloqueia se já tem estadia aberta.
- **Detalhe da estadia** (drawer): abas Alimentação / Medicação / Atividades — cada uma com timeline + form de novo registro.
- **Painel diário** (card no dashboard + topo da página): Presentes / Ausentes hoje / Capacidade usada (barra) / Vagas disponíveis.

---

## C2 — Hospedagem (boarding)

### Banco
- `boarding_stays` — `dog_id`, `check_in_at`, `expected_check_out_at`, `check_out_at` (null = em andamento), `kennel` (texto opcional), `daily_rate` (numeric), observações.
- `boarding_belongings` — `stay_id`, item, quantidade, devolvido (bool).
- `boarding_food` — `stay_id`, tipo (própria/casa), marca, quantidade_total_g, porção_g, frequência/dia.
- `boarding_medications` — `stay_id`, medicamento, dose, frequência, horários, observação.
- `boarding_daily_logs` — `stay_id`, data, alimentação_ok, medicação_ok, humor, observação. (Reusa estrutura para relatório.)
- `unit_settings.boarding_capacity`.

### Telas
- **Hospedagem**: lista de estadias ativas (cão, tutor, entrada, saída prevista, dias restantes, status). Filtros: ativas/futuras/encerradas.
- **Nova hospedagem** (sheet): cão, datas, kennel, ração, medicamentos, pertences, valor diária, observações.
- **Detalhe da estadia**: abas Geral / Ração / Medicamentos / Pertences / Diário.
- **Check-out**: confirma data efetiva, marca pertences devolvidos, gera **relatório PDF/print** (resumo da estadia, logs diários, medicação dada, valor total = diária × dias).
- **Painel**: Ocupados / Capacidade / Saídas hoje / Entradas hoje.

---

## C3 — Banho & Tosa (grooming)

### Banco
- `grooming_services` (catálogo): nome, duração_min, preço_base. Seed: Banho, Tosa completa, Tosa higiênica, Corte de unhas, Escovação.
- `grooming_appointments` — `dog_id`, `scheduled_at`, `duration_min`, `groomer_id` (profiles), status (`scheduled`/`in_progress`/`done`/`cancelled`/`no_show`), `started_at`, `finished_at`, observações, valor_total.
- `grooming_appointment_services` — `appointment_id`, `service_id`, preço.
- `grooming_photos` — `appointment_id`, url, momento (`before`/`after`).
- Storage bucket `grooming` (já temos `dogs`, criamos novo).

### Telas
- **Banho & Tosa → Agenda**: visão dia/semana com slots. Click vazio = novo agendamento (cão, serviços, profissional, horário). Click ocupado = detalhe.
- **Detalhe do agendamento**: serviços, status (Iniciar / Concluir), upload fotos antes/depois, observações, total.
- **Fila do dia**: lista por status (agendado / em execução / concluído).
- **Produtividade**: card por profissional — atendimentos no período, tempo médio, faturamento. Filtro de data.

---

## O que NÃO entra nesta fase
- Integração financeira completa (lançamento automático em "contas a receber") — só calculamos valores; lançamento vai na fase financeira.
- WhatsApp / e-mail de confirmação.
- Câmeras ao vivo.
- App do tutor.

## Detalhes técnicos
- Tabelas todas com RLS: equipe (admin/funcionario) lê e escreve; tutor lê só dos seus cães.
- `service_role` grant em todas; trigger `set_updated_at` onde aplicável.
- Validação Zod nos forms.
- Relatório de hospedagem: rota imprimível (`/_authenticated/app/hospedagem/$id/relatorio`) — usuário usa "imprimir → salvar PDF" do navegador (sem dependência extra).
- Painéis no dashboard passam de placeholder para dados reais.
- Menu lateral: remover badges "em breve" de Agenda, Hospedagem, Banho & Tosa.

## Ordem de execução
1. **C1 Creche** → você testa check-in/out, alimentação, medicação, atividades, painel.
2. **C2 Hospedagem** → você testa estadia completa + relatório.
3. **C3 Banho & Tosa** → você testa agendamento, execução, fotos, produtividade.

Se aprovar, começo pela **C1**. Manda "ok" ou ajusta.