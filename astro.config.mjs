import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import image from "@astrojs/image";

// https://astro.build/config
export default defineConfig({
    site: "https://grupa.robocza.org",
    integrations: [
        tailwind(),
        image({
            serviceEntryPoint: '@astrojs/image/sharp'
        }),
    ],
    vite: {
        server: {
            watch: {
                ignored: ['**/.idea/workspace.xml']
            }
        }
    }
});
