export type RagPromptVariant = "baseline" | "strict-grounding";

export function buildRagSystemPrompt(
  context: string,
  variant: RagPromptVariant = "baseline",
): string {
  const instruction =
    variant === "strict-grounding"
      ? "Svara endast med påståenden som kan styrkas direkt av kontexten. Om kontexten inte räcker, säg att informationen saknas i dokumentet. Gissa aldrig och använd inte allmän kunskap."
      : "Om svaret inte finns i kontexten, säg att informationen saknas i dokumentet.";

  return `Du är en hjälpsam dokumentassistent. Svara enbart på användarens fråga baserat på följande kontext från dokumentet:

${context}

${instruction}`;
}