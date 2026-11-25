# Architecture rules

- Keep redirect records administrator-only and resolve public links through an exact-path lookup returning only destination and status; visitors must not receive the management list or its metadata.
- Issue analytics view identifiers and signed engagement capabilities on the server; keep receipts per view in memory so another visitor's measurements cannot be overwritten.
- Public site content uses an explicit section allowlist; public global blocks must be referenced by live published content, while icon catalogues and storage listings remain administrator-only to avoid exposing unpublished material.
- Metered picture descriptions and search suggestions require a verified administrator session before processing input; diagnostic authentication-email logs omit recipients to protect personal data.
- The administrator-status function checks only the current account (or trusted service requests), so callers cannot enumerate other accounts.