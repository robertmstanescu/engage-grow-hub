/**
 * ONE entity graph for the whole site (search plan US05, 25 Nov 2026):
 * the company (#organization), the site (#website) and the founder
 * (#founder), emitted once per page as a single @graph and referenced by
 * @id from posts (author, publisher), service pages (provider) and Work
 * items (author, publisher). Pure function: the prerender passes in what
 * the database holds, nothing here fetches.
 *
 * Only facts the business has stated go in: the name, the definition,
 * Stockholm in Sweden, the six services, the booking link, the LinkedIn
 * pages and the founder's name and photo. No phone, street or price.
 *
 * The Facts page (/p/facts/, search plan F6) states the same facts in
 * words. FACTS below holds the ones the schema repeats; when the page
 * changes, change them here in the same words and the same day.
 */

/** The company in one sentence, word for word from the search plan (US09). */
export const COMPANY_DEFINITION =
  "The Magic Coffin is an internal communications, employee experience and pay transparency consultancy for start-ups and scale-ups.";

/** The founder's public name (Robert, 25 Nov 2026): no alternate names. */
export const FOUNDER_NAME = "Robert Stănescu";

/** The six services, in the site's order, with their pages. */
export const SERVICES = [
  ["Internal Communications", "/services/internal-communications/"],
  ["Employee Experience", "/services/employee-experience/"],
  ["Pay Transparency", "/services/pay-transparency/"],
  ["People Operations", "/services/people-operations/"],
  ["Fractional HRBP", "/services/fractional-hrbp/"],
  ["Manager Enablement", "/services/manager-enablement/"],
];

/** Facts as the Facts page states them (checked 25 Nov 2026). */
export const FACTS = {
  /** The long name, as the copyright line prints it. */
  longName: "The Magic Coffin for Silly Vampires",
  /** "Started: February 2026." */
  foundingDate: "2026-02",
  /** "Working languages: English and Romanian." (BCP 47 codes) */
  languages: ["en", "ro"],
  /** "Who it works with: start-ups and scale-ups of around 10 to 2,000 people." */
  audience: "Start-ups and scale-ups of around 10 to 2,000 people",
  /** The address the footer already shows on every page. */
  email: "hello@themagiccoffin.com",
  /** The page that states all of the above. */
  factsPath: "/p/facts/",
};

export const orgId = (origin) => `${origin}/#organization`;
export const websiteId = (origin) => `${origin}/#website`;
export const founderId = (origin) => `${origin}/#founder`;

const isUrl = (v) => typeof v === "string" && /^https:\/\//i.test(v.trim());
const text = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * @param {{
 *   origin: string, brandName: string, description?: string, logo?: string,
 *   sameAs?: string[], bookingUrl?: string, aboutPath?: string,
 *   founder?: { name?: string, photo?: string, linkedin?: string },
 * }} input
 * @returns {object|null} one JSON-LD document with an @graph, or null without a brand
 */
export function buildEntityGraph(input) {
  const origin = text(input?.origin).replace(/\/+$/, "");
  const brandName = text(input?.brandName);
  if (!origin || !brandName) return null;

  const knowsAbout = SERVICES.map(([name]) => name);
  const sameAs = [...new Set((input.sameAs || []).filter(isUrl).map((s) => s.trim()))];
  const founderName = text(input.founder?.name) || FOUNDER_NAME;

  const organization = {
    "@type": "Organization",
    "@id": orgId(origin),
    name: brandName,
    alternateName: FACTS.longName,
    url: `${origin}/`,
    description: text(input.description) || COMPANY_DEFINITION,
    foundingDate: FACTS.foundingDate,
    email: FACTS.email,
    knowsLanguage: FACTS.languages,
    audience: { "@type": "BusinessAudience", audienceType: FACTS.audience },
    // The page that states these facts in words, each with its checked date.
    subjectOf: { "@type": "WebPage", name: "Facts", url: `${origin}${FACTS.factsPath}` },
    ...(isUrl(input.logo) ? { logo: { "@type": "ImageObject", url: input.logo.trim() } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    founder: { "@id": founderId(origin) },
    address: { "@type": "PostalAddress", addressLocality: "Stockholm", addressCountry: "SE" },
    areaServed: "Worldwide",
    knowsAbout,
    makesOffer: SERVICES.map(([name, path]) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name, url: `${origin}${path}` },
    })),
    ...(isUrl(input.bookingUrl)
      ? { contactPoint: { "@type": "ContactPoint", contactType: "Book a free call", url: input.bookingUrl.trim() } }
      : {}),
  };

  const website = {
    "@type": "WebSite",
    "@id": websiteId(origin),
    name: brandName,
    url: `${origin}/`,
    inLanguage: "en-GB",
    publisher: { "@id": orgId(origin) },
  };

  const person = {
    "@type": "Person",
    "@id": founderId(origin),
    name: founderName,
    jobTitle: "Founder",
    ...(text(input.aboutPath) ? { url: `${origin}${input.aboutPath}` } : {}),
    ...(isUrl(input.founder?.photo) ? { image: input.founder.photo.trim() } : {}),
    ...(isUrl(input.founder?.linkedin) ? { sameAs: [input.founder.linkedin.trim()] } : {}),
    worksFor: { "@id": orgId(origin) },
    address: { "@type": "PostalAddress", addressLocality: "Stockholm", addressCountry: "SE" },
    knowsAbout,
  };

  return { "@context": "https://schema.org", "@graph": [organization, website, person] };
}
