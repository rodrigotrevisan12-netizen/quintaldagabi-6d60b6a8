import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve a value stored in `card_photo_url` (or similar) into a URL the
 * browser can open. Accepts either a full http(s) URL (legacy rows) or a
 * storage path inside the given private bucket, in which case a short-lived
 * signed URL is generated.
 */
export function useSignedStorageUrl(bucket: string, value: string | null | undefined) {
  return useQuery({
    queryKey: ["signed-url", bucket, value],
    enabled: !!value,
    staleTime: 50 * 60 * 1000, // refresh before 1h expiry
    queryFn: async () => {
      if (!value) return null;
      if (/^https?:\/\//i.test(value)) {
        // Legacy public URL that may point at a private bucket.
        // Try to extract the storage path and re-sign; fall back to the raw URL.
        const marker = `/object/public/${bucket}/`;
        const idx = value.indexOf(marker);
        if (idx >= 0) {
          const path = decodeURIComponent(value.slice(idx + marker.length));
          const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
          if (data?.signedUrl) return data.signedUrl;
        }
        return value;
      }
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(value, 3600);
      if (error) return null;
      return data.signedUrl;
    },
  });
}
