// Classifica categorias de despesa em custos fixos ou variáveis
// para o motor de custos do Centro de Inteligência Financeira.

export type CostGroup = "fixo" | "variavel";

export const FIXED_CATEGORIES = [
  "aluguel",
  "agua",
  "energia",
  "internet",
  "contabilidade",
  "sistema",
  "marketing",
  "pro_labore",
  "salarios",
  "seguros",
  "impostos",
  "outras_fixas",
] as const;

export const VARIABLE_CATEGORIES = [
  "racao",
  "petiscos",
  "shampoo",
  "condicionador",
  "produtos_limpeza",
  "medicamentos",
  "lavanderia",
  "materiais_descartaveis",
  "outros_insumos",
  "produtos",
  "veterinario",
  "outros",
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  aluguel: "Aluguel",
  agua: "Água",
  energia: "Energia",
  internet: "Internet",
  contabilidade: "Contabilidade",
  sistema: "Sistema",
  marketing: "Marketing",
  pro_labore: "Pró-labore",
  salarios: "Salários",
  seguros: "Seguros",
  impostos: "Impostos",
  outras_fixas: "Outras despesas fixas",
  racao: "Ração",
  petiscos: "Petiscos",
  shampoo: "Shampoo",
  condicionador: "Condicionador",
  produtos_limpeza: "Produtos de limpeza",
  medicamentos: "Medicamentos",
  lavanderia: "Lavanderia",
  materiais_descartaveis: "Materiais descartáveis",
  outros_insumos: "Outros insumos",
  produtos: "Produtos",
  veterinario: "Veterinário",
  outros: "Outros",
};

export function classifyCategory(cat?: string | null): CostGroup {
  if (!cat) return "variavel";
  return (FIXED_CATEGORIES as readonly string[]).includes(cat) ? "fixo" : "variavel";
}

export const ALL_EXPENSE_CATEGORIES = [...FIXED_CATEGORIES, ...VARIABLE_CATEGORIES];
