/** Shared server-side model for recognition, mesh generation, and advice. */
export function astraModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-6-astra";
}
