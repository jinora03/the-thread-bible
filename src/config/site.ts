export const siteConfig = {
  name: 'The Thread Bible',
  description: 'An interconnected Bible study library. See how Scripture connects to Scripture.',
}

/** Primary navigation. Home is reached through the logo, not a nav item. */
export const primaryNavigation = [
  { label: 'Bible', to: '/bible' },
  { label: 'Explore', to: '/explore' },
  { label: 'Studies', to: '/studies' },
  { label: 'Library', to: '/library' },
] as const

export function pageTitle(title?: string) {
  return title ? `${title} · ${siteConfig.name}` : siteConfig.name
}
