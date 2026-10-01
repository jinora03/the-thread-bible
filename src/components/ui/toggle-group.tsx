import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"
import { toggleVariants } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

/** A quiet segmented control: inset track, raised active segment. */
function ToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn(
        "inline-flex w-fit items-center gap-0.5 rounded-lg bg-surface-subtle p-1",
        className
      )}
      {...props}
    />
  )
}

function ToggleGroupItem({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  Pick<VariantProps<typeof toggleVariants>, "size">) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(toggleVariants({ size }), "focus-visible:z-10", className)}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
