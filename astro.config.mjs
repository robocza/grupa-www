import { defineConfig, passthroughImageService } from "astro/config";
import tailwind from "@astrojs/tailwind";

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
            watch: {
                ignored: ['**/.idea/workspace.xml']
            }
        }
    }
});
