Plan only for now: please do not change any code until I approve the plan.

We are rebranding the design of themagiccoffin.com. The full handover is in the repo at `docs/redesign/`. Read these files first, in this order:

1. `docs/redesign/00-HANDOVER.md`: the spec. Its section 0 has four rules, and they override everything else.
2. `docs/redesign/03-appendix-section-layouts.md`: every page broken into its sections, with exact layout styles.
3. `docs/redesign/artboards/*.dc.html`: the design source of every page and admin screen. All styles are inline. `artboards/index.html` lists them, and `artboards/img/` holds every image they use.
4. `docs/redesign/shots/*.jpg`: full-page screenshots at 1440px, and phone screenshots at 390px.
5. `docs/redesign/tokens/*.css`: the design system tokens. On the website, use `web.css` and section 2 of the spec.
6. `docs/redesign/01-cms-drives-the-design.md` and `02-cms-build-spec.md`: background on how each design element maps to the CMS. The spec wins where they disagree.

The rules, in short:

- **Design only. Keep every word of the current site copy exactly as it is in the database.** Text in the artboards and screenshots is placeholder. Never copy it into pages, defaults, seeds or migrations. Never update existing content rows.
- **The frontend and backend must match.** Every visual option is a field in the row or widget schema: the admin edits it, the renderer reads it, it has a default, and a test proves the schema, editor and renderer agree. Nothing is hard-coded into a page component.
- **Follow `ARCHITECTURE.md` and the project knowledge:** row pipeline, registerWidget, lazy editors, the eight-field limit, block families, the section library, image rules, the public bundle rules, `npm run check` and visual baselines.
- **The new Work and proof tables start empty.** I add the content in the admin.
- **Reproduce the artboards exactly** in layout, spacing, colour, type, radius, shadow, motion and responsive behaviour. If the spec is silent on something, match the artboard file.

Please reply with:

1. Your plan for each phase in section 9 of the spec: the files you will touch, the schema fields you will add, the migrations, and the tests.
2. Every place where the current code or data makes something in the spec hard or impossible, and what you suggest instead.
3. How you will prove after each phase that no page's text changed. I suggest a before/after text diff of every public page.

Once I approve, build one phase at a time. Each phase ends with `npm run check` passing and a short note of what changed in the admin and on the site.
