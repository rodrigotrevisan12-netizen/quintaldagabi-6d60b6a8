
CREATE OR REPLACE VIEW public.v_health_alerts
WITH (security_invoker = true) AS
WITH unioned AS (
  SELECT v.id, v.dog_id, 'vacina'::text AS kind, COALESCE(v.vaccine_type, 'Vacina') AS item, v.next_due_date
    FROM public.dog_vaccines v WHERE v.next_due_date IS NOT NULL
  UNION ALL
  SELECT d.id, d.dog_id, 'vermifugo'::text, COALESCE(d.product, 'Vermífugo'), d.next_due_date
    FROM public.dog_dewormings d WHERE d.next_due_date IS NOT NULL
  UNION ALL
  SELECT f.id, f.dog_id, 'antipulgas'::text, COALESCE(f.product, 'Antipulgas'), f.next_due_date
    FROM public.dog_flea_treatments f WHERE f.next_due_date IS NOT NULL
)
SELECT
  u.id AS record_id,
  u.dog_id,
  d.name AS dog_name,
  d.tutor_id,
  t.full_name AS tutor_name,
  u.kind,
  u.item,
  u.next_due_date,
  (u.next_due_date - CURRENT_DATE)::int AS days_remaining,
  CASE
    WHEN u.next_due_date < CURRENT_DATE THEN 'vencido'
    WHEN u.next_due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'proximo'
    ELSE 'em_dia'
  END AS status
FROM unioned u
JOIN public.dogs d ON d.id = u.dog_id
LEFT JOIN public.tutors t ON t.id = d.tutor_id;

GRANT SELECT ON public.v_health_alerts TO authenticated;
GRANT SELECT ON public.v_health_alerts TO service_role;
