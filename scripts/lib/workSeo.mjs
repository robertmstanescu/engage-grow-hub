/**
 * Search, answer-engine and AI-crawler data for the Work pages.
 *
 * Pure functions, shared by scripts/prerender-seo.mjs (bare node at
 * postbuild) and its unit test (src/lib/work/workSeo.test.ts). Nothing
 * here fetches or writes.
 *
 * Every Work page gets:
 *   - its own search title and description (meta_title / meta_description,
 *     falling back to title / summary)
 *   - an Article whose author is the founder, whose subject is the
 *     related service and which sits inside the /work/ collection, so
 *     search engines and AI answers can tie the piece to the person and
 *     the offer
 *   - the plain-facts summary (ai_summary) as the Article abstract and in
 *     llms.txt
 *   - the honesty label as disambiguatingDescription, so a playbook is
 *     never read as client work
 */

/** Pillar key → [service name, service page slug]. Mirrors workLabels.ts + pillarColors.ts. */
export const WORK_PILLARS = {
  ic: ["Internal Communications", "internal-communications"],
  ex: ["Employee Experience", "employee-experience"],
  ops: ["People Operations", "people-operations"],
  hrbp: ["Fractional HRBP", "fractional-hrbp"],
  pay: ["Pay Transparency", "pay-transparency"],
  mgr: ["Manager Enablement", "manager-enablement"],
};

/** Type key → the words used in titles and llms.txt. Mirrors TYPE_CHIP. */
export const WORK_TYPES = { case: "Case study", artefact: "Artefact", playbook: "Playbook" };

/** Columns the prerender needs from work_items. */
export const WORK_SELECT =
  "slug,title,summary,type,pillar,honesty_label,role_title,year,tags,cover_image,cover_image_alt,og_image,meta_title,meta_description,ai_summary,case_rows,published_at,updated_at";

const clean = (v, max = 400) => {
  const s = String(v ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

/** Description for the /work/ index, built from what is published. */
export function workIndexDescription(items, brandName = "") {
  const pillars = [...new Set((items || []).map((i) => WORK_PILLARS[i?.pillar]?.[0]).filter(Boolean))];
  const areas = pillars.length > 1 ? `${pillars.slice(0, -1).join(", ")} and ${pillars.at(-1)}` : pillars[0] || "people and culture";
  const who = brandName ? `${brandName}: ` : "";
  return clean(`${who}case studies, artefacts and playbooks in ${areas}.`, 300);
}

/** Title, description and image for one Work page. */
export function workItemMeta(item) {
  return {
    title: clean(item?.meta_title, 120) || clean(item?.title, 120),
    description: clean(item?.meta_description, 300) || clean(item?.summary, 300) || clean(item?.ai_summary, 300),
    image: item?.og_image || item?.cover_image || "",
  };
}

/**
 * The Article for one Work page.
 * ctx: { abs(path), absImage(src), path, brandName, origin, person }
 * `person` is the founder Person node (or null when the About page names nobody).
 */
export function workItemArticleLd(item, ctx) {
  const meta = workItemMeta(item);
  const pillar = WORK_PILLARS[item?.pillar];
  const tags = Array.isArray(item?.tags) ? item.tags.map((t) => clean(t, 60)).filter(Boolean) : [];
  const url = ctx.abs(ctx.path);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: clean(item?.title, 110),
    description: meta.description,
    image: ctx.absImage(meta.image),
    url,
    mainEntityOfPage: url,
    inLanguage: "en-GB",
    isPartOf: { "@type": "CollectionPage", "@id": ctx.abs("/work/"), name: "Work" },
  };
  if (item?.type && WORK_TYPES[item.type]) ld.genre = WORK_TYPES[item.type];
  if (clean(item?.ai_summary)) ld.abstract = clean(item.ai_summary, 1200);
  if (clean(item?.honesty_label)) ld.disambiguatingDescription = clean(item.honesty_label, 200);
  if (tags.length) ld.keywords = tags.join(", ");
  if (item?.published_at) ld.datePublished = item.published_at;
  if (item?.updated_at) ld.dateModified = item.updated_at;
  if (pillar) {
    ld.about = {
      "@type": "Service",
      name: pillar[0],
      url: ctx.abs(`/services/${pillar[1]}/`),
      ...(ctx.brandName ? { provider: { "@id": `${ctx.origin}/#organization` } } : {}),
    };
  }
  if (ctx.person?.name) ld.author = { "@type": "Person", "@id": ctx.person["@id"], name: ctx.person.name, url: ctx.person.url };
  if (ctx.brandName) ld.publisher = { "@type": "Organization", "@id": `${ctx.origin}/#organization`, name: ctx.brandName };
  return ld;
}

/** Process steps and quotes are body copy too; the generic reader skips them. */
export function workReadable(item, generic) {
  const paragraphs = [clean(item?.summary, 400)];
  for (const row of Array.isArray(item?.case_rows) ? item.case_rows : []) {
    const data = row?.content || row?.data || {};
    if (row?.type === "process_steps" && Array.isArray(data.steps)) {
      for (const s of data.steps) paragraphs.push(clean(`${clean(s?.title, 80)}: ${clean(s?.description, 300)}`, 400));
    }
    if (row?.type === "quote_band" && data.quote) {
      paragraphs.push(clean(`"${clean(data.quote, 600)}" ${clean(data.name, 80)}, ${clean(data.role, 120)}`, 800));
    }
  }
  const merged = [...paragraphs, ...((generic && generic.paragraphs) || [])].filter(Boolean);
  return { heading: clean(item?.title, 160), paragraphs: [...new Set(merged)].slice(0, 20) };
}

/** The "## Work" block of llms.txt. */
export function workLlmsLines(items, abs) {
  const out = [];
  for (const item of items || []) {
    if (!item?.slug) continue;
    const kind = [WORK_TYPES[item.type], WORK_PILLARS[item.pillar]?.[0]].filter(Boolean).join(", ");
    const facts = clean(item.ai_summary, 400) || clean(item.summary, 240);
    out.push(`- [${clean(item.title, 120)}](${abs(`/work/${item.slug}/`)}): ${kind ? `${kind}. ` : ""}${facts}`);
  }
  return out;
}
