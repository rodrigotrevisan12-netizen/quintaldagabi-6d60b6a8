
alter table public.units
  add column if not exists brand_name text,
  add column if not exists brand_logo_url text,
  add column if not exists brand_primary text,
  add column if not exists brand_secondary text,
  add column if not exists brand_accent text;
