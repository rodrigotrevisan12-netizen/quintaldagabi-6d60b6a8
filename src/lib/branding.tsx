import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Brand = {
  name: string;
  logoUrl: string | null;
  primary: string;
  secondary: string;
  accent: string;
};

export const CENTRALPET_BRAND: Brand = {
  name: "Central Pet",
  logoUrl: null,
  primary: "#FF7F50",
  secondary: "#FFCA3A",
  accent: "#FF9F43",
};

type UnitBrandRow = {
  brand_name: string | null;
  brand_logo_url: string | null;
  brand_primary: string | null;
  brand_secondary: string | null;
  brand_accent: string | null;
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

  const { data: unit } = await supabase
    .from("units")
    .select("brand_name, brand_logo_url, brand_primary, brand_secondary, brand_accent")
    .eq("id", unitId)
    .maybeSingle<UnitBrandRow>();

  if (!unit) return CENTRALPET_BRAND;
  return {
    name: unit.brand_name?.trim() || CENTRALPET_BRAND.name,
    logoUrl: unit.brand_logo_url?.trim() || null,
    primary: unit.brand_primary?.trim() || CENTRALPET_BRAND.primary,
    secondary: unit.brand_secondary?.trim() || CENTRALPET_BRAND.secondary,
    accent: unit.brand_accent?.trim() || CENTRALPET_BRAND.accent,
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
    // Keep secondary subtle — use as sidebar accent tint
    r.setProperty("--sidebar-accent", brand.secondary + "33"); // ~20% alpha
  }, [brand.primary, brand.secondary, brand.accent]);
  return null;
}
