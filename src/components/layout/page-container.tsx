import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Horizontal page frame. `box-content` keeps the max-width for the content
 * itself, with the responsive gutter added outside it.
 */
const pageContainerVariants = cva('mx-auto box-content px-4 sm:px-6 lg:px-8 xl:px-12', {
  variants: {
    width: {
      reading: 'max-w-reading',
      article: 'max-w-article',
      wide: 'max-w-wide',
    },
  },
  defaultVariants: {
    width: 'wide',
  },
})

type PageContainerProps = React.ComponentProps<'div'> & VariantProps<typeof pageContainerVariants>

export function PageContainer({ width, className, ...props }: PageContainerProps) {
  return <div className={cn(pageContainerVariants({ width }), className)} {...props} />
}
