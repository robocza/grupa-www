# Hosting — options to decide

Written 2026-10-20. Nothing has changed yet: the site stays on Netlify, deployed from the public
GitHub mirror (`robocza/grupa-www`) of the Gitea repository.

## Why this came up

The repository started as a simple static site. With the shop it also handles payments, and the
plans and commit messages describe the setup in detail, so the owner would like the code to be
private. The Gitea repository already is; the GitHub copy, which Netlify deploys from, is public.

A scan of the full git history (all 141 commits on every branch, on 2026-10-20) found no keys or
tokens: no Stripe keys or webhook secrets, InPost token, GitHub or MailerSend tokens, or private
keys. Making the repository private is about the code and plans, not about a leak. The InPost
Geowidget token is public by design (it is in the page code and limited to our domains).

## The constraint

Netlify's free plan can't deploy from a **private repository owned by a GitHub organisation**.
Netlify's [pricing page](https://www.netlify.com/pricing/) lists "Private organization repos" only
under Pro ($20/month), and Netlify staff confirmed that builds from such repositories
[fail on the free tier](https://answers.netlify.com/t/update-connecting-private-organization-owned-github-repositories/72151).
So **don't make the GitHub repository private** without choosing one of the options below first,
or deploys stop.

## Options

### A. Netlify Pro

Make the GitHub repository private and pay for Pro. Nothing else changes.

### B. Move the GitHub copy to a personal account

Netlify says personal repositories, public or private, stay free. But users report free sites on
private repositories failing with
["unrecognized Git contributor"](https://answers.netlify.com/t/unrecognized-git-contributor-despite-being-connected/160527)
when commits come from anyone but the account owner. The content sync commits as `content-sync`,
so its deploys could be blocked. It would also tie the website to one person's GitHub account.
Not recommended.

### C. Deploy to Netlify from Gitea Actions (no GitHub)

A workflow in `grupa-www` builds on the Raspberry Pi 5 runner (aarch64, 4 cores, 16 GB) and
uploads with the Netlify CLI: `netlify deploy --build --prod` on `main`, and
`netlify deploy --build --alias <branch>` for preview URLs on other branches. Netlify keeps
serving the site (CDN, HTTPS, rollbacks); its Git connection, the GitHub repository and the push
mirror are no longer needed.

Details found while planning:

- **sharp on ARM:** the checkout function's bundle includes `sharp` with native **x86-64**
  binaries (`@img/sharp-linux-x64`, `@img/sharp-libvips-linux-x64`), pulled in by the image
  service. Netlify Functions run on x86-64, so a bundle built on the Pi would carry ARM binaries
  that don't load there. Fix: in the workflow, install sharp's x86-64 packages alongside the ARM
  ones before building (sharp's documented cross-platform approach).
- **Blog submodule:** `.gitmodules` uses an SSH address for GitHub, and the runner has no GitHub
  key. Fetch it over public HTTPS in the workflow (e.g. `url."https://github.com/".insteadOf`).
- **Content sync:** Gitea, like GitHub, normally doesn't start workflows from pushes made with
  the built-in Actions token, so the sync's commits to `main` probably wouldn't trigger the
  deploy workflow. Put the deploy steps in one script that both workflows call.
- **Secrets in grupa-www:** `NETLIFY_AUTH_TOKEN` (Netlify personal access token) and
  `NETLIFY_SITE_ID`. The build uses the site's environment variables from Netlify, as now.
- **To verify first:** one forum report mentions the "unrecognized Git contributor" error even
  on [deploys with no repository linked](https://answers.netlify.com/t/drag-and-drop-deploys-blocked-by-unrecognized-git-contributor-with-no-repo-linked/164283).
  A CLI deploy is authenticated with the owner's token, so it should be fine, but test one deploy
  before switching over.
- **What's lost:** Netlify's automatic PR previews and their status checks; preview URLs show up
  in the workflow log instead. Deploys take a few minutes on the Pi.
- **Switching over:** after a successful test, unlink the repository in Netlify, remove Gitea's
  push mirror, then make the GitHub repository private, archive it or delete it.
- **Open question:** whether `develop` should get preview deploys.

### D. Another host with a free tier for private organisation repositories

For example Cloudflare Pages. It means replacing the Netlify adapter and retesting checkout, so it
is more work than C for the same result.

### E. Self-host on Coolify (no Netlify, no GitHub)

- **Code:** replace `@astrojs/netlify` with `@astrojs/node` (standalone): one small Node server
  that serves the static pages and runs `/api/checkout` and `/sklep/dziekujemy` on demand. The
  Netlify-specific parts go away (`imageCDN`, the function bundle, the sharp cross-platform
  issue). Environment variables move to Coolify.
- **Build and deploy:** the Pi runner builds a Docker image on changes to `main` (including
  content syncs), pushes it to Gitea's container registry, and calls Coolify's deploy webhook;
  Coolify pulls the image and restarts the site. Don't build on the Olimex A64.
- **Domain:** point `grupa.robocza.org` at the Coolify server; Coolify handles HTTPS. The InPost
  token, Stripe settings and CMS stay the same, since the domain doesn't change.
- **What's lost compared with Netlify:** independent availability (the shop, including checkout,
  depends on our server, power and connection), the global CDN, one-click rollbacks (redeploying
  a previous image is the replacement), easy preview deploys, and maintenance becomes ours (OS,
  Coolify, backups).
- **Security:** card data never reaches our server either way (Stripe hosts the payment page).
  Keep the server patched and the Stripe key in Coolify's environment, not in the image.
- **Suggested timing:** a separate step after the shop launches, not mixed into the merge.

## Recommendation

- If the goal is mainly a private repository without a paid plan: **C**.
- If everything should be under our own control (the admin panel and Stripe webhooks will run on
  Coolify anyway): **E**, after launch.

## Questions to answer before deciding on E

1. Which server would run the site: the Coolify server that hosts Gitea and the admin panel
   (Olimex A64), or could the Raspberry Pi 5 be added to Coolify as a server?
2. Is that server on a home connection or in a data centre, and how reliable has it been?
3. Are preview deploys needed, or is testing locally enough?
