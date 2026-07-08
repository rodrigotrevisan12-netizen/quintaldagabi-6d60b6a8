ALTER FUNCTION public.is_tutor_of_dog(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION public.is_tutor_of_dog_folder(text, uuid) SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.is_tutor_of_dog(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_tutor_of_dog_folder(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_tutor_of_dog(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_tutor_of_dog_folder(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_tutor_of_dog(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tutor_of_dog_folder(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tutor_of_dog(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_tutor_of_dog_folder(text, uuid) TO service_role;