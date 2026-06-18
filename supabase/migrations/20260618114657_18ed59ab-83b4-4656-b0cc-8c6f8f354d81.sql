-- Financeiro: categorias, transações, contas a pagar/receber, recibos

CREATE TYPE public.fin_kind AS ENUM ('receita','despesa');
CREATE TYPE public.fin_status AS ENUM ('pendente','pago','recebido','cancelado','vencido');
CREATE TYPE public.fin_revenue_category AS ENUM ('creche','hospedagem','banho_tosa','outros_servicos');
CREATE TYPE public.fin_expense_category AS ENUM ('salarios','produtos','aluguel','agua','energia','veterinario','outros');

CREATE TABLE public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  kind public.fin_kind NOT NULL,
  revenue_category public.fin_revenue_category,
  expense_category public.fin_expense_category,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  due_date date,
  paid_at date,
  status public.fin_status NOT NULL DEFAULT 'pendente',
  payment_method text,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE SET NULL,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'receita' AND revenue_category IS NOT NULL AND expense_category IS NULL) OR
    (kind = 'despesa' AND expense_category IS NOT NULL AND revenue_category IS NULL)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transactions TO authenticated;
GRANT ALL ON public.financial_transactions TO service_role;

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e funcionarios podem ver financeiro"
  ON public.financial_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));

CREATE POLICY "Admin gerencia financeiro"
  ON public.financial_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_fin_tx_due ON public.financial_transactions(due_date);
CREATE INDEX idx_fin_tx_paid ON public.financial_transactions(paid_at);
CREATE INDEX idx_fin_tx_kind_status ON public.financial_transactions(kind,status);

-- Recibos
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
  number text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  payer_name text NOT NULL,
  payer_document text,
  amount numeric(12,2) NOT NULL,
  description text NOT NULL,
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe ve recibos"
  ON public.receipts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));

CREATE POLICY "Admin gerencia recibos"
  ON public.receipts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));