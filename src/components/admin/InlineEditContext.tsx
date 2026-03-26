import { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invalidateSiteContent } from "@/hooks/useSiteContent";

interface InlineEditContextValue {
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  saveField: (sectionKey: string, fieldPath: string, value: string) => Promise<void>;
}

const InlineEditContext = createContext<InlineEditContextValue>({
  editMode: false,
  setEditMode: () => {},
  saveField: async () => {},
});

export const useInlineEdit = () => useContext(InlineEditContext);

/**
 * Set a nested field on an object using dot-notation path.
 * e.g. setNestedField(obj, "rows.0.content.title", "Hello")
 */
const setNestedField = (obj: any, path: string, value: any): any => {
  const clone = JSON.parse(JSON.stringify(obj));
  const keys = path.split(".");
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = /^\d+$/.test(keys[i]) ? Number(keys[i]) : keys[i];
    if (cur[k] === undefined) cur[k] = {};
    cur = cur[k];
  }
  const last = /^\d+$/.test(keys[keys.length - 1])
    ? Number(keys[keys.length - 1])
    : keys[keys.length - 1];
  cur[last] = value;
  return clone;
};

export const InlineEditProvider = ({ children }: { children: React.ReactNode }) => {
  const [editMode, setEditMode] = useState(false);

  const saveField = useCallback(async (sectionKey: string, fieldPath: string, value: string) => {
    // Read current draft
    const { data: existing } = await supabase
      .from("site_content")
      .select("content, draft_content")
      .eq("section_key", sectionKey)
      .maybeSingle() as any;

    if (!existing) return;

    const draft = existing.draft_content || existing.content || {};
    const updated = setNestedField(draft, fieldPath, value);

    const { error } = await supabase
      .from("site_content")
      .update({ draft_content: updated, content: updated })
      .eq("section_key", sectionKey);

    if (error) {
      toast.error("Failed to save");
      return;
    }

    invalidateSiteContent(sectionKey);
    toast.success("Saved");
  }, []);

  return (
    <InlineEditContext.Provider value={{ editMode, setEditMode, saveField }}>
      {children}
    </InlineEditContext.Provider>
  );
};
