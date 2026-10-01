/** Only allow redirects to paths inside this app (never to another site). */
export function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/library'
}
