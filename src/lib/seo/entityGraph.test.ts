/**
 * The site's one entity graph (search plan US05): company, website and
 * founder, linked by @id, with only stated facts.
 */
import { describe, it, expect } from "vitest";
import { buildEntityGraph, COMPANY_DEFINITION, FOUNDER_NAME, SERVICES } from "../../../scripts/lib/entityGraph.mjs";

const origin = "https://themagiccoffin.com";
const graph = buildEntityGraph({
  origin,
  brandName: "The Magic Coffin",
  logo: "https://cdn.example.com/logo.png",
  sameAs: ["https://www.linkedin.com/company/themagiccoffin", "", "javascript:alert(1)"],
  bookingUrl: "https://calendar.app.google/x",
  aboutPath: "/p/about-us/",
  founder: { name: "Robert Stănescu", photo: "https://cdn.example.com/r.png", linkedin: "https://www.linkedin.com/in/robertmstanescu/" },
});
const node = (type: string) => graph["@graph"].find((n: { "@type": string }) => n["@type"] === type);

describe("buildEntityGraph", () => {
  it("emits one organization, one website and one founder", () => {
    expect(graph["@graph"].map((n: { "@id": string }) => n["@id"])).toEqual([
      `${origin}/#organization`,
      `${origin}/#website`,
      `${origin}/#founder`,
    ]);
  });

  it("links the three by @id", () => {
    expect(node("Organization").founder).toEqual({ "@id": `${origin}/#founder` });
    expect(node("Person").worksFor).toEqual({ "@id": `${origin}/#organization` });
    expect(node("WebSite").publisher).toEqual({ "@id": `${origin}/#organization` });
  });

  it("carries the stated facts and nothing unsafe", () => {
    const org = node("Organization");
    expect(org.description).toBe(COMPANY_DEFINITION);
    expect(org.address).toMatchObject({ addressLocality: "Stockholm", addressCountry: "SE" });
    expect(org.knowsAbout).toEqual(SERVICES.map(([n]) => n));
    expect(org.sameAs).toEqual(["https://www.linkedin.com/company/themagiccoffin"]);
    expect(org.logo.url).toBe("https://cdn.example.com/logo.png");
    expect(org.contactPoint.url).toBe("https://calendar.app.google/x");
  });

  it("repeats the Facts page: long name, start date, languages, audience, email", () => {
    const org = node("Organization");
    expect(org.alternateName).toBe("The Magic Coffin for Silly Vampires");
    expect(org.foundingDate).toBe("2026-02");
    expect(org.knowsLanguage).toEqual(["en", "ro"]);
    expect(org.audience.audienceType).toContain("10 to 2,000 people");
    expect(org.email).toBe("hello@themagiccoffin.com");
    expect(org.subjectOf.url).toBe(`${origin}/p/facts/`);
    expect(org).not.toHaveProperty("telephone");
    expect(org).not.toHaveProperty("priceRange");
  });

  it("names the founder once, with no alternate name", () => {
    const p = node("Person");
    expect(p.name).toBe("Robert Stănescu");
    expect(p).not.toHaveProperty("alternateName");
    expect(p.sameAs).toEqual(["https://www.linkedin.com/in/robertmstanescu/"]);
    expect(p.url).toBe(`${origin}/p/about-us/`);
  });

  it("falls back to the founder's public name and refuses without a brand", () => {
    const g = buildEntityGraph({ origin, brandName: "X" });
    expect(g["@graph"][2].name).toBe(FOUNDER_NAME);
    expect(buildEntityGraph({ origin, brandName: "" })).toBeNull();
  });
});
