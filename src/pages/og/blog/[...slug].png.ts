import type {APIRoute, GetStaticPaths} from 'astro';
import {getCollection, type CollectionEntry} from 'astro:content';
import {blogPreview, pngResponse} from '@lib/link-preview';

// Link preview image for each blog post with a cover, see src/lib/link-preview.ts. Posts
// without one use the site's default image. Same posts as src/pages/blog/[...slug].astro.
export const getStaticPaths = (async () => {
    const entries = await getCollection('blog', ({data}) => Boolean(data.cover));

    return entries.map(entry => ({
        params: {slug: entry.slug}, props: {entry},
    }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{entry: CollectionEntry<'blog'>}> = async ({props}) => {
    // Astro's image metadata knows its source file but doesn't type it.
    const cover = props.entry.data.cover as ImageMetadata & {fsPath: string};

    return pngResponse(await blogPreview(cover.fsPath));
};
