import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string | null;
  subscribed_to_marketing: boolean;
  created_at: string;
}

const ContactsList = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);

  const fetchContacts = async () => {
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setContacts(data);
  };

  useEffect(() => { fetchContacts(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    await supabase.from("contacts").delete().eq("id", id);
    toast.success("Contact deleted");
    fetchContacts();
  };

  const marketingSubscribers = contacts.filter(c => c.subscribed_to_marketing);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>Contacts</h2>
        <span className="font-body text-xs text-muted-foreground">
          {contacts.length} total · {marketingSubscribers.length} marketing opt-ins
        </span>
      </div>

      {contacts.length === 0 ? (
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
                <button onClick={() => handleDelete(contact.id)} className="p-2 hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
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
