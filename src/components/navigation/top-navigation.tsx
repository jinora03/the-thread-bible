import { Link, NavLink } from 'react-router'
import { PageContainer } from '@/components/layout/page-container'
import { Logo } from '@/components/navigation/logo'
import { MobileNavigation } from '@/components/navigation/mobile-navigation'
import { ThemeToggle } from '@/components/navigation/theme-toggle'
import { primaryNavigation } from '@/config/site'
import { cn } from '@/lib/utils'

interface TopNavigationProps {
  /** Search trigger, supplied by the app shell. */
  search: React.ReactNode
  /** Sign-in link or account menu, supplied by the app shell. */
  account: React.ReactNode
}

export function TopNavigation({ search, account }: TopNavigationProps) {
  return (
    <header className="border-b">
      <PageContainer className="flex h-16 items-center gap-6">
        <Link to="/" aria-label="The Thread Bible, home" className="-m-1 shrink-0 rounded-md p-1">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {primaryNavigation.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'relative inline-flex h-10 items-center px-3 text-sm font-medium transition-colors hover:text-foreground',
                      isActive
                        ? 'text-foreground after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:bg-primary dark:after:bg-reference'
                        : 'text-muted-foreground',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {search}
          <ThemeToggle />
          {account}
          <MobileNavigation />
        </div>
      </PageContainer>
    </header>
  )
}
