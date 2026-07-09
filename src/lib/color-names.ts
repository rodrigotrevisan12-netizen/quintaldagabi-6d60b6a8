// Dicionário PT-BR (e alguns nomes CSS em inglês) → HEX.
// Chaves normalizadas: minúsculas, sem acento, espaços colapsados.

const RAW: Record<string, string> = {
  // Neutros
  "branco": "#FFFFFF",
  "off white": "#FAF7F2",
  "off-white": "#FAF7F2",
  "creme": "#F5EFE0",
  "bege": "#E8DCC4",
  "bege claro": "#F0E6D2",
  "bege escuro": "#C9B896",
  "areia": "#E4D4B1",
  "gelo": "#F5F9FC",
  "cinza": "#9CA3AF",
  "cinza claro": "#D1D5DB",
  "cinza escuro": "#4B5563",
  "cinza chumbo": "#374151",
  "grafite": "#2C2F36",
  "preto": "#0A0A0A",
  "prata": "#C0C0C0",

  // Azuis
  "azul": "#3B82F6",
  "azul claro": "#7DD3FC",
  "azul bebe": "#B7E4F7",
  "azul ceu": "#87CEEB",
  "azul celeste": "#4FC3F7",
  "azul serenity": "#92A8D1",
  "azul royal": "#1E3A8A",
  "azul marinho": "#0B1E3F",
  "azul petroleo": "#1B4B5A",
  "azul turquesa": "#40E0D0",
  "azul tiffany": "#0ABAB5",
  "azul cobalto": "#1E4EAD",
  "azul eletrico": "#0066FF",
  "azul jeans": "#4A6FA5",
  "azul acinzentado": "#6E85A3",
  "azul noite": "#0F172A",
  "azul indigo": "#4F46E5",

  // Verdes
  "verde": "#22C55E",
  "verde claro": "#86EFAC",
  "verde escuro": "#166534",
  "verde bandeira": "#009C3B",
  "verde limao": "#B4E33D",
  "verde lima": "#CDDC39",
  "verde agua": "#A8E6CF",
  "verde menta": "#98D8B8",
  "verde militar": "#4B5320",
  "verde musgo": "#556B2F",
  "verde oliva": "#808000",
  "verde esmeralda": "#10B981",
  "verde jade": "#00A86B",
  "verde folha": "#3B7A57",
  "verde pinho": "#01796F",
  "verde salvia": "#B2C2A6",
  "verde neon": "#39FF14",
  "verde abacate": "#568203",

  // Amarelos / Laranjas
  "amarelo": "#FACC15",
  "amarelo claro": "#FEF08A",
  "amarelo canario": "#FFEF00",
  "amarelo ouro": "#FFD700",
  "amarelo mostarda": "#D4A017",
  "mostarda": "#D4A017",
  "dourado": "#D4AF37",
  "ocre": "#CC7722",
  "laranja": "#F97316",
  "laranja claro": "#FDBA74",
  "laranja escuro": "#C2410C",
  "laranja queimado": "#CC5500",
  "coral": "#FF7F50",
  "salmao": "#FA8072",
  "damasco": "#F4B47C",
  "pessego": "#FFCBA4",
  "abobora": "#FF7518",
  "tangerina": "#F28500",

  // Vermelhos / Rosas
  "vermelho": "#EF4444",
  "vermelho escuro": "#991B1B",
  "vermelho tijolo": "#8B4513",
  "vinho": "#722F37",
  "bordo": "#800020",
  "bordô": "#800020",
  "carmim": "#960018",
  "cereja": "#DE3163",
  "rosa": "#EC4899",
  "rosa claro": "#FBCFE8",
  "rosa bebe": "#F8BBD0",
  "rosa antigo": "#C08081",
  "rosa chiclete": "#FF69B4",
  "rosa pink": "#FF1493",
  "pink": "#FF1493",
  "magenta": "#D946EF",
  "fucsia": "#FF00FF",

  // Roxos
  "roxo": "#8B5CF6",
  "roxo claro": "#C4B5FD",
  "roxo escuro": "#4C1D95",
  "lilas": "#C8A2C8",
  "lavanda": "#B57EDC",
  "violeta": "#7F00FF",
  "berinjela": "#4B2E4A",
  "ameixa": "#8E4585",
  "uva": "#6F2DA8",

  // Marrons / terrosos
  "marrom": "#7A4E2D",
  "marrom claro": "#A0522D",
  "marrom escuro": "#3E2723",
  "chocolate": "#5C3317",
  "cafe": "#4B2E20",
  "caramelo": "#AF6E4D",
  "castanho": "#754B26",
  "terracota": "#B7573B",
  "telha": "#C67B5C",
  "canela": "#D2691E",
  "avela": "#A87851",
  "cobre": "#B87333",
  "bronze": "#CD7F32",
  "tabaco": "#6E4B2A",

  // Tons frios especiais
  "turquesa": "#40E0D0",
  "menta": "#AAF0D1",
  "aqua": "#00FFFF",
  "ciano": "#06B6D4",

  // Inglês (comuns)
  "white": "#FFFFFF",
  "black": "#0A0A0A",
  "gray": "#9CA3AF",
  "grey": "#9CA3AF",
  "red": "#EF4444",
  "green": "#22C55E",
  "blue": "#3B82F6",
  "yellow": "#FACC15",
  "orange": "#F97316",
  "purple": "#8B5CF6",
  
  "brown": "#7A4E2D",
  "navy": "#0B1E3F",
  "teal": "#14B8A6",
  "cyan": "#06B6D4",
  "beige": "#E8DCC4",
  "cream": "#F5EFE0",
};

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\s+/g, " ")
    .trim();
}

const DICT: Record<string, string> = Object.fromEntries(
  Object.entries(RAW).map(([k, v]) => [normalize(k), v.toUpperCase()]),
);

/** Retorna HEX (#RRGGBB) se conseguir resolver o input, ou null. */
export function resolveColor(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  // Hex direto
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) {
    if (raw.length === 4) {
      const [, r, g, b] = raw.match(/^#(.)(.)(.)$/)!;
      return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
    }
    return raw.toUpperCase();
  }
  // Hex sem #
  if (/^([0-9a-f]{6})$/i.test(raw)) return `#${raw.toUpperCase()}`;

  const key = normalize(raw);
  return DICT[key] ?? null;
}

/** Lista de sugestões para autocomplete/help. */
export const COLOR_NAME_SUGGESTIONS = Object.keys(RAW).filter((k) => !/^[a-z]+$/.test(k) || k.length > 6);
