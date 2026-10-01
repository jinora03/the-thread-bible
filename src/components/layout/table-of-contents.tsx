interface TableOfContentsProps {
  items: { id: string; label: string }[]
}

/** "On this page" anchor list for long articles. */
export function TableOfContents({ items }: TableOfContentsProps) {
  return (
    <nav aria-labelledby="toc-heading">
      <h2 id="toc-heading" className="eyebrow">
        On this page
      </h2>
      <ol className="mt-4 space-y-2.5 border-l">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="-ml-px block border-l border-transparent pl-4 text-sm leading-snug text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
