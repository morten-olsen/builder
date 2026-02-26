import { z } from 'zod';

const modelResponseSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  createdAt: z.string(),
});

const modelListResponseSchema = z.array(modelResponseSchema);

type ModelResponseData = z.infer<typeof modelResponseSchema>;
type ModelListResponseData = z.infer<typeof modelListResponseSchema>;

export type { ModelResponseData, ModelListResponseData };
export { modelResponseSchema, modelListResponseSchema };
