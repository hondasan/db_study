import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const dbStudyCollection = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: "./src/content/db-study" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number(),
    category: z.string(),
  }),
});

export const collections = {
  'db-study': dbStudyCollection,
};
