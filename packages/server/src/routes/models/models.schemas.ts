import { z } from 'zod';

const modelResponseSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  provider: z.string(),
  createdAt: z.string(),
});

const modelListResponseSchema = z.array(modelResponseSchema);

const agentProviderResponseSchema = z.object({
  name: z.string(),
});

const agentProviderListResponseSchema = z.array(agentProviderResponseSchema);

type ModelResponseData = z.infer<typeof modelResponseSchema>;
type ModelListResponseData = z.infer<typeof modelListResponseSchema>;
type AgentProviderResponseData = z.infer<typeof agentProviderResponseSchema>;
type AgentProviderListResponseData = z.infer<typeof agentProviderListResponseSchema>;

export type { ModelResponseData, ModelListResponseData, AgentProviderResponseData, AgentProviderListResponseData };
export { modelResponseSchema, modelListResponseSchema, agentProviderResponseSchema, agentProviderListResponseSchema };
