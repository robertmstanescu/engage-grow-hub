/**
 * SocialLinksEditor — admin form for the `social_links` site_content row.
 *
 * AUTO-CREATE "CONNECT" COLUMN
 * ─────────────────────────────
 * The public Footer renders social-icon links inside the footer column
 * whose title is "Connect" (case-insensitive). To save admins from having
 * to remember to add that column manually, this editor watches for the
 * first non-empty social URL and — if the footer draft has no Connect
 * column yet — appends one automatically.
 *
 * The injection happens via the `onEnsureConnectColumn` callback passed
 * by the parent (GlobalSettings), which knows how to mutate the footer
 * draft. Keeping the mutation in the parent means we don't need a second
 * cross-section state hook here.
 */

import { useEffect, useRef } from "react";
import { Field } from "./FieldComponents";

const PLATFORMS = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter / X" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "threads", label: "Threads" },
];

interface Props {
  content: Record<string, string>;
  onChange: (field: string, value: string) => void;
  /**
   * Optional hook fired the first time the admin enters ANY social URL.
   * Parent should append a "Connect" column to the footer draft if one
   * doesn't already exist. Idempotent — we only call it once per mount.
   */
  onEnsureConnectColumn?: () => void;
}

const SocialLinksEditor = ({ content, onChange, onEnsureConnectColumn }: Props) => {
  // Guard so we only ever call the parent hook once per editor session,
  // even if the user keeps adding more URLs. The parent is also expected
  // to be idempotent, but two layers of safety > one.
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    if (hasNotifiedRef.current || !onEnsureConnectColumn) return;
    const anyFilled = PLATFORMS.some((p) => (content[p.key] || "").trim().length > 0);
    if (anyFilled) {
      hasNotifiedRef.current = true;
      onEnsureConnectColumn();
    }
  }, [content, onEnsureConnectColumn]);

  return (
    <div className="space-y-3">
      <p className="font-body text-xs text-muted-foreground">
        Enter the full URL for each platform. Leave blank to hide the icon in the footer. A footer column titled
        <strong className="ml-1">Connect</strong> is created automatically the first time you add a link.
      </p>
      {PLATFORMS.map((p) => (
        <Field key={p.key} label={p.label} value={content[p.key] || ""} onChange={(v) => onChange(p.key, v)} />
      ))}
    </div>
  );
};

export default SocialLinksEditor;
