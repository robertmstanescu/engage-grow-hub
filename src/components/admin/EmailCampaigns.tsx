import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Send, Edit, Trash2, Eye } from "lucide-react";
import EmailBlockEditor from "./EmailBlockEditor";
import { EmailBlock, createBlock, blocksToHtml } from "./email-blocks";

interface Campaign {
  id: string;
  subject: string;
  html_content: string;
  status: string;
  sent_at: string | null;
  recipient_count: number;
  created_at: string;
}

const EmailCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [subject, setSubject] = useState("");
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCampaigns(data);
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleNew = () => {
    setIsNew(true);
    setEditing(null);
    setSubject("");
    setBlocks([
      createBlock("hero"),
      createBlock("text"),
      createBlock("button"),
    ]);
  };

  const handleEdit = (campaign: Campaign) => {
    if (campaign.status === "sent") { toast.error("Cannot edit a sent campaign"); return; }
    setIsNew(false);
    setEditing(campaign);
    setSubject(campaign.subject);
    // Try to parse stored blocks, otherwise start fresh
    try {
      const parsed = JSON.parse(campaign.html_content);
      if (Array.isArray(parsed)) {
        setBlocks(parsed);
        return;
      }
    } catch {}
    // Fallback: create a text block with existing HTML
    const textBlock = createBlock("text");
    textBlock.content = campaign.html_content;
    setBlocks([textBlock]);
  };

  const handleSave = async () => {
    if (!subject.trim()) { toast.error("Subject is required"); return; }

    // Store blocks as JSON so we can re-edit them, but also generate HTML
    const payload = {
      subject,
      html_content: JSON.stringify(blocks),
      status: "draft" as const,
    };

    if (isNew) {
      const { error } = await supabase.from("email_campaigns").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Campaign saved as draft");
    } else if (editing) {
      const { error } = await supabase.from("email_campaigns").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Campaign updated");
    }

    setEditing(null);
    setIsNew(false);
    fetchCampaigns();
  };

  const handleSend = async (campaignId: string) => {
    if (!confirm("Send this campaign to all marketing subscribers? This cannot be undone.")) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-campaign", {
        body: { campaignId },
      });
      if (error) throw error;
      toast.success(`Campaign sent to ${data?.recipientCount || 0} subscribers`);
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message || "Failed to send campaign");
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    await supabase.from("email_campaigns").delete().eq("id", id);
    toast.success("Campaign deleted");
    fetchCampaigns();
  };

  if (isNew || editing) {
    const previewHtml = blocksToHtml(blocks);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>
            {isNew ? "New Campaign" : "Edit Campaign"}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 font-body text-xs uppercase tracking-wider hover:opacity-70 transition-opacity"
              style={{ color: "hsl(var(--primary))" }}>
              <Eye size={14} /> {showPreview ? "Editor" : "Preview"}
            </button>
            <button onClick={() => { setEditing(null); setIsNew(false); }} className="font-body text-xs text-muted-foreground hover:opacity-70">
              Cancel
            </button>
          </div>
        </div>

        <input
          placeholder="Email subject line"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-4 py-3 rounded-lg font-body text-sm border"
          style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
        />

        {showPreview ? (
          <div>
            <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">Email Preview</label>
            <div
              className="rounded-lg border overflow-auto"
              style={{ borderColor: "hsl(var(--border))", backgroundColor: "#F4F0EC", maxHeight: "600px" }}>
              <iframe
                srcDoc={previewHtml}
                className="w-full border-0"
                style={{ height: "600px" }}
                title="Email preview"
              />
            </div>
          </div>
        ) : (
          <EmailBlockEditor blocks={blocks} onChange={setBlocks} />
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="font-body text-xs uppercase tracking-wider px-5 py-2.5 rounded-full border hover:opacity-80 transition-opacity"
            style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
            Save Draft
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>Email Campaigns</h2>
        <button
          onClick={handleNew}
          className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
          style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
          <Plus size={14} /> New Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground py-8 text-center">No campaigns yet.</p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center justify-between p-4 rounded-lg border"
              style={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border) / 0.5)" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="font-body text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: campaign.status === "sent" ? "hsl(var(--accent) / 0.15)" : "hsl(var(--muted))",
                      color: campaign.status === "sent" ? "hsl(var(--accent-foreground))" : "hsl(var(--muted-foreground))",
                    }}>
                    {campaign.status}
                  </span>
                  {campaign.status === "sent" && (
                    <span className="font-body text-[10px] text-muted-foreground">
                      Sent to {campaign.recipient_count} subscribers
                    </span>
                  )}
                </div>
                <p className="font-body text-sm font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>{campaign.subject}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {campaign.status === "draft" && (
                  <>
                    <button
                      onClick={() => handleSend(campaign.id)}
                      disabled={sending}
                      className="p-2 hover:opacity-70 transition-opacity"
                      style={{ color: "hsl(var(--primary))" }}
                      title="Send campaign">
                      <Send size={15} />
                    </button>
                    <button onClick={() => handleEdit(campaign)} className="p-2 hover:opacity-70" style={{ color: "hsl(var(--muted-foreground))" }}>
                      <Edit size={15} />
                    </button>
                  </>
                )}
                <button onClick={() => handleDelete(campaign.id)} className="p-2 hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
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

export default EmailCampaigns;
