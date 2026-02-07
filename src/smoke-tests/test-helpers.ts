export function extractText(result: unknown): string {
  const r = result as { content?: Array<{ text?: string }> };
  if (!r.content || !Array.isArray(r.content)) return '';
  return r.content.map((c) => c.text ?? '').join('\n');
}

export function isErrorResponse(result: unknown): boolean {
  const r = result as { isError?: boolean; content?: Array<{ text?: string }> };
  if (r.isError) return true;
  if (!r.content || !Array.isArray(r.content)) return false;
  return r.content.some(
    (c) =>
      typeof c.text === 'string' &&
      (c.text.toLowerCase().includes('error') ||
        c.text.toLowerCase().includes('required') ||
        c.text.toLowerCase().includes('missing') ||
        c.text.toLowerCase().includes('must provide') ||
        c.text.toLowerCase().includes('provide') ||
        c.text.toLowerCase().includes('fail')),
  );
}

export function getContent(result: unknown): Array<{ type?: string; text?: string }> {
  const r = result as { content?: Array<{ type?: string; text?: string }> };
  return Array.isArray(r.content) ? r.content : [];
}
