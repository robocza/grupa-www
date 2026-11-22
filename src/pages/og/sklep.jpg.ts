import type {APIRoute} from 'astro';
import {jpegResponse, shopPreview} from '@lib/link-preview';

// Link preview image for the shop's pages without one of their own, see src/lib/link-preview.ts.
export const GET: APIRoute = async () => jpegResponse(await shopPreview());
