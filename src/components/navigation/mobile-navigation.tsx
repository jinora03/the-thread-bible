import { useState } from 'react'
import { Menu } from 'lucide-react'
import { NavLink } from 'react-router'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { exploreCollections, exploreGroups } from '@/config/explore'
import { primaryNavigation } from '@/config/site'
import { cn } from '@/lib/utils'
import { useSession } from '@/services/auth-client'

/** Small screens: the same primary navigation, plus Explore categories, in a sheet. */
export function MobileNavigation() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const { data: session } = useSession()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
        </SheetHeader>

        <nav aria-label="Main" className="px-4 pt-4 pb-8">
          <ul>
            {primaryNavigation.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={close}
                  className={({ isActive }) =>
                    cn(
                      'flex h-12 items-center border-b font-serif text-xl',
                      isActive ? 'text-primary dark:text-reference' : 'text-foreground',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm">
            {session ? (
              <span className="text-muted-foreground">Signed in as {session.user.name}</span>
            ) : (
              <NavLink to="/sign-in" onClick={close} className="font-medium text-reference link-quiet">
                Sign in to sync your library
              </NavLink>
            )}
          </p>

          {exploreGroups.map((group) => (
            <div key={group.id} className="mt-8">
              <h2 className="eyebrow">{group.title}</h2>
              <ul className="mt-2 grid grid-cols-2 gap-x-4">
                {exploreCollections
                  .filter((collection) => collection.group === group.id)
                  .map((collection) => (
                    <li key={collection.slug}>
                      <NavLink
                        to={`/explore/${collection.slug}`}
                        onClick={close}
                        className="flex h-10 items-center text-[0.9375rem] text-muted-foreground hover:text-foreground aria-[current=page]:text-foreground"
                      >
                        {collection.title}
                      </NavLink>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
