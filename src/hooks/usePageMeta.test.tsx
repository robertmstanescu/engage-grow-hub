/**
 * US03: on the page a visitor opened, the structured data the server
 * wrote stays exactly as served after the app takes over, so a crawler
 * that runs the app reads the same @ids and types as one that does not.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

vi.mock("@/services/publicSiteContent", () => ({
  fetchPublicSiteContentValue: vi.fn(async () => ({
    organization: { legal_name: "The Magic Coffin" },
  })),
}));
vi.mock("@/hooks/useBrandSettings", () => ({
  fetchBrandIdentity: vi.fn(async () => ({ brandName: "The Magic Coffin", canonicalOrigin: "https://example.com" })),
}));

import usePageMeta from "./usePageMeta";

const ORIGIN = "https://example.com";

/** What a crawler reads: every JSON-LD node's @type and @id, in order. */
const ldSignature = () =>
  Array.from(document.head.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')).flatMap((s) => {
    const parsed = JSON.parse(s.text || s.textContent || "{}");
    const nodes = Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [parsed];
    return nodes.map((n: Record<string, unknown>) => `${String(n["@type"])}|${String(n["@id"] ?? "")}`);
  });

const serverBlock = (mark: string, body: object) => {
  const s = document.createElement("script");
  s.type = "application/ld+json";
  mark.split(" ").forEach((pair) => {
    const [k, v] = pair.split("=");
    s.setAttribute(k, v);
  });
  s.text = JSON.stringify(body);
  document.head.appendChild(s);
};

const seedServerHead = (path: string) => {
  serverBlock("data-prerender=graph", {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${ORIGIN}/#organization` },
      { "@type": "WebSite", "@id": `${ORIGIN}/#website` },
      { "@type": "Person", "@id": `${ORIGIN}/#founder` },
    ],
  });
  serverBlock(`data-prerender=page data-path=${path}`, { "@type": "Service", provider: { "@id": `${ORIGIN}/#organization` } });
  serverBlock(`data-prerender=page data-path=${path}`, { "@type": "FAQPage" });
  serverBlock(`data-prerender=page data-path=${path}`, { "@type": "BreadcrumbList" });
};

let go: ((to: string) => void) | null = null;
const Page = () => {
  go = useNavigate();
  usePageMeta({
    title: "Internal communications",
    serviceSchema: { name: "Internal communications" },
    faqSchema: [{ question: "Q?", answer: "A." }],
    breadcrumbs: [{ name: "Home", path: "/" }, { name: "Internal communications" }],
  });
  return null;
};
const wrap = (path: string, child: ReactNode) => <MemoryRouter initialEntries={[path]}>{child}</MemoryRouter>;

describe("usePageMeta structured data (US03)", () => {
  beforeEach(() => {
    document.head.innerHTML = "<title>x</title>";
  });

  it("keeps the server's blocks unchanged on the first page", async () => {
    seedServerHead("/services/internal-communications/");
    const before = ldSignature();
    render(wrap("/services/internal-communications/", <Page />));
    await waitFor(() => expect(document.title).toBe("Internal communications | The Magic Coffin"));
    expect(ldSignature()).toEqual(before);
    expect(document.getElementById("mc-jsonld-faq")).toBeNull();
    expect(document.getElementById("mc-jsonld-org")).toBeNull();
  });

  it("writes its own blocks after a move, and keeps the entity graph", async () => {
    seedServerHead("/services/internal-communications/");
    render(wrap("/services/internal-communications/", <Page />));
    await waitFor(() => expect(document.title).toContain("Internal communications"));
    await act(async () => go?.("/services/pay-transparency/"));
    await waitFor(() => expect(document.getElementById("mc-jsonld-faq")).not.toBeNull());
    expect(document.querySelectorAll('[data-prerender="page"]').length).toBe(0);
    expect(document.querySelectorAll('[data-prerender="graph"]').length).toBe(1);
  });

  it("replaces blocks written for a different path", async () => {
    seedServerHead("/services/other/");
    render(wrap("/services/internal-communications/", <Page />));
    await waitFor(() => expect(document.getElementById("mc-jsonld-breadcrumb")).not.toBeNull());
    expect(document.querySelectorAll('[data-prerender="page"]').length).toBe(0);
  });
});
