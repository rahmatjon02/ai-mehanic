export function stripMarkdownFence(value: string): string {
  return value
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

export function safeJsonParse<T>(value: string): T {
  const normalized = stripMarkdownFence(value);
  const jsonStart = normalized.indexOf('{');
  const jsonEnd = normalized.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('No JSON object found in AI response');
  }

  return JSON.parse(normalized.slice(jsonStart, jsonEnd + 1)) as T;
}
