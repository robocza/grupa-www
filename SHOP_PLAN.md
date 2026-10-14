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

- Gitea version and public URL.
- Exact Astro version and current project structure.
- Shipping prices for Paczkomat vs courier; whether to offer free-shipping thresholds.
- How the owner wants to be notified of orders (email service?).

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
