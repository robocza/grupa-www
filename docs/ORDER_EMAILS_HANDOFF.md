# Handoff: Stripe webhook and order emails

Context for building the Stripe webhook and order emails in the internal admin panel
(`administracja`), separately from the website. Written 2026-10-20 at the end of the shop work in
`grupa-www`.

## Where the shop stands

- **Website:** grupa.robocza.org, Astro 4, hosted on Netlify. Repo `grupa-robocza/grupa-www` on
  Gitea (git.robocza.org, primary), push-mirrored to GitHub `robocza/grupa-www`, from which Netlify
  deploys. **Never push to GitHub directly**; the mirror overwrites it.
- **Shop branch:** `feature/shop` (Gitea PR #1, GitHub PR #6), **not merged yet**; the owner is
  reviewing it. Netlify deploy preview: https://deploy-preview-6--fastidious-moxie-126f16.netlify.app
- **Plans:** `SHOP_PLAN.md` (progress, decisions, launch checklist) and `PRZELEWY24_PLAN.md`.
- **Products:** edited at cms.robocza.org (repo `grupa-robocza/grupa-cms`), stored in
  `grupa-robocza/grupa-content`, synced into `grupa-www` by a Gitea Actions workflow.

## How checkout works (what the webhook receives)

`src/pages/api/checkout.ts` (Netlify Function) validates the cart against the product catalog and
creates a **Stripe Checkout Session**. Prices never come from the browser.

- `mode: payment`, `currency: pln`, `locale: pl`, payment methods **card and BLIK**. Przelewy24
  is paused; if it comes back, its payments can complete after the session.
- Line items use inline `price_data`; `product_data.name` is the product name (with the variant
  label when there are several variants), and `product_data.metadata.sku` is the SKU.
- One shipping option (`shipping_rate_data`) with the chosen method's label and price:

  | `metadata.delivery_method` | Label | Price |
  |---|---|---|
  | `pickup` | Odbiór osobisty w Aptece Designu | 0 zł |
  | `paczkomat` | Paczkomat InPost | 18 zł |
  | `courier` | Kurier | 20 zł |

- Session **and** PaymentIntent `metadata`: `delivery_method`, plus for Paczkomat `paczkomat_id`
  (e.g. `KRA01M`) and `paczkomat_address`.
- Collected from the customer:
  - name: `customer_details.individual_name`, always required;
  - email and phone: `customer_details.email` and `customer_details.phone`;
  - billing address: `customer_details.address`, required;
  - business purchases: `customer_details.business_name` and `customer_details.tax_ids` (NIP);
  - shipping address, courier only and Poland only: `collected_information.shipping_details`.

  Also: terms consent is required, and promotion codes are allowed (the discount is in
  `total_details.amount_discount`).
- Pickup is arranged by email `grupa@robocza.org` or Instagram `@grupa.robocza` (`PICKUP_CONTACT`
  in `src/lib/shipping.ts`).
- After payment Stripe redirects to `/sklep/dziekujemy?session_id=…`, which reads the session
  and clears the cart. That page is unaffected by the webhook.

## Decisions already made about emails

- **One email per paid order, a notification to the shop:** items, delivery (locker or address,
  or a pickup note), discount, total, customer details incl. business name and NIP, and a link to
  the payment in Stripe. Replying goes to the customer.
- **No email to the customer for now** (decided 2026-10-25; our own customer email will be
  added later, so keep that in mind when building the shop email): Stripe's receipt is the
  customer's confirmation, and the terms cover returns, complaints and withdrawal. The owner makes sure the
  receipt has everything it needs (Stripe live mode: Settings → Customer emails → Successful
  payments).
- **Sender:** `sklep@robocza.org`. **Shop notifications to:** `sklep@robocza.org`.
- **Provider:** MailerSend. `robocza.org` is already verified there: the SPF record includes
  `_spf.mailersend.net`, and DKIM `mlsend2._domainkey` is published. The domain's mailboxes are
  on Google Workspace.
- Emails are in Polish. Prefix sandbox (test mode) notifications with `[TEST]`.

## Webhook details

- **Events:**
  - `checkout.session.completed`: send emails only when `payment_status === 'paid'`;
  - `checkout.session.async_payment_succeeded`: for payments confirmed later (Przelewy24, if it
    comes back).
- **Signature:** verify Stripe's signature on the **raw** request body with the endpoint's
  signing secret (`STRIPE_WEBHOOK_SECRET`). The sandbox and live mode have separate endpoints
  and secrets.
- **Order details:** retrieve the session with `expand: ['line_items']` to get them.
- **Retries:** return a non-2xx status when sending fails, so Stripe retries. A retry after a
  partial failure can send the shop email twice; that was accepted.
- **Stripe keys:** for live mode the website will use a **restricted key** ("Checkout Sessions:
  Write"). The admin panel needs its own key with read access to Checkout Sessions.

## A working implementation to start from

A webhook with both emails was built and tested in `grupa-www`, then removed because it belongs
in the admin panel. It's in git history:

```bash
git -C /home/czarek/projects/grupa-robocza/grupa-www show 16b7932:src/pages/api/stripe-webhook.ts
git -C /home/czarek/projects/grupa-robocza/grupa-www show 16b7932:src/lib/order-email.ts
git -C /home/czarek/projects/grupa-robocza/grupa-www show 16b7932:src/lib/mailersend.ts
```

It was tested with signed test events against a real sandbox order:
- a forged signature got 400;
- unrelated events and unpaid sessions were ignored;
- paid and async-paid sessions sent both emails;
- a MailerSend failure returned 500.

It was never tested with real MailerSend delivery. It's TypeScript for an Astro endpoint, using
`stripe` 22.6.2 (API `2026-08-26.dahlia`); adapt it to the admin panel's stack.

## How the owner likes to work

- One step at a time. The owner tests in the browser before each commit; commit and push only
  after that.
- Full words in identifiers (`quantity`, not `qty`; `index`, not `i`), except names fixed by
  libraries or HTML.
- Explanations in English; user-facing text (site, emails) in Polish.
- Secrets live in `.env` files and hosting environment variables; never print or paste them.

## Local environment note

The admin panel's container (`gr-admin-caddy`) and `grupa-www`'s dev container both want port 443.
`grupa-www`'s port comes from a gitignored `docker-compose.override.yml` (443 → 4321), needed
because the InPost map token rejects `gr.local:4321`. Only one of them can run on 443 at a time.
