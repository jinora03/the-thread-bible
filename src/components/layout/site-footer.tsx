import { Link } from 'react-router'
import { PageContainer } from '@/components/layout/page-container'
import { Logo } from '@/components/navigation/logo'
import { primaryNavigation } from '@/config/site'
import { useTranslation } from '@/hooks/use-scripture'

export function SiteFooter() {
  const translation = useTranslation()

  return (
    <footer className="mt-auto border-t">
      <PageContainer className="flex flex-col gap-8 py-10 text-sm text-muted-foreground md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-3">
          <Logo />
          {translation.license && (
            <p className="leading-relaxed">
              Scripture text: {translation.name}. {translation.license}.
            </p>
          )}
          <p className="leading-relaxed">
            Study content is labelled with its editorial status. Entries marked “In review” have not yet completed
            theological review.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {primaryNavigation.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/search" className="hover:text-foreground">
                Search
              </Link>
            </li>
          </ul>
        </nav>
      </PageContainer>
    </footer>
  )
}
