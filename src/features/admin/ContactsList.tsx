import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { fetchAllContacts, deleteContact, type ContactRecord } from "@/services/contacts";
import { runDbAction, runOptimisticAction, handleDatabaseError } from "@/services/db-helpers";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { toast } from "sonner";

const ContactsList = () => {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  /**
   * Initial load uses a dedicated `isLoadingContacts` flag rather than the
   * shared `isSavingChanges` so the skeleton doesn't get hidden when the
   * user later deletes a row (which would also flip `saving` → false).
   */
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  useEffect(() => {
    /**
     * Plain try/catch here (not runDbAction) because we want to silently
     * fail to an empty state on initial load — the toast would be noisy
     * for a first-paint failure that the user can recover by refreshing.
     */
    (async () => {
      try {
        const { data, error } = await fetchAllContacts();
        if (error) toast.error(handleDatabaseError(error, "Failed to load contacts"));
        if (data) setContacts(data);
      } finally {
        // ALWAYS reset, even if the network throws synchronously.
        setIsLoadingContacts(false);
      }
    })();
  }, []);

  /**
   * OPTIMISTIC DELETE
   * -----------------
   * The user clicks delete → the row vanishes immediately → we tell the
   * server. If the server says no, we put the row back AND toast the error.
   * This makes the admin feel snappy on slow connections.
   */
  const handleDatabaseDelete = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    await runOptimisticAction({
      snapshot: () => contacts,
      applyOptimistic: () => setContacts((prev) => prev.filter((c) => c.id !== id)),
      rollback: (prev) => setContacts(prev),
      action: async () => await deleteContact(id),
      successMessage: "Contact deleted",
    });
  };

  const marketingSubscribers = contacts.filter((c) => c.subscribed_to_marketing);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>Contacts</h2>
        <span className="font-body text-xs text-muted-foreground">
          {contacts.length} total · {marketingSubscribers.length} marketing opt-ins
        </span>
      </div>

      {isLoadingContacts ? (
        <ListSkeleton rows={4} />
      ) : contacts.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground py-8 text-center">No contacts yet.</p>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="p-4 rounded-lg border"
              style={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border) / 0.5)" }}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-body text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>{contact.name}</span>
                    <span className="font-body text-xs text-muted-foreground">{contact.email}</span>
                    {contact.subscribed_to_marketing && (
                      <span
                        className="font-body text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent-foreground))" }}>
                        Marketing
                      </span>
                    )}
                  </div>
                  {contact.company && <p className="font-body text-xs text-muted-foreground mb-1">{contact.company}</p>}
                  {contact.message && <p className="font-body text-xs text-foreground/70 mt-1">{contact.message}</p>}
                  <p className="font-body text-[10px] text-muted-foreground mt-2">
                    {new Date(contact.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <button onClick={() => handleDatabaseDelete(contact.id)} className="p-2 hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactsList;
