/**
 * useRowSnippets — react-query bindings for the `row_snippets` table
 * (reusable page-builder rows, clone-on-insert — see BuilderContext's
 * `insertPrebuiltRow`/`insertSnippetAtSelection`). Mirrors
 * `useGlobalWidgets`'s admin list+CRUD shape; no "map" variant is
 * needed since nothing resolves a snippet by id at public-render time
 * (unlike global_widgets, snippets are only ever read inside the admin
 * builder).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { PageRowV3 } from "@/types/rows";

export interface RowSnippet {
  id: string;
  name: string;
  row_data: PageRowV3;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ["row_snippets"] as const;

const fetchAll = async (): Promise<RowSnippet[]> => {
  const { data, error } = await supabase
    .from("row_snippets")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as RowSnippet[];
};

export const useRowSnippets = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchAll,
    staleTime: 30_000,
    refetchOnMount: true,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: async (input: { name: string; row_data: PageRowV3 }) => {
      const { data, error } = await supabase
        .from("row_snippets")
        .insert({ name: input.name, row_data: input.row_data as any })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as RowSnippet;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Saved as Snippet");
    },
    onError: (e: any) => toast.error("Couldn't save snippet", { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("row_snippets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Snippet deleted");
    },
    onError: (e: any) => toast.error("Couldn't delete snippet", { description: e.message }),
  });

  return {
    snippets: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isMutating: createMutation.isPending || deleteMutation.isPending,
  };
};
