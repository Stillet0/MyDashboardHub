/** Extrait les éléments d'une réponse IA formatée en liste (numérotée ou à puces). */
export function parseListItems(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .map((line) => line.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, ''))
    .map((line) => line.replace(/^\*\*(.*)\*\*$/, '$1'))
    .filter((line) => line.length > 0)
}
