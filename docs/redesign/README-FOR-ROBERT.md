# How to hand this to Lovable

Lovable reads files that live in its own repo, so the most reliable route is to put this folder there. It then has the whole canvas to look back at, not just a chat message.

## Recommended: put the folder in the repo (about 5 minutes)

1. Unzip `magic-coffin-redesign-handover.zip`. Inside is a folder called `docs`, with `redesign` inside it.
2. Open github.com/robertmstanescu/engage-grow-hub, on the repo's front page (the `main` branch).
3. Click **Add file › Upload files**.
4. Drag the whole `docs` folder onto the upload area. GitHub keeps the folders, so the files land in `docs/redesign/`. That's about 100 files and about 27 MB, which is within GitHub's limits.
5. Commit straight to `main`, with the message "Add redesign handover (docs only)". Lovable syncs with `main`, and this changes no code.
6. In Lovable, open the project, make sure **Plan mode** is on, and paste everything in `LOVABLE-PROMPT.md`.
7. Also attach these screenshots from `shots/` to that first message, so it sees the look straight away: `Main-1440.jpg`, `ServiceIC-1440.jpg`, `Work-1440.jpg`, `CaseStudy-1440.jpg`, `AdminWorkEdit-1440.jpg`, `Main-390.jpg`.

## If you can't use GitHub

Paste `00-HANDOVER.md` into Lovable instead of the prompt, with Plan mode on. Attach the screenshots in batches, with one message per page group: home and services, the six service pages, work and case study, blog and privacy, then admin and navbar. In each message, say "screenshots for section 4.x of the spec".

The catch: Lovable won't have the artboard source files, so exact sizes and the world map shapes will be approximate. For the map, paste the contents of `artboards/Main.dc.html` in a later message when Lovable reaches that phase.

## What to check when Lovable replies with its plan

- It promises to change no text in existing pages and no existing rows.
- Every new look is something you can switch on or off in the admin. A new look that is forced on every page is the warning sign.
- The Work and proof tables start empty.
- It builds one phase at a time and runs the checks after each.
