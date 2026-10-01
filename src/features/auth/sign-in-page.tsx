import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { pageTitle } from '@/config/site'
import { AuthLayout } from '@/features/auth/auth-layout'
import { safeNext } from '@/features/auth/safe-next'
import { signIn } from '@/services/auth-client'

const signInSchema = z.object({
  email: z.email('Enter the email address you signed up with.'),
  password: z.string().min(1, 'Enter your password.'),
})

type SignInValues = z.infer<typeof signInSchema>

export function SignInPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = async (values: SignInValues) => {
    setFormError(null)
    const { error } = await signIn.email(values)
    if (error) {
      setFormError(
        error.code === 'INVALID_EMAIL_OR_PASSWORD'
          ? 'That email and password don’t match an account. Check both and try again.'
          : (error.message ?? 'Signing in didn’t work. Please try again.'),
      )
      return
    }
    toast.success('Signed in')
    navigate(next)
  }

  return (
    <AuthLayout
      title="Sign in"
      description="Keep your saved passages, notes and reading in step across devices. Everything works without an account, too."
      footer={
        <>
          New here?{' '}
          <Link to={`/sign-up?next=${encodeURIComponent(next)}`} className="font-medium text-reference link-quiet">
            Create an account
          </Link>
        </>
      }
    >
      <title>{pageTitle('Sign in')}</title>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-5">
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
          <Input id="sign-in-email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby="sign-in-email-error" {...form.register('email')} />
          <FieldError id="sign-in-email-error" errors={[errors.email]} />
        </Field>
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
          <Input id="sign-in-password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} aria-describedby="sign-in-password-error" {...form.register('password')} />
          <FieldError id="sign-in-password-error" errors={[errors.password]} />
        </Field>
        {formError && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
