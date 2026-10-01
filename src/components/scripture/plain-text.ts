/** Plain text for copying and sharing: poetic line breaks become spaces. */
export function verseToPlainText(text: string) {
  return text.replace(/\s*\n\t?\s*/g, ' ').replace(/^\t/, '')
}
