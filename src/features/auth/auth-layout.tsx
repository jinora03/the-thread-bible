import { PageContainer } from '@/components/layout/page-container'
import { ThreadMark } from '@/components/navigation/logo'
import { Heading } from '@/components/typography/heading'

/** A quiet, centred frame for the sign-in and sign-up forms. */
export function AuthLayout({ title, description, children, footer }: {
  title: string
  description: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <PageContainer className="py-12 sm:py-20">
      <div className="mx-auto max-w-sm">
        <ThreadMark className="size-6" />
        <Heading level={1} variant="title" className="mt-5">
          {title}
        </Heading>
        <p className="mt-3 text-muted-foreground">{description}</p>
        <div className="mt-8">{children}</div>
        <div className="mt-8 border-t pt-6 text-sm text-muted-foreground">{footer}</div>
      </div>
    </PageContainer>
  )
}

