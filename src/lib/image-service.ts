import type {LocalImageService} from 'astro';
import sharpService from 'astro/assets/services/sharp';

// Only images passed with `optimize` (shop images) go through sharp. Everything else, such as
// the blog's dithered artwork that resizing and lossy WebP would blur, is served as is, the
// way passthroughImageService() did.
const service: LocalImageService = {
    ...sharpService,
    // Astro's default hash props (not exported) plus our flag.
    propertiesToHash: ['src', 'width', 'height', 'format', 'quality', 'optimize'],

    getURL(options, imageConfig) {
        const url = sharpService.getURL(options, imageConfig) as string;

        return options.optimize ? `${url}&optimize=1` : url;
    },

    parseURL(url, imageConfig) {
        const options = sharpService.parseURL(url, imageConfig);

        return options && {...options, optimize: url.searchParams.has('optimize')};
    },

    getHTMLAttributes(options, imageConfig) {
        const {optimize, ...rest} = options;

        return sharpService.getHTMLAttributes!(rest, imageConfig);
    },

    async transform(inputBuffer, transform, imageConfig) {
        if (!transform.optimize) {
            return {data: inputBuffer, format: transform.format};
        }

        return sharpService.transform(inputBuffer, transform, imageConfig);
    },
};

export default service;
