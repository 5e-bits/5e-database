import { z } from 'zod';

export const TranslationDocumentSchema = z.object({
  source_index: z.string(),
  source_collection: z.string(),
  lang: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, 'Must be a BCP 47 language tag'),
  fields: z.record(z.string(), z.unknown()),
  updated_at: z.date(),
});

export type TranslationDocument = z.infer<typeof TranslationDocumentSchema>;
