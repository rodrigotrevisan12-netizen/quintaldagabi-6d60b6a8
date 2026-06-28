import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";

/**
 * Returns true if the current user can delete records.
 * Permitted: admin role OR employee with job_role === 'recepcionista'.
 */
export function useCanDelete() {
  const { data: me } = useCurrentUser();
  const isAdmin = !!me?.roles?.includes("admin");

  const { data: isReception } = useQuery({
    queryKey: ["can-delete-reception", me?.userId],
    enabled: !!me?.userId && !isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("job_role")
        .eq("user_id", me!.userId)
        .maybeSingle();
      return data?.job_role === "recepcionista";
    },
  });

  return isAdmin || !!isReception;
}
