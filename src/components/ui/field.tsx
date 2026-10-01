import * as React from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

function Field({
  className,
  ...props
}: React.ComponentProps<"div"> & { "data-invalid"?: boolean }) {
  return (
    <div
      role="group"
      data-slot="field"
      className={cn("flex w-full flex-col gap-2", className)}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn("w-fit leading-snug", className)}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-sm leading-normal text-muted-foreground", className)}
      {...props}
    />
  )
}

/** Renders the first validation message. Announced via `role="alert"`. */
function FieldError({
  className,
  errors,
  ...props
}: React.ComponentProps<"p"> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const message = errors?.find((error) => error?.message)?.message
  if (!message) return null

  return (
    <p
      role="alert"
      data-slot="field-error"
      className={cn("text-sm text-destructive", className)}
      {...props}
    >
      {message}
    </p>
  )
}

export { Field, FieldLabel, FieldDescription, FieldError }
