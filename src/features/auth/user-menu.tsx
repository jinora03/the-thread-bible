import { LibraryBig, LogOut } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut, useSession } from '@/services/auth-client'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

/** Sign-in link when signed out; an account menu (library, sign out) when signed in. */
export function UserMenu() {
  const { data: session, isPending } = useSession()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Hold the space while the session resolves, so the header doesn't shift.
  if (isPending) return <span aria-hidden="true" className="hidden size-10 md:block" />

  if (!session) {
    const next = pathname.startsWith('/sign-') ? '' : `?next=${encodeURIComponent(pathname)}`
    return (
      <Button asChild variant="ghost" className="hidden md:inline-flex">
        <Link to={`/sign-in${next}`}>Sign in</Link>
      </Button>
    )
  }

  const { user } = session
  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out. Your library stays in your account.')
    navigate('/')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Account: ${user.name}`}>
          <span className="flex size-8 items-center justify-center rounded-full bg-surface-subtle font-sans text-xs font-semibold text-foreground">
            {initials(user.name) || '·'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2.5 pt-2.5 pb-2">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/library">
            <LibraryBig />
            Your library
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
