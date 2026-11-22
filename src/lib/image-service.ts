import type {LocalImageService} from 'astro';
import {baseService} from 'astro/assets';
import sharpService from 'astro/assets/services/sharp';

// Only images passed with `optimize` (shop images) go through sharp. Everything else, such as
// the blog's dithered artwork that resizing and lossy WebP would blur, is served as is, the
// way passthroughImageService() did.
const service: LocalImageService = {
    ...sharpService,
    // Astro's default hash props plus our flag, so an optimized and a passthrough copy of the
    // same image get different file names.
    propertiesToHash: [...baseService.propertiesToHash!, 'optimize'],

    async getURL(options, imageConfig, logger) {
        const url = await sharpService.getURL(options, imageConfig, logger);

        return options.optimize ? `${url}&optimize=1` : url;
    },

    // Synchronous like Astro's own parseURL, which this one wraps.
    parseURL(url, imageConfig, logger) {
        const options = sharpService.parseURL(url, imageConfig, logger) as ReturnType<typeof baseService.parseURL>;

        return options && {...options, optimize: url.searchParams.has('optimize')};
    },

    getHTMLAttributes(options, imageConfig, logger) {
        const {optimize, ...rest} = options;

        return sharpService.getHTMLAttributes!(rest, imageConfig, logger);
    },

    async transform(inputBuffer, transform, imageConfig, logger) {
        if (!transform.optimize) {
            return {data: inputBuffer, format: transform.format};
        }

        return sharpService.transform(inputBuffer, transform, imageConfig, logger);
    },
};

export default service;
