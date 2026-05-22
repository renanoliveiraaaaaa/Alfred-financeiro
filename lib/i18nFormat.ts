/** Substitui placeholders `{key}` em strings de locale. */
export function formatMessage(
  template: string,
  vars: Record<string, string | number>,
): string {
  let out = template
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, String(value))
  }
  return out
}
