// 1. Import utilities from `astro:content`
import {z, defineCollection} from 'astro:content';

// 2. Define your collection(s)
const blogCollection = defineCollection({
    schema: ({image}) => z.object({
        title: z.string(),
        description: z.string(),
        author: z.array(z.string()).optional(),
        createdAt: z.date(),
        publish: z.boolean().optional().default(true),
        cover: z.preprocess(function (val) {
            let value = String(val);

            if (value.startsWith('[[') && value.endsWith(']]')) {
                return value.substring(2, value.length - 2);
            }

            return value;
        }, image()).nullable().optional(),
        coverAlt: z.string().nullable().optional(),
    }),
});

const teamCollection = defineCollection({
    schema: z.object({
        name: z.string(),
        title: z.string(),
        email: z.string(),
        picture: z.string(),
        www: z.string().optional(),
    }),
});

// 3. Export a single `collections` object to register your collection(s)
//    This key should match your collection directory name in "src/content"
export const collections = {
    'blog': blogCollection,
    'team': teamCollection,
};
