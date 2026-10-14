/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace Astro {
    interface CustomImageProps {
        // Run this image through sharp (see src/lib/image-service.ts). Other images are served as is.
        optimize?: boolean;
    }
}

interface ImportMetaEnv {
    readonly PUBLIC_INPOST_GEOWIDGET_TOKEN?: string;
}
