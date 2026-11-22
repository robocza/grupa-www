import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import netlify from "@astrojs/netlify";
import fs from "node:fs";
import { defaultLocale, locales } from "./src/i18n.mjs";

// Self-signed cert for HTTPS on the dev server (Sveltia CMS needs HTTPS outside localhost).
// Generate with `just dev-cert`; without it the dev server uses plain HTTP.
const devCert = {key: ".docker/certs/dev-key.pem", cert: ".docker/certs/dev-cert.pem"};
const devHttps = fs.existsSync(devCert.key) && fs.existsSync(devCert.cert)
    ? {key: fs.readFileSync(devCert.key), cert: fs.readFileSync(devCert.cert)}
    : undefined;

// https://astro.build/config
export default defineConfig({
    site: "https://grupa.robocza.org",
    // Pages stay static; only routes with `prerender = false` (shop API) run as Netlify Functions.
    output: "hybrid",
    adapter: netlify({
        // Netlify Image CDN would replace our image service and re-encode the blog images.
        imageCDN: false,
    }),
    i18n: {
        defaultLocale,
        locales,
        routing: {
            prefixDefaultLocale: false
        }
    },
    image: {
        service: {entrypoint: "./src/lib/image-service.ts"}
    },
    redirects: {
        // Printed/shared link for the book. Temporary (302), so browsers don't cache it and it can
        // be changed if the product's slug ever changes in the CMS.
        "/kup-kjut-akceleracjonizm": {status: 302, destination: "/sklep/ksiazka-kjut-akceleracjonizm"}
    },
    vite: {
        plugins: [tailwindcss()],
        server: {
            https: devHttps,
            watch: {
                ignored: ['**/.idea/workspace.xml']
            }
        }
    }
});
