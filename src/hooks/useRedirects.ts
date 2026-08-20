/**
 * useRedirects — react-query bindings for the `redirects` table, admin
 * list view + CRUD. Mirrors `useGlobalWidgets`'s shape exactly.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchAllRedirects, createRedirect, deleteRedirect, type Redirect } from "@/services/redirects";

export type { Redirect };

const QUERY_KEY = ["redirects"] as const;

const fetchAll = async (): Promise<Redirect[]> => {
  const { data, error } = await fetchAllRedirects();
  if (error) throw error;
  return (data || []) as Redirect[];
};

export const useRedirects = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchAll,
    staleTime: 30_000,
    refetchOnMount: true,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: async (input: { from_path: string; to_path: string }) => {
      const { error } = await createRedirect(input.from_path, input.to_path, "manual");
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Redirect added");
    },
    onError: (e: any) => toast.error("Couldn't add redirect", { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteRedirect(id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Redirect deleted");
    },
    onError: (e: any) => toast.error("Couldn't delete redirect", { description: e.message }),
  });

  return {
    redirects: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isMutating: createMutation.isPending || deleteMutation.isPending,
  };
};
