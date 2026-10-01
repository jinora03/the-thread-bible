import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { pageTitle } from '@/config/site'
import { AuthLayout } from '@/features/auth/auth-layout'
import { safeNext } from '@/features/auth/safe-next'
import { signUp } from '@/services/auth-client'

const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Tell us what to call you.').max(80, 'Keep your name under 80 characters.'),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(10, 'Use at least 10 characters.').max(128, 'Use at most 128 characters.'),
})

type SignUpValues = z.infer<typeof signUpSchema>

export function SignUpPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema), defaultValues: { name: '', email: '', password: '' } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = async (values: SignUpValues) => {
    setFormError(null)
    const { error } = await signUp.email(values)
    if (error) {
      setFormError(
        error.code?.startsWith('USER_ALREADY_EXISTS')
          ? 'An account with that email already exists. Sign in instead.'
          : (error.message ?? 'The account couldn’t be created. Please try again.'),
      )
      return
    }
    toast.success('Welcome! Your account is ready.')
    navigate(next)
  }

  return (
    <AuthLayout
      title="Create an account"
      description="An account keeps your library in sync. Anything you’ve saved in this browser moves across when you sign up."
      footer={
        <>
          Already have an account?{' '}
          <Link to={`/sign-in?next=${encodeURIComponent(next)}`} className="font-medium text-reference link-quiet">
            Sign in
          </Link>
        </>
      }
    >
      <title>{pageTitle('Create an account')}</title>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-5">
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="sign-up-name">Name</FieldLabel>
          <Input id="sign-up-name" autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby="sign-up-name-error" {...form.register('name')} />
          <FieldError id="sign-up-name-error" errors={[errors.name]} />
        </Field>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="sign-up-email">Email</FieldLabel>
          <Input id="sign-up-email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby="sign-up-email-error" {...form.register('email')} />
          <FieldError id="sign-up-email-error" errors={[errors.email]} />
        </Field>
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="sign-up-password">Password</FieldLabel>
          <Input
            id="sign-up-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby="sign-up-password-hint sign-up-password-error"
            {...form.register('password')}
          />
          <FieldDescription id="sign-up-password-hint">At least 10 characters. A few unrelated words make a strong one.</FieldDescription>
          <FieldError id="sign-up-password-error" errors={[errors.password]} />
        </Field>
        {formError && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
