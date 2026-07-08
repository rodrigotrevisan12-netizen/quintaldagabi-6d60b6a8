CREATE OR REPLACE FUNCTION public.is_tutor_of_dog(_dog_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.dogs d
    JOIN public.tutors t ON t.id = d.tutor_id
    WHERE d.id = _dog_id
      AND t.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tutor_of_dog_folder(_folder text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dog_id uuid;
BEGIN
  IF _folder IS NULL OR _folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;

  v_dog_id := _folder::uuid;
  RETURN public.is_tutor_of_dog(v_dog_id, _user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_tutor_of_dog(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tutor_of_dog(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_tutor_of_dog_folder(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tutor_of_dog_folder(text, uuid) TO service_role;

DROP POLICY IF EXISTS "tutor manage own vaccines" ON public.dog_vaccines;
DROP POLICY IF EXISTS "tutor read vaccines" ON public.dog_vaccines;
DROP POLICY IF EXISTS "tutor select own vaccines" ON public.dog_vaccines;
DROP POLICY IF EXISTS "tutor insert own vaccine photo" ON public.dog_vaccines;

CREATE POLICY "tutor select own vaccines"
ON public.dog_vaccines
FOR SELECT
TO authenticated
USING (public.is_tutor_of_dog(dog_id, auth.uid()));

CREATE POLICY "tutor insert own vaccine photo"
ON public.dog_vaccines
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_tutor_of_dog(dog_id, auth.uid())
  AND card_photo_url IS NOT NULL
);

DROP POLICY IF EXISTS "tutor manage own flea" ON public.dog_flea_treatments;
DROP POLICY IF EXISTS "tutor read flea" ON public.dog_flea_treatments;
DROP POLICY IF EXISTS "tutor select own flea" ON public.dog_flea_treatments;
DROP POLICY IF EXISTS "tutor insert own flea" ON public.dog_flea_treatments;

CREATE POLICY "tutor select own flea"
ON public.dog_flea_treatments
FOR SELECT
TO authenticated
USING (public.is_tutor_of_dog(dog_id, auth.uid()));

CREATE POLICY "tutor insert own flea"
ON public.dog_flea_treatments
FOR INSERT
TO authenticated
WITH CHECK (public.is_tutor_of_dog(dog_id, auth.uid()));

DROP POLICY IF EXISTS "tutor manage own meds" ON public.dog_medications;
DROP POLICY IF EXISTS "tutor read meds" ON public.dog_medications;
DROP POLICY IF EXISTS "tutor select own meds" ON public.dog_medications;
DROP POLICY IF EXISTS "tutor insert own meds" ON public.dog_medications;

CREATE POLICY "tutor select own meds"
ON public.dog_medications
FOR SELECT
TO authenticated
USING (public.is_tutor_of_dog(dog_id, auth.uid()));

CREATE POLICY "tutor insert own meds"
ON public.dog_medications
FOR INSERT
TO authenticated
WITH CHECK (public.is_tutor_of_dog(dog_id, auth.uid()));

DROP POLICY IF EXISTS "tutor manage own allergies" ON public.dog_allergies;
DROP POLICY IF EXISTS "tutor read allergies" ON public.dog_allergies;
DROP POLICY IF EXISTS "tutor select own allergies" ON public.dog_allergies;
DROP POLICY IF EXISTS "tutor insert own allergies" ON public.dog_allergies;

CREATE POLICY "tutor select own allergies"
ON public.dog_allergies
FOR SELECT
TO authenticated
USING (public.is_tutor_of_dog(dog_id, auth.uid()));

CREATE POLICY "tutor insert own allergies"
ON public.dog_allergies
FOR INSERT
TO authenticated
WITH CHECK (public.is_tutor_of_dog(dog_id, auth.uid()));

DROP POLICY IF EXISTS "tutor manage own diet" ON public.dog_diet_restrictions;
DROP POLICY IF EXISTS "tutor read diet" ON public.dog_diet_restrictions;
DROP POLICY IF EXISTS "tutor select own diet" ON public.dog_diet_restrictions;
DROP POLICY IF EXISTS "tutor insert own diet" ON public.dog_diet_restrictions;

CREATE POLICY "tutor select own diet"
ON public.dog_diet_restrictions
FOR SELECT
TO authenticated
USING (public.is_tutor_of_dog(dog_id, auth.uid()));

CREATE POLICY "tutor insert own diet"
ON public.dog_diet_restrictions
FOR INSERT
TO authenticated
WITH CHECK (public.is_tutor_of_dog(dog_id, auth.uid()));

DROP POLICY IF EXISTS "dogs tutor insert own folder" ON storage.objects;
DROP POLICY IF EXISTS "dogs tutor read own folder" ON storage.objects;
DROP POLICY IF EXISTS "dogs tutor update own folder" ON storage.objects;

CREATE POLICY "dogs tutor insert own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dogs'
  AND public.is_tutor_of_dog_folder((storage.foldername(name))[1], auth.uid())
);

CREATE POLICY "dogs tutor read own folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'dogs'
  AND public.is_tutor_of_dog_folder((storage.foldername(name))[1], auth.uid())
);