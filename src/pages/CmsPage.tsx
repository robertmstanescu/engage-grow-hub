import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TextRow from "@/components/rows/TextRow";
import ServiceRow from "@/components/rows/ServiceRow";
import BoxedRow from "@/components/rows/BoxedRow";
import ContactRow from "@/components/rows/ContactRow";
import HeroRow from "@/components/rows/HeroRow";
import type { PageRow } from "@/types/rows";
import NotFound from "./NotFound";
import usePageMeta from "@/hooks/usePageMeta";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const RowRenderer = ({ row, rowIndex }: { row: PageRow; rowIndex: number }) => {
  try {
    if (!row || !row.type) return null;
    const id = row.scope || slugify(row.strip_title || "section");
    const wrapper = (children: React.ReactNode) => (
      <div id={id} style={{ scrollMarginTop: "4rem" }}>{children}</div>
    );
    switch (row.type) {
      case "hero": return wrapper(<HeroRow row={row} />);
      case "text": return wrapper(<TextRow row={row} rowIndex={rowIndex} />);
      case "service": return wrapper(<ServiceRow row={row} rowIndex={rowIndex} />);
      case "boxed": return wrapper(<BoxedRow row={row} rowIndex={rowIndex} />);
      case "contact": return wrapper(<ContactRow row={row} />);
      default: return null;
    }
  } catch {
    return <div className="py-8 text-center font-body text-sm text-destructive">Row render error</div>;
  }
};

const SYSTEM_ROUTES = ["blog", "admin", "unsubscribe", "api", "auth", "login", "signup", "p"];

const CmsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug || SYSTEM_ROUTES.includes(slug)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!data || error) {
        setNotFound(true);
      } else {
        setPage(data);
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "hsl(var(--background))" }}>
        <div className="animate-pulse font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Loading…</div>
      </div>
    );
  }

  if (notFound) return <NotFound />;

  const rows: PageRow[] = page?.page_rows || [];

  usePageMeta({
    title: page?.meta_title || page?.title,
    description: page?.meta_description || undefined,
  });

  return (
    <div className="min-h-screen mt-[20px]">
      <Navbar />
      <div className="pt-16">
        {rows.length === 0 ? (
          <div className="py-20 text-center font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            This page has no content yet. Add rows in the admin panel.
          </div>
        ) : (
          rows.map((row, index) => (
            <RowRenderer key={row.id} row={row} rowIndex={index} />
          ))
        )}
      </div>
      <Footer />
    </div>
  );
};

export default CmsPage;
