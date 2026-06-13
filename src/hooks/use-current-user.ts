import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "funcionario" | "tutor";

export interface CurrentUserInfo {
  userId: string;
  email: string | null;
  fullName: string | null;
  roles: AppRole[];
  primaryRole: AppRole;
}

export function useCurrentUser() {
  return useQuery<CurrentUserInfo | null>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      const roleList = (roles ?? []).map((r) => r.role as AppRole);
      const primary: AppRole = roleList.includes("admin")
        ? "admin"
        : roleList.includes("funcionario")
          ? "funcionario"
          : "tutor";

      return {
        userId: user.id,
        email: user.email ?? null,
        fullName: profile?.full_name ?? null,
        roles: roleList,
        primaryRole: primary,
      };
    },
    staleTime: 60_000,
  });
}
