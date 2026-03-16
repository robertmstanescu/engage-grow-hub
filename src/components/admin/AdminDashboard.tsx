import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BlogEditor from "./BlogEditor";
import ContactsList from "./ContactsList";
import EmailCampaigns from "./EmailCampaigns";
import SiteEditor from "./SiteEditor";

type Tab = "site" | "blog" | "contacts" | "emails";

interface Props {
  session: any;
}

const AdminDashboard = ({ session }: Props) => {
  const [activeTab, setActiveTab] = useState<Tab>("site");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "site", label: "Main Page" },
    { key: "blog", label: "Blog Posts" },
    { key: "contacts", label: "Contacts" },
    { key: "emails", label: "Email Campaigns" },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "hsl(var(--background))" }}>
      <header className="border-b px-6 py-4 flex items-center justify-between" style={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
        <h1 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>Admin</h1>
        <button
          onClick={handleLogout}
          className="font-body text-xs uppercase tracking-wider hover:opacity-70 transition-opacity"
          style={{ color: "hsl(var(--muted-foreground))" }}>
          Sign Out
        </button>
      </header>

      <div className="max-w-[1000px] mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="font-body text-xs uppercase tracking-[0.12em] px-4 py-2 rounded-full transition-all"
              style={{
                backgroundColor: activeTab === tab.key ? "hsl(var(--primary))" : "transparent",
                color: activeTab === tab.key ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                border: activeTab === tab.key ? "none" : "1px solid hsl(var(--border))",
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "site" && <SiteEditor />}
        {activeTab === "blog" && <BlogEditor />}
        {activeTab === "contacts" && <ContactsList />}
        {activeTab === "emails" && <EmailCampaigns />}
      </div>
    </div>
  );
};

export default AdminDashboard;
