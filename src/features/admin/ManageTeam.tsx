/**
 * ManageTeam — invite other admins by email.
 *
 * Flow:
 *   1) Admin enters an email and clicks "Send invite".
 *   2) The `invite-admin` edge function inserts a row into
 *      `admin_invites` and sends a Supabase magic link to that email.
 *   3) When the invitee clicks the link, the `handle_new_user` DB
 *      trigger sees the matching invite row and auto-promotes them to
 *      admin on first sign-in.
 *
 * The token-based invite check happens server-side (in the trigger),
 * so a leaked `admin_invites` row alone can never grant admin — the
 * recipient still has to verify control of the email.
 */

import { useEffect, useState } from "react";
import { Mail, Trash2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { runDbAction } from "@/services/db-helpers";
import { SpinnerButton } from "@/components/ui/spinner-button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Invite {
  id: string;
  email: string;
  accepted_at: string | null;
  created_at: string;
}

interface AdminRow {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string;
}

const ManageTeam = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: invitesData }, { data: adminsData }] = await Promise.all([
      supabase.from("admin_invites").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_users").select("id, user_id"),
    ]);
    setInvites((invitesData as Invite[]) || []);

    // Fetch profile + email for each admin.
    if (adminsData && adminsData.length > 0) {
      const userIds = adminsData.map((a: any) => a.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      const profilesMap = new Map((profilesData || []).map((p: any) => [p.user_id, p]));
      // We can't read auth.users from the client, so we list display_name only.
      setAdmins(
        adminsData.map((a: any) => ({
          id: a.id,
          user_id: a.user_id,
          display_name: profilesMap.get(a.user_id)?.display_name ?? null,
          email: "—",
        }))
      );
    } else {
      setAdmins([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    const result = await runDbAction({
      action: () => supabase.functions.invoke("invite-admin", { body: { email } }),
      setLoading: setSending,
      successMessage: `Invite sent to ${email}`,
      errorMessage: "Could not send invite",
    });
    if (result) {
      setEmail("");
      load();
    }
  };

  const revokeInvite = async (id: string) => {
    if (!confirm("Revoke this invite?")) return;
    await runDbAction({
      action: () => supabase.from("admin_invites").delete().eq("id", id),
      successMessage: "Invite revoked",
    });
    load();
  };

  const removeAdmin = async (userId: string) => {
    if (!confirm("Remove this admin? They will lose all admin access.")) return;
    await runDbAction({
      action: () => supabase.from("admin_users").delete().eq("user_id", userId),
      successMessage: "Admin removed",
    });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-black" style={{ color: "hsl(260 30% 20%)" }}>Manage Team</h2>
        <p className="font-body text-xs mt-1" style={{ color: "hsl(260 20% 40%)" }}>
          Invite admins by email. They'll get a magic link — clicking it grants admin access automatically.
        </p>
      </div>

      {/* Invite form */}
      <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: "white", borderColor: "hsl(260 15% 88%)" }}>
        <h3 className="font-display text-[11px] uppercase tracking-wider font-bold" style={{ color: "hsl(260 30% 20%)" }}>
          Send new invite
        </h3>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@themagiccoffin.com"
            className="flex-1 px-3 py-2 rounded-lg font-body text-sm border"
            style={{ borderColor: "hsl(260 15% 88%)", backgroundColor: "white", color: "hsl(260 30% 20%)" }}
          />
          <SpinnerButton
            onClick={handleInvite}
            isLoading={sending}
            loadingLabel="Sending…"
            icon={<Send size={12} />}
            className="font-display text-[10px] uppercase tracking-[0.08em] font-bold px-4 py-2 rounded-full hover:opacity-85 transition-opacity"
            style={{ backgroundColor: "hsl(260 30% 20%)", color: "white" }}
          >
            Send invite
          </SpinnerButton>
        </div>
      </div>

      {/* Current admins */}
      <div>
        <h3 className="font-display text-[11px] uppercase tracking-wider font-bold mb-2" style={{ color: "hsl(260 30% 20%)" }}>
          Current admins
        </h3>
        {loading ? (
          <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : admins.length === 0 ? (
          <p className="font-body text-xs italic" style={{ color: "hsl(260 20% 40%)" }}>No admins yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border p-3" style={{ backgroundColor: "white", borderColor: "hsl(260 15% 88%)" }}>
                <div>
                  <p className="font-body text-sm font-medium" style={{ color: "hsl(260 30% 20%)" }}>
                    {a.display_name || "(no name set)"}
                  </p>
                  <p className="font-body text-[10px]" style={{ color: "hsl(260 20% 40%)" }}>{a.user_id.slice(0, 8)}…</p>
                </div>
                <button
                  onClick={() => removeAdmin(a.user_id)}
                  className="p-2 rounded hover:opacity-70 transition-opacity"
                  style={{ color: "hsl(0 70% 50%)" }}
                  title="Remove admin"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pending invites */}
      <div>
        <h3 className="font-display text-[11px] uppercase tracking-wider font-bold mb-2" style={{ color: "hsl(260 30% 20%)" }}>
          Pending invites
        </h3>
        {loading ? (
          <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : invites.filter((i) => !i.accepted_at).length === 0 ? (
          <p className="font-body text-xs italic" style={{ color: "hsl(260 20% 40%)" }}>No pending invites.</p>
        ) : (
          <ul className="space-y-1.5">
            {invites.filter((i) => !i.accepted_at).map((inv) => (
              <li key={inv.id} className="flex items-center justify-between rounded-lg border p-3" style={{ backgroundColor: "white", borderColor: "hsl(260 15% 88%)" }}>
                <div className="flex items-center gap-2">
                  <Mail size={12} style={{ color: "hsl(260 20% 40%)" }} />
                  <span className="font-body text-sm" style={{ color: "hsl(260 30% 20%)" }}>{inv.email}</span>
                </div>
                <button
                  onClick={() => revokeInvite(inv.id)}
                  className="p-2 rounded hover:opacity-70 transition-opacity"
                  style={{ color: "hsl(0 70% 50%)" }}
                  title="Revoke invite"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ManageTeam;
