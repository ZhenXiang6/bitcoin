export const DATA_REVALIDATE_SECONDS = 60 * 60 * 8;

export const OPENAI_SUMMARY_MODEL =
  process.env.OPENAI_SUMMARY_MODEL ?? "gpt-5-nano";

export function hasOpenAiSummaryEnabled() {
  return Boolean(process.env.OPENAI_API_KEY);
}
