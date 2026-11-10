# CMS build spec: the light redesign

This maps every element on the [redesign canvas](https://claude.ai/artifact/XfjpsUJLVRDwW5AGGpdNr5) to your CMS, so each page stays editable from the admin. Read it alongside the Lovable prompts above; those come next, once you're ready.

- **Exists:** set it in the admin today, no code.
- **Change:** a small change to a row type that already exists.
- **New:** a new row type or table.

Roughly three quarters of the design is Exists. The rest is two new pieces (the Work collection and a work teaser row) and a handful of small field additions.

## Site-wide

| Element | Status | How |
|---|---|---|
| Moving page background | Exists | The liquid mesh stays exactly as it is. Each page sets its four colours on the hero row (Page background panel). Values below. |
| Light theme, paper ground | Exists | Rows are transparent over the mesh by default. |
| Frosted glass cards | Change | One shared card surface token (white at 74%, 10px blur, lilac border), used by boxed, service, process_steps, grid and faq cards. |
| Pillar colours | Change | Add pay-transparency #883500 and manager-enablement #201A53 to src/lib/constants/pillarColors.ts, the one place they live. |
| Navigation | Change | Add Work between Services and Our vows. Keep the Services dropdown and the Contact button. |
| Footer | Change | It already prints each page's plain answer. Add the six services with their colour dots, plus Work, Blog and Privacy links. |
| Deep plum emphasis bands | Exists | Row background #2A0E33 with light text tone: proof strip, problem band, blog CTA. |
| Handwritten notes | Change | subtitle_handwritten works on the hero only. Reuse the shared NoteField on process_steps, image_text and service cards. |
| Hand-drawn gold underline | Change | Optional underline_word on hero and text titles. Decorative, so gold is allowed. |

### Page background colours

| Page | Four mesh colours |
|---|---|
| Homepage, Services, About, Work, Blog, posts, Privacy | #EBD3F0 · #FAECC0 · #E8D6F2 · #F6E9C4 (today's default) |
| Internal Communications | #D9D0D8 · #FAECC0 · #E8E3E7 · #F6E9C4 |
| Employee Experience | #CCD5E1 · #FAECC0 · #E0E6ED · #F6E9C4 |
| People Operations | #E1CCCF · #FAECC0 · #EDE1E2 · #F6E9C4 |
| Fractional HRBP | #CCD7D4 · #FAECC0 · #E0E7E5 · #F6E9C4 |
| Pay Transparency | #E7D7CC · #FAECC0 · #F1E7E0 · #F6E9C4 |
| Manager Enablement | #D2D1DD · #FAECC0 · #E4E4EA · #F6E9C4 |

Strength 70, motion calm, grain 35 everywhere; Privacy drops to strength 55.

## Homepage, row by row

| Section | Row type | Status | Notes |
|---|---|---|---|
| Hero | hero | Change | Add a half-bleed photo layout (visual_layout: card or half-bleed), a second link (secondary_cta_label, secondary_cta_url) and underline_word. Label, title_lines, body, tagline and answer already exist. |
| Proof strip | proof_band | Exists | Four items, deep plum background. |
| Where the work has travelled | world_map | New | The animated map, placed straight after the proof strip. Full spec in the World map section below. |
| Our services | boxed | Change | Six cards. boxed cards already have accent_color (top border, icon, title), so set each to its pillar colour; only the colour dot is new. |
| Clarity & order | image_text | Exists | floating_caption already carries "Same light, better angle." |
| The work, with the lid off | work_teaser | New | Three featured Work entries. |
| Why The Magic Coffin | boxed | Change | Add a dark card variant for the problem statement. |
| Our vows | boxed | Exists | Three cards. |
| FAQ | faq | Exists | With its cover image. |
| Contact | contact | Exists | Same fields as today. |

## Service pages: one template, six pages

| Section | Row type | Status | Notes |
|---|---|---|---|
| Hero | hero | Change | Half-bleed photo plus a "Start with" badge (visual_badge_label, visual_badge_title, visual_badge_text). Title line two takes the pillar colour through the existing accent span. |
| Who this is for | process_steps | Change | Three steps exist; the handwritten "On the first call" line needs the NoteField. |
| What good looks like | image_text | Exists | Row background = pillar colour, text tone light, no image. |
| Here's the problem, and here's the fix | boxed | Change | Same dark problem card as the homepage. |
| What we can help with | service | Change | title, subtitle, time, description, note, tag and deliverables all exist. Add a done_looks_like field (today it sits inside the description) and a start_here flag for the first tier. |
| Work in this area | work_teaser | New | Filters by the page's pillar automatically; hides itself when empty. |
| FAQ | faq | Exists | Moves out of the 50-50 row into its own two-column row. |
| From the blog | from_the_blog | Exists | Three posts. |
| Contact | contact | Exists |  |

## World map row (world_map)

The animated map becomes a section type of its own, like proof_band or from_the_blog. You add it from the tray, drop it on any page, and edit every word, colour, country and animation setting in the admin, with the same Style tab as every other row.

### What you can change in the admin

| Group | Fields | Default |
|---|---|---|
| Header | eyebrow, title_lines (with the accent colour on any words), subtitle, subtitle_handwritten, plus the colour of each | "Where the work has travelled" / "36 countries. One comms function." / subtitle (body copy): "Town halls across time zones, onboarding in every office and news that lands the same day wherever people sit. Gold marks internal comms. Purple marks the countries where the work covered HR as well, and the darkest purple marks the main markets today." |
| Country groups | A list of groups, in fill order. Each has a legend label, a colour, a counter (on or off) and its label, a hover label, a hover label for countries outside the 36, show in legend (on or off) and its countries | Three groups. Internal comms, gold #E5C54F: all 36 countries, counter "36 countries in internal comms". Gold is used as a fill only, never for text. Internal comms and HR, #4D1B5E: the 15 marked below, counter "15 with HR as well". Main markets today, #3E164B: Sweden, Spain, United Kingdom, United States and Romania, no counter. |
| Legend note | a plain text line under the legend, no swatch | "Learning and development: all 36" |
| Other countries | base colour, border colour | #E4DBE8 with white borders |
| Small-country dots | A list: name, longitude, latitude. For countries too small for the 110m world outline | Hong Kong (114.17, 22.32), Singapore (103.82, 1.35) |
| Motion | play when it scrolls into view, on load or never; sweep west to east, east to west, group by group, or all at once; speed calm or lively | Into view, west to east, calm |
| Counters | show counters on or off; animate them on or off | On, animated |
| Replay | show button on or off, button label | On, "Replay the map" |
| Map view | whole world, Europe close-up, Europe and Americas; hide Antarctica | Whole world, Antarctica hidden |
| Accessibility | map description (written for you automatically from the groups, editable) | Generated |
| Footer | note, cta_label, cta_url | Empty |

**How the groups work:** groups run in fill order, and a country takes the colour of the last group that lists it. Each counter counts its own group's countries, and only those among the 36 in the first group. A group may list a country outside the 36, such as Romania. It shows in that group's colour but is never counted. Add a group whenever you like, and it gets its own colour, legend line and counter.

**How it plays:** every country fills gold, west to east. Then the 15 HR countries deepen to purple one by one. The main markets deepen last. Romania fills straight from grey to the darkest purple at that last step.

### The 36 countries

Gold marks internal comms in all 36 countries. Purple marks the 15 where the work covered HR as well. The darkest purple marks the main markets today.

| Region | Countries (internal comms) | Count | With HR as well |
|---|---|---|---|
| AMERS | Canada, United States, Colombia, Mexico, Peru, Ecuador, Brazil | 7 | United States, Colombia, Mexico (3) |
| EMEA | Israel, United Kingdom, Netherlands, France, Belgium, Spain, Italy, Germany, Austria, Switzerland, Denmark, Sweden, Finland, Kenya, South Africa, Mozambique, Tanzania, Norway, Serbia, Republic of the Congo | 20 | United Kingdom, Norway, Denmark, Sweden, Finland, Germany, Switzerland, Spain, France, Netherlands, Belgium (11) |
| APAC | Australia, Thailand, China, India, Cambodia, Indonesia, Japan, Hong Kong, Singapore | 9 | Australia (1) |

Main markets today are Sweden, Spain, United Kingdom, United States and Romania. Romania is a market today but not one of the 36. It fills straight from grey to the darkest purple and is not counted.

Hong Kong and Singapore are too small for the 110m world outline. The row draws them as small dots, placed by longitude and latitude.

### Hover and tap

- Only countries in a group respond: the 36 and Romania. Every other country shows nothing.
- Hover a country and a small dark label follows the pointer. It shows the country name, with one of these under it: "Internal comms", "Internal comms and HR", "Internal comms and HR, main market today" or, for Romania, "Main market today".
- The hovered country gets a dark outline. The two small-country dots behave the same way.
- On touch screens, a tap shows the same label and outline. A tap elsewhere hides it.

### Picking countries

- **Search and tick:** a searchable list of every country, by name.
- **Click the map:** in the editor preview, clicking a country adds it to the next group. A click in the last group clears it from every group.
- **Paste a list:** paste names or two-letter codes, one per line or comma-separated; anything unrecognised is listed so nothing drops silently.
- **Small countries:** Hong Kong and Singapore are too small for the 110m world outline. They show as small dots, placed by longitude and latitude and coloured by their group. They sit in the small-country dots list (name, longitude, latitude).

### How it is built

- **Storage:** the countries are saved as two-letter ISO codes (SE, ES, GB), so a renamed country never breaks a page.
- **Map shapes:** Natural Earth 110m world shapes as a static file (about 40 KB compressed), plus d3-geo, both loaded only when a page carries the map. The rest of the site's speed stays as it is.
- **Animation:** plain CSS, as on the canvas. Replay swaps between two sets of animation names, the one method that restarts reliably in every browser.
- **Reduced motion:** with motion off on the device, or Motion set to never, the finished map shows at once and the counters show their final numbers.
- **Search engines:** the prerender writes the map description and the country list into the page as text, so crawlers and AI answers read the 36 countries too.
- **Where it sits in the tray:** the Numbers family, next to the proof strip: "World map: countries you've worked in, coloured on a map".

### Build steps (ARCHITECTURE.md, "How to add a row type")

1. Add world_map to ROW_TYPES in src/types/rows.ts.
2. src/features/widgets/world_map/schema.ts: a zod/mini looseObject, every field defaulted, reusing the boxed header vocabulary (eyebrow, color_eyebrow, title_lines, color_title, subtitle, subtitle_color, subtitle_handwritten, note, cta_label, cta_url).
3. Renderer src/features/site/rows/WorldMapRow.tsx and editor src/features/admin/site-editor/WorldMapEditor.tsx, both typed from the schema; the editor loaded with lazy(), using ColorField, EyebrowField, NoteField and CtaFields. MoreFields shows seven first: eyebrow, title, subtitle, groups, motion, replay, note.
4. src/features/widgets/world_map/index.tsx registers it; one import line in src/widgets/index.tsx; one variant line in blockFamilies.ts.
5. Tests: group resolution (last group wins), counter maths (countries outside the 36, such as Romania, never counted), hover labels (including "Main market today" for Romania, nothing for countries in no group), small-country dot placement, code lookup, paste parsing, schema defaults. rowRegistry.test.ts and blockFamilies.test.ts check the wiring. A visual baseline of the still, finished map.
6. npm run check, then the darwin and linux baselines.

### Lovable prompt (draft, not sent)

```markdown
Add a new row type, world_map, following ARCHITECTURE.md "How to add a row type" exactly, with src/features/widgets/boxed/ as the reference. Do not change any existing row, page or stored content.

CONTENT SCHEMA (zod/mini looseObject, every field defaulted)
- Header: eyebrow, color_eyebrow, title_lines, color_title, subtitle, subtitle_color, subtitle_handwritten (same names as boxed). Default subtitle (the body copy): "Town halls across time zones, onboarding in every office and news that lands the same day wherever people sit. Gold marks internal comms. Purple marks the countries where the work covered HR as well, and the darkest purple marks the main markets today."
- groups: array, in fill order, of { label, color, show_counter, counter_label, hover_label, hover_label_outside, show_in_legend (default true), countries: string[] of ISO 3166-1 alpha-2 codes }. Default three groups:
  1. "Internal comms", #E5C54F. Gold is used as a fill only, never for text. show_counter true, counter_label "countries in internal comms" (shows "36 countries in internal comms"). hover_label "Internal comms". Countries: CA, US, CO, MX, PE, EC, BR, IL, GB, NL, FR, BE, ES, IT, DE, AT, CH, DK, SE, FI, KE, ZA, MZ, TZ, NO, RS, CG, AU, TH, CN, IN, KH, ID, JP, HK, SG (36).
  2. "Internal comms and HR", #4D1B5E. show_counter true, counter_label "with HR as well" (shows "15 with HR as well"). hover_label "Internal comms and HR". Countries: US, CO, MX, GB, NO, DK, SE, FI, DE, CH, ES, FR, NL, AU, BE (15).
  3. "Main markets today", #3E164B (#4D1B5E 20% darker). show_counter false. hover_label "Internal comms and HR, main market today", hover_label_outside "Main market today". Countries: SE, ES, GB, US, RO.
  CG is the Republic of the Congo, not CD.
- legend_note: a plain text line under the legend, no swatch. Default "Learning and development: all 36".
- small_country_dots: array of { name, lon, lat } for countries too small for the 110m shapes. Default: Hong Kong (lon 114.17, lat 22.32); Singapore (lon 103.82, lat 1.35).
- base_color (#E4DBE8), border_color (#FFFFFF).
- motion: play_on: view|load|never (view); sweep: west_east|east_west|by_group|all (west_east); speed: calm|lively (calm).
- show_counters (true), animate_counters (true), show_replay (true), replay_label ("Replay the map").
- view: world|europe|europe_americas (world); hide_antarctica (true).
- map_alt ("" means generate it from the groups), note, cta_label, cta_url.

RULES
- The first group sets the counted countries (the 36). A later group may list countries outside it, such as RO. Those show in that group's colour, fill straight from base_color at that group's step and are never counted.
- A country takes the colour and hover label of the last group that lists it. For a country outside the first group, hover_label_outside replaces hover_label (empty means use hover_label).
- A group's counter = its own countries that sit in the first group, shown as "{count} {counter_label}" when show_counter is on.
- Store alpha-2 codes; map them to the world-atlas numeric ids with a small lookup file in the widget folder.
- Each small_country_dots entry renders as a small dot, placed by its lon and lat through the same projection. It takes the colour of the last group that lists its country (match the name to its code with the same lookup file).

RENDERER (WorldMapRow.tsx)
- Load world-atlas countries-110m.json from /public and d3-geo + topojson-client with dynamic import, only when the row mounts. Natural Earth projection, memoised.
- SVG with role="img", <title> and <desc> (map_alt or the generated description).
- CSS keyframe animation in group order: every country in the first group fills gold in sweep order (west to east by default). Then the second group's countries deepen to purple one by one. The last group deepens last, one by one, and RO fills straight from base_color to #3E164B at that step. Each added group deepens after the one before it. Small-country dots follow their group. Start on IntersectionObserver (threshold 0.25) when play_on = view.
- Replay button restarts by swapping between two classes with differently named keyframes.
- prefers-reduced-motion or play_on = never: final state, no animation, final counter values.
- Counters in an aria-live="polite" region. Legend from groups with show_in_legend, one line per group, then legend_note as plain text.

HOVER AND TAP
- Only countries listed in a group respond, small-country dots included. Every other country shows nothing.
- On hover, show a small dark label that follows the pointer: the country name, with its hover label under it ("Internal comms", "Internal comms and HR", "Internal comms and HR, main market today" or, for RO, "Main market today").
- The hovered country gets a dark outline.
- Touch screens: a tap shows the same label and outline. A tap elsewhere hides it.
- The label is aria-hidden. The <desc> and the prerendered country list carry the same facts.

EDITOR (WorldMapEditor.tsx, lazy-loaded)
- Groups: add, remove, reorder; per group a ColorField, a counter toggle with its label and the two hover label fields; a searchable country multi-select; a paste box that parses names or codes and lists anything unrecognised; a clickable preview where clicking a country adds it to the next group, and a click in the last group clears it from every group.
- Legend note: one text field.
- Small-country dots: add, remove; name, longitude and latitude per dot.
- Reuse EyebrowField, NoteField, CtaFields, ColorField and TitleLinesEditor. MoreFields primary: eyebrow, title, subtitle, groups, motion, show_replay, note.

WIRING AND QUALITY
- registerWidget in src/features/widgets/world_map/index.tsx; import it in src/widgets/index.tsx; add { type: "world_map", label: "World map", hint: "Countries you've worked in, coloured on a map" } to the Numbers family in blockFamilies.ts.
- scripts/prerender-seo.mjs: write the map description and the country names as text.
- Vitest: group resolution (last group wins), counters (own countries within the first group only, so 36 and 15, with RO never counted), code lookup, paste parsing, schema defaults, hover labels (the outside label for RO, nothing for countries in no group), small-country dot placement. Visual test: the finished still map.
- Comment the code, type everything from the schema, keep the lint ratchet number unchanged or lower, and run npm run check.
```

## The other pages

| Page | Rows | Status |
|---|---|---|
| Services index | hero, boxed in a list layout (number tile, name, tier names, starting price), faq, contact | Change: a list layout option on boxed |
| About | hero, text (The Summoning), process_steps (Why the Coffin?), profile, proof_band, boxed (Who I work with), contact | Exists, apart from the hero change |
| Blog index | blog page header, category chips, lead card, card grid, subscribe | Change: the first card renders wide; the compliance tag text turns Blackcurrant in tags_config |
| Blog post | post header (category, title, excerpt, author once, date), cover, article, cta_band, from_the_blog | Exists |
| Privacy | text | Exists |
| Work index and case study | the Work collection | New: prompt 1 above |

## New pieces, in build order

1. **Pillar colours:** six entries in pillarColors.ts, with the slug manager-enablement everywhere.
2. **Work collection:** the work_items table, the admin Work tab, /work and /work/:slug (prompt 1 above).
3. **work_teaser row:** eyebrow, title_lines, intro, pillar (this page, a chosen pillar, or all), type filter, max_items (default 3), cta_label and cta_url. Built from src/features/widgets/boxed/ as ARCHITECTURE.md describes, in exactly one block family.
4. **Hero half-bleed:** visual_layout, the badge fields, the second link, underline_word.
5. **Card accents:** a dark variant on boxed cards (accent_color already exists); the list layout; done_looks_like and start_here on service tiers; NoteField on process_steps, image_text and service.
6. **Glass card surface** as one token.
7. **Visual baselines:** refresh darwin locally and linux through the visual-baseline workflow after the change, since the design changes on purpose.

## Copy to fix in the admin (no code)

The dashed gold boxes on the canvas mark these, each with a suggested rewrite:

- **Homepage, Why The Magic Coffin:** "A background built for understanding people" and "Numbers instead of adjectives" both cite the redundancy rounds.
- **Homepage FAQ:** "Do you work with companies outside Sweden?" claims current and past clients in six countries.
- **Internal Communications, Pay Transparency, Fractional HRBP, Manager Enablement:** one Why The Magic Coffin card each leans on the redundancy or restructuring rounds.
- **People Operations:** the hero body and The Resurrection both say the service "already runs for current clients".
- **About:** the South Pole paragraph in The Summoning, and the proof band ("3 redundancy rounds" and "6 countries with live Magic Coffin clients").
- **Services index:** the strip title still says "Four pillars".
- **Blog:** the compliance tag's white text on gold fails contrast; the Uber post's sources use em dashes.

## The gate

npm run check (typecheck, lint ratchet, unit tests, build), then the visual suite. Lockfile stays bun.lock. Supabase changes go through Lovable. Type sizes come from the --fs tokens, and uploads go through shrinkImage.
