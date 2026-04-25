/**
 * SiteSectionSchedulePanel — wraps SchedulePublishPanel for `site_content`
 * rows, which the rest of SiteEditor identifies by `section_key` rather
 * than by primary-key id. This component does the lookup.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SchedulePublishPanel from "./SchedulePublishPanel";

interface Props {
  sectionKey: string;
  hasUnsavedChanges?: boolean;
}

const SiteSectionSchedulePanel = ({ sectionKey, hasUnsavedChanges }: Props) => {
  const [rowId, setRowId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("site_content")
        .select("id")
        .eq("section_key", sectionKey)
        .maybeSingle();
      if (!cancelled) setRowId((data as any)?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [sectionKey]);

  if (!rowId) {
    return (
      <div className="text-[11px] text-muted-foreground font-body">
        Save this section once before scheduling.
      </div>
    );
  }

  return (
    <SchedulePublishPanel
      entityType="site_content"
      entityId={rowId}
      entityLabel={sectionKey}
      hasUnsavedChanges={hasUnsavedChanges}
    />
  );
};

export default SiteSectionSchedulePanel;
