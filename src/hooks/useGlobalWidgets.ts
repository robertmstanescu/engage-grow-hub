/**
 * useGlobalWidgets — react-query bindings for the `global_widgets`
 * table (US 8.1 — "Global Blocks" / Reusable Widgets).
 *
 * WHY this hook exists
 * ────────────────────
 * A "global widget" is a single source of truth: editors save a widget
 * configuration ONCE, then reference it from many pages. When the
 * global record changes, every referencing page picks up the new
 * content automatically (the WP Gutenberg "reusable block" model).
 *
 * Three responsibilities live here:
 *   1. `useGlobalWidgets()`         — admin list view + CRUD mutations.
 *   2. `useGlobalWidgetMap()`       — id → data lookup for the public
 *                                     frontend resolver. Returned as a
 *                                     plain Map so renderers can do an
 *                                     O(1) lookup without re-querying.
 *   3. `useGlobalWidget(id)`        — single-record convenience reader.
 *
 * Cache semantics
 * ───────────────
 * We use a SHORT staleTime (30s) for the public map so newly-published
 * copy propagates quickly across pages without hammering the DB on every
 * render. Mutations call `invalidateGlobalWidgets()` to force an
 * immediate refresh in the admin UI.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GlobalWidget {
  id: string;
  name: string;
  type: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ["global_widgets"] as const;

const fetchAll = async (): Promise<GlobalWidget[]> => {
  const { data, error } = await supabase
    .from("global_widgets")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as GlobalWidget[];
};

/**
 * Admin-facing: full list + CRUD. Returns mutation helpers that already
 * surface success/error toasts so callers stay declarative.
 */
export const useGlobalWidgets = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchAll,
    staleTime: 30_000,
    refetchOnMount: true,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: async (input: { name: string; type: string; data: Record<string, any> }) => {
      const { data, error } = await supabase
        .from("global_widgets")
        .insert({ name: input.name, type: input.type, data: input.data })
        .select()
        .single();
      if (error) throw error;
      return data as GlobalWidget;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Saved as Global Block");
    },
    onError: (e: any) => toast.error("Couldn't save", { description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: { id: string; name?: string; data?: Record<string, any> }) => {
      const patch: Record<string, any> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.data !== undefined) patch.data = input.data;
      const { data, error } = await supabase
        .from("global_widgets")
        .update(patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as GlobalWidget;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Global Block updated");
    },
    onError: (e: any) => toast.error("Couldn't update", { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("global_widgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Global Block deleted");
    },
    onError: (e: any) => toast.error("Couldn't delete", { description: e.message }),
  });

  return {
    blocks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isMutating:
      createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
};

/**
 * Public-facing: a Map<id, GlobalWidget> used by the frontend resolver
 * to look up `__global_ref` references in cell content.
 *
 * WHY a single map query (vs one per ref): a typical page references
 * 0–3 global widgets; loading them all in one request is one round-trip
 * regardless of count, and the cache is shared across every row on the
 * page (and across pages within the same tab session).
 */
export const useGlobalWidgetMap = () => {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchAll,
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const map = new Map<string, GlobalWidget>();
  for (const w of query.data ?? []) map.set(w.id, w);

  return { map, isLoading: query.isLoading };
};
