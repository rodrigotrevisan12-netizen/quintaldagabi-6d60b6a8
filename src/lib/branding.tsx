import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Brand = {
  name: string;
  logoUrl: string | null;
  primary: string;
  secondary: string;
  accent: string;
  background: string | null;
};

export const CENTRALPET_BRAND: Brand = {
  name: "Central Pet",
  logoUrl: null,
  primary: "#FF7F50",
  secondary: "#FFCA3A",
  accent: "#FF9F43",
  background: null,
};

type UnitBrandRow = {
  brand_name: string | null;
  brand_logo_url: string | null;
  brand_primary: string | null;
  brand_secondary: string | null;
  brand_accent: string | null;
  brand_background: string | null;
};

async function fetchBrand(): Promise<Brand> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return CENTRALPET_BRAND;

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_unit_id")
    .eq("id", user.id)
    .maybeSingle();

  const unitId = profile?.default_unit_id;
  if (!unitId) return CENTRALPET_BRAND;

  const { data: unit } = await (supabase as any)
    .from("units")
    .select("brand_name, brand_logo_url, brand_primary, brand_secondary, brand_accent, brand_background")
    .eq("id", unitId)
    .maybeSingle();

  const u = unit as UnitBrandRow | null;
  if (!u) return CENTRALPET_BRAND;
  return {
    name: u.brand_name?.trim() || CENTRALPET_BRAND.name,
    logoUrl: u.brand_logo_url?.trim() || null,
    primary: u.brand_primary?.trim() || CENTRALPET_BRAND.primary,
    secondary: u.brand_secondary?.trim() || CENTRALPET_BRAND.secondary,
    accent: u.brand_accent?.trim() || CENTRALPET_BRAND.accent,
    background: u.brand_background?.trim() || null,
  };
}

export function useBrand(): Brand {
  const { data } = useQuery({
    queryKey: ["current-brand"],
    queryFn: fetchBrand,
    staleTime: 60_000,
    placeholderData: CENTRALPET_BRAND,
  });
  return data ?? CENTRALPET_BRAND;
}

export function useInvalidateBrand() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["current-brand"] });
}

// Converte #RRGGBB para "H S% L%" (formato usado nos tokens HSL do tema).
function hexToHslString(hex: string): string | null {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Applies the current brand as CSS variables on <html> so the whole design system reflects it. */
export function BrandingApplier() {
  const brand = useBrand();
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--primary", brand.primary);
    r.setProperty("--ring", brand.primary);
    r.setProperty("--sidebar-primary", brand.primary);
    r.setProperty("--sidebar-ring", brand.primary);
    r.setProperty("--accent", brand.accent);
    r.setProperty("--sidebar-accent", brand.secondary + "33");
    if (brand.background) {
      const hsl = hexToHslString(brand.background);
      // Alguns temas usam formato HSL (sem hsl()) em variáveis; setamos ambos.
      r.setProperty("--background", brand.background);
      if (hsl) r.setProperty("--background-hsl", hsl);
      document.body.style.backgroundColor = brand.background;
    } else {
      r.removeProperty("--background");
      r.removeProperty("--background-hsl");
      document.body.style.backgroundColor = "";
    }
  }, [brand.primary, brand.secondary, brand.accent, brand.background]);
  return null;
}
