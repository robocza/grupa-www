import { defineConfig, passthroughImageService } from "astro/config";
import tailwind from "@astrojs/tailwind";
import fs from "node:fs";

// Self-signed cert for HTTPS on the dev server (Sveltia CMS needs HTTPS outside localhost).
// Generate with `make dev-cert`; without it the dev server uses plain HTTP.
const devCert = {key: ".docker/certs/dev-key.pem", cert: ".docker/certs/dev-cert.pem"};
const devHttps = fs.existsSync(devCert.key) && fs.existsSync(devCert.cert)
    ? {key: fs.readFileSync(devCert.key), cert: fs.readFileSync(devCert.cert)}
    : undefined;

// https://astro.build/config
export default defineConfig({
    site: "https://grupa.robocza.org",
    i18n: {
        defaultLocale: "pl",
        locales: ["en", "pl"],
        routing: {
            prefixDefaultLocale: false
        }
    },
    image: {
        service: passthroughImageService()
    },
    integrations: [
        tailwind(),
    ],
    redirects: {
        "/kup-kjut-akceleracjonizm": "https://buy.stripe.com/cNicN59QM3kudwf0fp4wM0b"
    },
    vite: {
        server: {
            https: devHttps,
            watch: {
                ignored: ['**/.idea/workspace.xml']
            }
        }
    }
});
