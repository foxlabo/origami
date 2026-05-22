/** Models an AI node is allowed to use. Keeps the run API from being asked to
 *  call arbitrary or expensive models with a caller-supplied graph. */
export const ALLOWED_MODELS = [
  'gpt-5.4-mini',
  'gpt-5.4-nano',
  'gpt-5.4',
  'gpt-5.5',
  'gpt-4.1',
] as const

export type AllowedModel = (typeof ALLOWED_MODELS)[number]

export function isAllowedModel(model: string): boolean {
  return (ALLOWED_MODELS as readonly string[]).includes(model)
}
