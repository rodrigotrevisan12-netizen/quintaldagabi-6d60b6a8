import { getPaddleEnvironment } from "@/lib/paddle";

export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;
  return (
    <div className="w-full border-b border-orange-300 bg-orange-100 px-4 py-2 text-center text-sm text-orange-900">
      Modo de teste ativo — nenhum pagamento é real. Use cartão de teste{" "}
      <code className="font-mono">4242 4242 4242 4242</code>.
    </div>
  );
}
