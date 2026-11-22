import type {APIRoute} from 'astro';
import {jpegResponse, sitePreview} from '@lib/link-preview';

// Default link preview image, see src/lib/link-preview.ts.
export const GET: APIRoute = async () => jpegResponse(await sitePreview());
