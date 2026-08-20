import { useState, useEffect } from "react";
import { Trash2, Linkedin } from "lucide-react";
import { fetchAllContacts, deleteContact, type ContactRecord } from "@/services/contacts";
import { DEFAULT_PAGE_SIZE } from "@/services/pagination";
import { runOptimisticAction, handleDatabaseError } from "@/services/db-helpers";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { ListPager } from "@/components/ui/list-pager";
import { toast } from "sonner";
import { useListFilters } from "@/hooks/useListFilters";
import ListFilters from "@/components/ui/list-filters";
import LeadScoreBadge from "./LeadScoreBadge";

const ContactsList = () => {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);
  /**
   * Initial load uses a dedicated `isLoadingContacts` flag rather than the
   * shared `isSavingChanges` so the skeleton doesn't get hidden when the
   * user later deletes a row (which would also flip `saving` → false).
   */
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  // Search across name + email + company. Marketing opt-in becomes the
  // category axis so admins can quickly isolate subscribers.
  const contactFilters = useListFilters<ContactRecord>({
    items: contacts,
    paramPrefix: "c",
    defaultSort: "manual",
    searchableText: (c) => `${c.name} ${c.email} ${c.company || ""} ${c.message || ""}`.toLowerCase(),
    categoryOf: (c) => (c.subscribed_to_marketing ? "marketing" : "all-others"),
    alphaKey: (c) => c.name.toLowerCase(),
    updatedKey: (c) => c.created_at,
    // Epic 4 / US 4.3 — power the "Highest Intent" sort. Unscored leads
    // sink to the bottom (handled inside useListFilters).
    scoreKey: (c) => c.ai_score,
  });
  const filteredContacts = contactFilters.filteredItems;

  useEffect(() => {
    /**
     * Plain try/catch here (not runDbAction) because we want to silently
     * fail to an empty state on initial load — the toast would be noisy
     * for a first-paint failure that the user can recover by refreshing.
     */
    (async () => {
      setIsLoadingContacts(true);
      try {
        const { data, error, count } = await fetchAllContacts(page, DEFAULT_PAGE_SIZE);
        if (error) toast.error(handleDatabaseError(error, "Failed to load contacts"));
        if (data) setContacts(data);
        if (typeof count === "number") setTotalContacts(count);
      } finally {
        // ALWAYS reset, even if the network throws synchronously.
        setIsLoadingContacts(false);
      }
    })();
  }, [page]);

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
      applyOptimistic: () => {
        setContacts((prev) => prev.filter((c) => c.id !== id));
        setTotalContacts((prev) => Math.max(0, prev - 1));
      },
      rollback: (prev) => {
        setContacts(prev);
        setTotalContacts((prev) => prev + 1);
      },
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
          {totalContacts} total · {marketingSubscribers.length} marketing opt-ins on this page
        </span>
      </div>

      {isLoadingContacts ? (
        <ListSkeleton rows={4} />
      ) : contacts.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground py-8 text-center">No contacts yet.</p>
      ) : (
        <div className="space-y-3">
          {contacts.length > 1 && (
            <ListFilters
              state={contactFilters.state}
              searchPlaceholder="Search contacts…"
              formatCategoryLabel={(c) => (c === "marketing" ? "Marketing opt-ins" : "Other")}
              showScoreSort
            />
          )}
          {filteredContacts.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground py-6 text-center">No contacts match your filters.</p>
          ) : filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="p-4 rounded-lg border"
              style={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border) / 0.5)" }}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-body text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>{contact.name}</span>
                    {/* Epic 4 / US 4.3 — enriched LinkedIn link for rapid manual vetting */}
                    {contact.linkedin_url && (
                      <a
                        href={contact.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View LinkedIn profile"
                        aria-label={`View ${contact.name}'s LinkedIn profile`}
                        className="inline-flex items-center justify-center p-1 rounded hover:opacity-70 transition-opacity"
                        style={{ color: "hsl(var(--primary))" }}
                        // Stop propagation so clicking the icon doesn't accidentally trigger any future row-level click handler.
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Linkedin size={13} />
                      </a>
                    )}
                    <span className="font-body text-xs text-muted-foreground">{contact.email}</span>
                    <LeadScoreBadge score={contact.ai_score} />
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
          <ListPager page={page} pageSize={DEFAULT_PAGE_SIZE} total={totalContacts} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

export default ContactsList;
