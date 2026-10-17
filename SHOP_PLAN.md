# Shop plan — handoff notes

Context for adding a small shop to this Astro site. These decisions were made in an earlier planning conversation; treat them as the agreed direction unless the owner says otherwise.

## Goals

- Sell a small catalog: **5–10 products, some with variants** (e.g. size/colour), Polish market.
- Low traffic (tens of visitors/day). Keep the site **static** wherever possible.
- **Non-technical editors** must be able to add/edit products **without a GitHub account**.
- **No lock-in to GitHub.** The repo is on GitHub today but will move to the owner's **self-hosted Gitea**.
- Customers must be able to choose **InPost Paczkomat (parcel locker)** delivery and **pick a locker on a map** during checkout.

## Agreed stack

| Part | Choice |
|---|---|
| Site + product pages | Astro, static output, hosted on **Netlify** |
| Product management | **Sveltia CMS** (Git-based, client-side, successor to Decap CMS) at `/admin` |
| CMS backend | **Gitea backend** — editors log in with accounts on the owner's Gitea instance |
| Repo hosting | **Gitea as primary**, **push mirror to GitHub** so Netlify keeps auto-deploying from GitHub |
| Cart | Client-side (localStorage), no backend |
| Delivery choice | **InPost Geowidget v5** on our own page, before redirecting to Stripe |
| Server code | **Netlify Functions** (via `@astrojs/netlify` on-demand routes) — only for checkout + webhook |
| Payment | **Stripe Checkout** (hosted) with cards, **BLIK**, **Przelewy24** |
| Fulfilment | Manual at first (InPost web panel); later ShipX API or a broker (Furgonetka/Apaczka) |

### Rejected options (and why)

- **WooCommerce / self-hosting on a small ARM board** — overkill for 10 products; maintenance burden.
- **Keystatic, Pages CMS** — tied to GitHub.
- **Decap + Netlify Identity / Git Gateway** — Git Gateway supports only GitHub/GitLab and is marked deprecated by Netlify.
- **Sanity** — good editor UX, but adds a hosted dependency; kept as a fallback if Git-based editing proves too awkward.
- **Stripe as the product catalog** — poor for rich product pages and gives editors access to the payment account.

## Key design decisions

1. **Products are content files in the repo**, edited via Sveltia, read by an Astro **content collection** with a Zod schema.
   - Each product: slug, name, description, images, active flag, and a **variants list** (label/options, price in PLN grosze, SKU, optional image, available flag).
2. **Prices live in the CMS, not in Stripe.** The checkout function looks up each cart item in the built catalog and creates line items with inline `price_data`. **Never trust prices sent from the browser.** No Stripe Products need to be created.
3. **Checkout flow:**
   1. Cart page (client-side).
   2. Delivery step: Paczkomat or courier. For Paczkomat, show the InPost Geowidget (`<inpost-geowidget>`, config `parcelCollect`, language `pl`); store the selected locker ID.
   3. POST to a Netlify Function that validates the cart, then creates a Stripe Checkout Session with:
      - only the selected shipping rate (`shipping_options` with inline `shipping_rate_data`),
      - locker ID + delivery method in `metadata`,
      - locker shown to the customer via `custom_text`,
      - `phone_number_collection` enabled (InPost needs phone/email for locker parcels),
      - shipping address collection only for courier delivery,
      - BLIK and Przelewy24 enabled (PLN currency).
   4. Redirect to Stripe Checkout; success/cancel pages on our site.
4. **Webhook** (`checkout.session.completed`) as a Netlify Function: verify signature, then notify the owner with order details incl. locker ID. Later: create InPost shipment automatically.
5. **Stock**: manual for now (editor toggles a variant to unavailable). Optional later: counts in Netlify Blobs, decremented by the webhook, checked by the checkout function.

## Gitea / deployment notes

- Sveltia Gitea backend needs Gitea **1.20+** (faster on **1.24+**), **CORS enabled**, instance reachable over HTTPS from editors' browsers.
- Register Sveltia as an **OAuth2 application** in Gitea (non-confidential client, PKCE); redirect URI = `https://<site>/admin/`.
- Editors need **push access** to the repo. Consider Gitea branch protection with **protected file patterns** so editors can only change product content/media.
- Netlify cannot auto-deploy from Gitea directly → use Gitea's **push mirror to GitHub** and keep Netlify's GitHub integration. (Alternative later: Gitea Actions + `netlify deploy --prod`.)
- Until the repo moves to Gitea, Sveltia can be configured and tested locally; switch the backend config when the migration happens.

## Environment variables (Netlify)

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `PUBLIC_INPOST_GEOWIDGET_TOKEN` (from the InPost business account)
- Owner notification settings (email provider / address) — TBD

## Before launch (non-code)

- Regulamin (terms), privacy policy, 14-day withdrawal information.
- Przelewy24 requires the site to be public and show business details.
- Confirm fiscal receipt obligations with an accountant.

## Open questions

- Answered: Gitea is https://git.robocza.org (1.25.3); Astro 4.16.6; shipping is pickup 0 zł / Paczkomat 18 zł / courier 20 zł, no free-shipping threshold.
- Order notifications: postponed (no email service chosen). Stopgap: Stripe Dashboard notifications for successful payments.
- Netlify production branch: `main` (answered).

## Suggested order of work

1. Inspect the repo (Astro version, structure, existing content collections, adapter).
2. Add the `products` content collection schema with variants.
3. Add Sveltia CMS (`/admin` page + config) mapped to that collection; test locally.
4. Product listing + product detail pages with variant selection.
5. Client-side cart.
6. Delivery step with InPost Geowidget.
7. Netlify adapter + checkout function (Stripe Checkout Session).
8. Success/cancel pages + webhook function.
9. Gitea migration, push mirror, switch Sveltia backend to Gitea.

## Progress (as of 2026-10-14)

Work is on branch `feature/shop`, PR #6 against `develop` (Netlify deploy preview:
https://deploy-preview-6--fastidious-moxie-126f16.netlify.app).

| Step | Status | Where |
|---|---|---|
| 1. Inspect repo | Done | Astro 4 legacy content collections (`src/content/config.ts`), Tailwind |
| 2. Products collection | Done | `src/content/config.ts`, `src/content/products/` (+ `images/`) |
| 3. Sveltia CMS | Done; Gitea backend, branch `feature/shop` until merge | `public/admin/` |
| 4. Listing + product pages | Done | `src/pages/sklep.astro`, `src/pages/sklep/[slug].astro`, `src/lib/shop.ts` |
| 5. Cart | Done | `src/lib/cart.ts`, `src/pages/sklep/koszyk.astro`, `/sklep/katalog.json` |
| 6. Delivery + Geowidget | Done | `src/pages/sklep/dostawa.astro`, prices in `src/lib/shipping.ts` |
| 7. Checkout function | Done, tested on preview (test mode) | `src/pages/api/checkout.ts`, `src/lib/checkout.ts` |
| 8. Success/cancel | Done; webhook skipped for now | `src/pages/sklep/dziekujemy.astro`, cancel -> `/sklep/dostawa/?anulowano` |
| 9. Gitea migration | Done (2026-10-17); merge to `main` pending | see below |

Decisions made along the way:

- Only shop images are optimised (custom service `src/lib/image-service.ts`, opt-in via `optimize`). Sharp/WebP visibly ruins the blog's dithered images, so they are served as is. Netlify Image CDN is disabled for the same reason.
- Netlify adapter `@astrojs/netlify` 5.x (Astro 4), `output: "hybrid"`: pages are static, only `/api/checkout` and `/sklep/dziekujemy` run on demand.
- Components rendered on demand must not import `astro.config.mjs` (crashes the function); locales live in `src/i18n.mjs`.
- Shop is Polish only and not linked from the homepage/nav (owner's choice for now).
- Max 10 pcs per cart line (`MAX_QTY` in `src/lib/cart.ts`). SKUs must be unique across products (build fails otherwise).
- Sveltia: stock photos and URL input disabled (Astro `image()` needs files in the repo); empty optional fields omitted.

Local dev:

- Node runs in the docker container: `docker compose exec --user 1000:1000 -w /app node npx astro dev --host 0.0.0.0 --port 4321`.
- HTTPS via self-signed cert (`make dev-cert`, gitignored in `.docker/certs/`).
- Site at https://gr.local (port 443 via gitignored `docker-compose.override.yml`). The InPost token is bound to domains without a port, so `gr.local:4321` gets "Brak dostępu".
- Env vars in `.env`: `PUBLIC_INPOST_GEOWIDGET_TOKEN`, `STRIPE_SECRET_KEY` (test mode). Same on Netlify.

### Before merging / launch

- [ ] Set `branch: main` in `public/admin/config.yml` (currently `feature/shop` for testing).
- [ ] Merge on Gitea (not with GitHub's merge button; the mirror would overwrite it).
- [x] Test product turned into the real `makroskop` product via the CMS.
- [ ] `makroskop` still uses the test image `images/book.png` as its main image; replace it, then delete the file. Keep or delete the inactive template `przyklad`.
- [ ] Activate BLIK and Przelewy24 in Stripe **live** mode; switch Netlify `STRIPE_SECRET_KEY` to the live key.
- [ ] Legal items from "Before launch" above.
- [ ] Later: webhook + order notification email (needs an email service).

### Step 9 (Gitea)

Repo: `grupa-robocza/grupa-www` on Gitea (private), SSH `git@git.robocza.org:grupa-robocza/grupa-www.git`.
GitHub `robocza/grupa-www` (public) is only updated by the push mirror. Don't push to it, and don't use the CMS until it is switched to Gitea: commits made on GitHub are overwritten by the next mirror sync.

The GitHub Action that updated the blog submodule (`.github/workflows/update_submodule.yml`) is removed: it committed on GitHub, which the push mirror would overwrite. Until it's reintroduced with Gitea Actions (planned), update the blog manually with `make git-submodule-sync`. `dispatch_update.yml` in the blog repo now dispatches to nothing; disable it there too.

Owner's tasks:

1. ~~Gitea: create the org, migrate the repo from GitHub as a normal repo (not a mirror), all branches.~~ Done.
2. ~~Push mirror to `https://github.com/robocza/grupa-www.git` with a GitHub fine-grained PAT (Contents + Workflows RW, as the password), sync on push.~~ Done. Renew the token before it expires, or GitHub/Netlify stop updating.
3. ~~Enable CORS~~ Done, via `GITEA__cors__*` environment variables in Coolify (Gitea's compose file):
   `[cors] ENABLED = true`, `ALLOW_DOMAIN` = site, `https://gr.local`, preview URLs; `METHODS = GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS`; `HEADERS = Content-Type,User-Agent,Authorization`.
4. ~~OAuth2 app~~ Done (`app_id` in `public/admin/config.yml`). It's under the `grupa-robocza` org (not confidential), redirect URIs `https://grupa.robocza.org/admin/`, `https://gr.local/admin/index.html`, preview `/admin/`. Share the Client ID.
5. Editors: Gitea accounts with write access; branch protection with unprotected file pattern `src/content/products/**` (verify it applies to API commits).
6. Point local clones at Gitea; stop pushing to GitHub directly. (Done for the owner's checkout: `origin` = Gitea, `github` remote is fetch-only.)

Then (code): ~~switch `public/admin/config.yml` to `backend: gitea`~~ and ~~add `app_id`~~ (done; "Sign In with Gitea" tested), set `branch: main` at merge. Add new deploy-preview or site URLs to both the OAuth app's redirect URIs and `GITEA__cors__ALLOW_DOMAIN` if the CMS should work there. Make GitHub private too if the code should not be public.

Later: reintroduce automatic blog submodule updates with Gitea Actions (needs a runner).
