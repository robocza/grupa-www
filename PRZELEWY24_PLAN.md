# Przelewy24 — plan

Przelewy24 (P24) was paused on 2026-10-20: checkout offers cards and BLIK only
(`payment_method_types` in `src/pages/api/checkout.ts`). This plan collects what's needed to
turn it back on.

## Why it's paused

Stripe has extra requirements for P24 that are about the **website**, not the Checkout page.
Terms and privacy links shown in Stripe Checkout don't count. Stripe may review the site after
activation and restrict P24 if it doesn't meet them. Source:
[Stripe docs: Przelewy24](https://docs.stripe.com/payments/p24) ("Eligibility and availability").

## Stripe's website requirements

In addition to the general
[Stripe account activation requirements](https://support.stripe.com/questions/business-website-for-account-activation-faq),
the website must:

| Requirement | Status on grupa.robocza.org (2026-10-20) |
|---|---|
| Clearly display the business address | Done: footer on every page |
| Display the tax identification number (NIP) | Done: footer |
| Display the business registration number (KRS) | Done: footer |
| Clearly indicate the return and refund policy | **Missing**: nothing on the site describes returns and refunds |
| Display a privacy policy | **Missing**: `public/files/polityka-prywatnosci.pdf` exists but isn't linked anywhere |
| Display terms of service | **Missing**: `public/files/regulamin-sklepu.pdf` exists but isn't linked anywhere |

## Business category (MCC)

P24 is prohibited for some merchant category codes, including **8398 "Charitable and Social
Service Organizations – Fundraising"**, which a foundation's Stripe account may have. The shop
sells books and postcards, so the category in Stripe (Settings → Business details) should
describe that, e.g. book or retail sales. Some retail categories are "restricted" rather than
prohibited (e.g. 5999 Miscellaneous Specialty Retail, 5815 Digital Goods Media – Books) and need
extra information at account creation. The full lists are in the Stripe docs linked above.

## Changes to the website (to decide)

- Links to *Regulamin sklepu*, *Polityka prywatności* and *Zwroty i reklamacje*:
  - in the site-wide footer (clearest for Stripe's review, but changes every page), or
  - on the shop pages only.
- *Zwroty i reklamacje*: either its own short page or a link to the right section of the terms,
  depending on whether the terms already cover returns and refunds.

## Polish consumer law (not Stripe; check with a lawyer)

Not specific to P24, but relevant for the shop as a whole:

- The terms must be available on the site before ordering.
- Customers must be told how complaints work and about the 14-day right of withdrawal, with a
  model withdrawal form.
- After purchase, they must get a confirmation of the contract on a durable medium. Decided
  (2026-10-25): Stripe's receipt is that confirmation for now (our own customer email comes later), with the
  details in the terms; customers
  accept the terms with Stripe's checkbox in checkout.

## Turning P24 back on

1. Make the website changes above and check the MCC in Stripe.
2. Activate P24 in Stripe **live** mode (Settings → Payment methods).
3. Add `'p24'` back to `payment_method_types` in `src/pages/api/checkout.ts`.
4. Test a P24 payment in the sandbox. P24 sessions can complete before the payment is confirmed;
   the confirmation page already handles that ("płatność jest jeszcze przetwarzana"). The order
   emails, once built, must wait for `checkout.session.async_payment_succeeded`.

## Good to know

- Customers must be in Poland; currencies PLN or EUR; minimum 0.50 EUR.
- Settlement up to 2 business days.
- Refunds: full or partial, up to 180 days after payment, asynchronous (up to 3 business days),
  can't be canceled. They arrive as a separate credit, not marked as a refund, so tell the
  customer when you refund.
- No disputes or chargebacks: the customer authenticates with their bank.
- The customer's bank statement shows a P24 reference
  (`latest_charge.payment_method_details.p24.reference` on the PaymentIntent) followed by the
  statement descriptor.
