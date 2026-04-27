/**
 * useIconLibrary — fetch/manage custom icons from the icon_library
 * table. Cached via TanStack Query so the picker is instant after
 * first open.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface IconLibraryItem {
  id: string;
  name: string;
  storage_path: string;
  public_url: string;
  mime_type: string | null;
  tags: string[] | null;
  created_at: string;
}

const QUERY_KEY = ["icon-library"] as const;
const BUCKET = "icons";

export const useIconLibrary = () => {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<IconLibraryItem[]> => {
      const { data, error } = await supabase
        .from("icon_library")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as IconLibraryItem[];
    },
  });
};

export const useUploadIcon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, name }: { file: File; name?: string }) => {
      const ext = file.name.split(".").pop() || "svg";
      const baseName = (name?.trim() || file.name.replace(/\.[^.]+$/, "")).slice(0, 80);
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { data, error } = await supabase
        .from("icon_library")
        .insert({
          name: baseName,
          storage_path: path,
          public_url: publicUrl,
          mime_type: file.type || null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as IconLibraryItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Icon uploaded");
    },
    onError: (e: any) => toast.error(e?.message || "Upload failed"),
  });
};

export const useDeleteIcon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: IconLibraryItem) => {
      await supabase.storage.from(BUCKET).remove([item.storage_path]);
      const { error } = await supabase.from("icon_library").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Icon deleted");
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  });
};
