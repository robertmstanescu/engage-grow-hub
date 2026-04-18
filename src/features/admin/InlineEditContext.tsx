/**
 * Inline edit context — powers the floating toolbar on the live site that
 * lets admins click text and save it in place.
 *
 * The save operation is a great showcase of {@link runDbAction}:
 *   - We don't have an explicit loading button to disable here (the toast
 *     itself is the feedback) but we DO need the try/catch + error toast.
 *   - The `successMessage` is intentionally short ("Saved") because the
 *     admin will be doing many of these in a row.
 */

import { createContext, useContext, useState, useCallback } from "react";
import { invalidateSiteContent } from "@/hooks/useSiteContent";
import { updateSectionField } from "@/services/siteContent";
import { runDbAction } from "@/services/db-helpers";

interface InlineEditContextValue {
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  selectMode: boolean;
  setSelectMode: (v: boolean) => void;
  selectedElement: string | null;
  setSelectedElement: (id: string | null) => void;
  saveField: (sectionKey: string, fieldPath: string, value: string) => Promise<void>;
}

const InlineEditContext = createContext<InlineEditContextValue>({
  editMode: false,
  setEditMode: () => {},
  selectMode: false,
  setSelectMode: () => {},
  selectedElement: null,
  setSelectedElement: () => {},
  saveField: async () => {},
});

export const useInlineEdit = () => useContext(InlineEditContext);

export const InlineEditProvider = ({ children }: { children: React.ReactNode }) => {
  const [editMode, setEditMode] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  const saveField = useCallback(async (sectionKey: string, fieldPath: string, value: string) => {
    const result = await runDbAction({
      action: () => updateSectionField(sectionKey, fieldPath, value),
      successMessage: "Saved",
      errorMessage: "Failed to save",
    });
    if (result) invalidateSiteContent(sectionKey);
  }, []);

  return (
    <InlineEditContext.Provider value={{ editMode, setEditMode, selectMode, setSelectMode, selectedElement, setSelectedElement, saveField }}>
      {children}
    </InlineEditContext.Provider>
  );
};
