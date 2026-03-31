import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

const SubclassSpellPrerequisiteSchema = z.object({
  index: z.string(),
  type: z.string(),
  name: z.string(),
  url: z.string(),
});

const SubclassSpellSchema = z.object({
  prerequisites: z.array(SubclassSpellPrerequisiteSchema),
  spell: APIReferenceSchema,
});

export const SubclassSchema = z.object({
  index: z.string(),
  name: z.string(),
  class: APIReferenceSchema,
  subclass_flavor: z.string(),
  desc: z.array(z.string()),
  subclass_levels: z.string(),
  spells: z.array(SubclassSpellSchema).optional(),
  url: z.string(),
});
