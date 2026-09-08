# The Magic Coffin for Silly Vampires — website and admin

Consulting website for internal communications and employee engagement,
with a row-based CMS, blog, contact and lead-magnet forms, analytics and
email campaigns. Built with Lovable; edited both in Lovable and locally.

- Live site: https://themagiccoffin.com
- Lovable project: https://lovable.dev/projects/84fc5959-4725-4ee2-8ad4-b8ce39f00368
- How the code is organised and how to extend it: **[ARCHITECTURE.md](./ARCHITECTURE.md)**

## Working locally

```sh
npm install        # or: bun install (bun.lock is the lockfile Lovable builds from)
npm run dev        # Vite dev server
npm run check      # typecheck + lint + unit tests + build — what CI runs
npm run test:visual   # screenshot suite against the committed baseline (build first)
```

Changes pushed to `main` are picked up by Lovable; publish from there.
Every push and pull request runs `.github/workflows/check.yml`.

## Stack

Vite, React 18, TypeScript, Tailwind CSS, shadcn/ui (a small subset),
Supabase (Postgres, auth, storage, edge functions), Playwright, Vitest.
