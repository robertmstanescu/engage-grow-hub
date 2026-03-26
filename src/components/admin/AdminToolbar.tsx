import { Pencil, PencilOff, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useInlineEdit } from "./InlineEditContext";

const AdminToolbar = () => {
  const { isAdmin, loading } = useAdminStatus();
  const { editMode, setEditMode } = useInlineEdit();
  const navigate = useNavigate();

  if (loading || !isAdmin) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2"
      style={{ pointerEvents: "auto" }}
    >
      <button
        onClick={() => setEditMode(!editMode)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-xs font-body uppercase tracking-wider font-semibold transition-all hover:scale-105"
        style={{
          backgroundColor: editMode ? "hsl(var(--accent))" : "hsl(var(--secondary))",
          color: editMode ? "hsl(var(--accent-foreground))" : "hsl(var(--secondary-foreground))",
        }}
        title={editMode ? "Exit edit mode" : "Edit this page"}
      >
        {editMode ? <PencilOff size={14} /> : <Pencil size={14} />}
        {editMode ? "Done Editing" : "Edit Page"}
      </button>
      <button
        onClick={() => navigate("/admin")}
        className="flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all hover:scale-105"
        style={{
          backgroundColor: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
        }}
        title="Open admin dashboard"
      >
        <Settings size={16} />
      </button>
    </div>
  );
};

export default AdminToolbar;
