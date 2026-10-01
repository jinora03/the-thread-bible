import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Visual heading styles, independent of document level.
 * Always choose `level` for the outline and `variant` for the look.
 */
const headingVariants = cva('font-serif text-foreground', {
  variants: {
    variant: {
      display: 'text-[2.5rem] leading-[1.05] font-normal tracking-[-0.02em] sm:text-5xl lg:text-[3.75rem]',
      title: 'text-[2rem] leading-[1.1] font-normal tracking-[-0.015em] sm:text-4xl lg:text-[2.75rem]',
      section: 'text-2xl leading-tight font-normal tracking-[-0.01em] sm:text-[1.75rem]',
      subsection: 'text-xl leading-snug font-medium sm:text-[1.3125rem]',
      item: 'text-lg leading-snug font-medium',
      label: 'eyebrow',
    },
  },
  defaultVariants: {
    variant: 'section',
  },
})

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

type HeadingProps = React.ComponentProps<'h2'> &
  VariantProps<typeof headingVariants> & {
    level: HeadingLevel
  }

export function Heading({ level, variant, className, ...props }: HeadingProps) {
  const Tag = `h${level}` as const
  return <Tag className={cn(headingVariants({ variant }), className)} {...props} />
}

export type { HeadingLevel }
