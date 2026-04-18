/**
 * EmailCampaigns — manage draft campaigns and trigger sends.
 *
 * UX patterns at play here (see {@link runDbAction} & {@link runOptimisticAction}):
 *   • Initial fetch shows a {@link ListSkeleton} instead of a blank panel.
 *   • Saves & sends route through {@link runDbAction} so loading + toast are uniform.
 *   • Deletion uses {@link runOptimisticAction} — the row vanishes immediately
 *     and re-appears only if the server rejects (rare, since admins have RLS).
 *   • All write buttons are {@link SpinnerButton}s so a slow network can never
 *     be double-clicked into a duplicate insert/send.
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Send, Edit, Trash2, Eye } from "lucide-react";
import EmailBlockEditor from "./EmailBlockEditor";
import { EmailBlock, createBlock, blocksToHtml } from "./email-blocks";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { SpinnerButton } from "@/components/ui/spinner-button";
import ListFilters from "@/components/ui/list-filters";
import { useListFilters } from "@/hooks/useListFilters";
import { runDbAction, runOptimisticAction } from "@/services/db-helpers";
import {
  fetchAllCampaigns,
  insertCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  type CampaignRecord,
} from "@/services/emailCampaigns";

const EmailCampaigns = () => {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [editing, setEditing] = useState<CampaignRecord | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [subject, setSubject] = useState("");
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  /**
   * Wire the shared search/filter/sort hook. Campaigns have a meaningful
   * "type axis" — their status (draft / sent) — so we expose it as the
   * category dropdown. Sort by alpha = subject line, updated = created_at.
   * URL prefix `c` keeps these params from colliding with other admin tabs.
   */
  const { state: filterState, filteredItems: filteredCampaigns } = useListFilters<CampaignRecord>({
    items: campaigns,
    paramPrefix: "c",
    searchableText: (c) => `${c.subject} ${c.status}`.toLowerCase(),
    categoryOf: (c) => c.status,
    alphaKey: (c) => c.subject.toLowerCase(),
    updatedKey: (c) => c.created_at,
  });

  const reloadCampaigns = async () => {
    const result = await fetchAllCampaigns();
    if (result.error) {
      toast.error("Failed to load campaigns");
      setIsLoadingList(false);
      return;
    }
    setCampaigns((result.data as CampaignRecord[]) || []);
    setIsLoadingList(false);
  };

  useEffect(() => {
    reloadCampaigns();
  }, []);

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

  const handleEdit = (campaign: CampaignRecord) => {
    if (campaign.status === "sent") {
      toast.error("Cannot edit a sent campaign");
      return;
    }
    setIsNew(false);
    setEditing(campaign);
    setSubject(campaign.subject);
    try {
      const parsed = JSON.parse(campaign.html_content);
      if (Array.isArray(parsed)) {
        setBlocks(parsed);
        return;
      }
    } catch {}
    const textBlock = createBlock("text");
    textBlock.content = campaign.html_content;
    setBlocks([textBlock]);
  };

  const handleSave = async () => {
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    const payload = {
      subject,
      html_content: JSON.stringify(blocks),
      status: "draft",
    };

    const result = await runDbAction({
      action: () => (isNew ? insertCampaign(payload) : updateCampaign(editing!.id, payload)),
      setLoading: setIsSavingChanges,
      successMessage: isNew ? "Campaign saved as draft" : "Campaign updated",
    });

    if (result !== null) {
      setEditing(null);
      setIsNew(false);
      reloadCampaigns();
    }
  };

  const handleSend = async (campaignId: string) => {
    if (!confirm("Send this campaign to all marketing subscribers? This cannot be undone.")) return;

    const result = await runDbAction({
      // Edge function call — same shape as a Supabase query (returns { data, error }).
      action: () => sendCampaign(campaignId),
      setLoading: (loading) => setSendingId(loading ? campaignId : null),
      successMessage: null, // We craft a custom message below
      onSuccess: (res: any) => {
        toast.success(`Campaign sent to ${res?.data?.recipientCount || 0} subscribers`);
      },
    });

    if (result !== null) reloadCampaigns();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;

    // Optimistic delete — the row disappears instantly, restored only on failure.
    await runOptimisticAction({
      snapshot: () => campaigns,
      applyOptimistic: () => setCampaigns((c) => c.filter((x) => x.id !== id)),
      rollback: (prev) => setCampaigns(prev),
      action: () => deleteCampaign(id),
      successMessage: "Campaign deleted",
    });
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
          <SpinnerButton
            isLoading={isSavingChanges}
            loadingLabel="Saving…"
            onClick={handleSave}
            className="font-body text-xs uppercase tracking-wider px-5 py-2.5 rounded-full border hover:opacity-80 transition-opacity"
            style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
            Save Draft
          </SpinnerButton>
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

      {/* Search / status filter / sort toolbar — same component the rest of the admin uses. */}
      {!isLoadingList && campaigns.length > 0 && (
        <ListFilters
          state={filterState}
          searchPlaceholder="Search campaigns by subject or status…"
          formatCategoryLabel={(s) => s.charAt(0).toUpperCase() + s.slice(1)}
        />
      )}

      {isLoadingList ? (
        <ListSkeleton rows={4} rowHeight="h-16" />
      ) : campaigns.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground py-8 text-center">No campaigns yet.</p>
      ) : filteredCampaigns.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground py-8 text-center">No campaigns match your filters.</p>
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map((campaign) => (
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
                    <SpinnerButton
                      isLoading={sendingId === campaign.id}
                      onClick={() => handleSend(campaign.id)}
                      className="p-2 hover:opacity-70 transition-opacity"
                      style={{ color: "hsl(var(--primary))" }}
                      title="Send campaign">
                      <Send size={15} />
                    </SpinnerButton>
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
