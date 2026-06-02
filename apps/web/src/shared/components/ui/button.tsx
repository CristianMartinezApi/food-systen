import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-label font-body font-bold uppercase tracking-[0.06em] ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-slate-950 text-white hover:bg-primary shadow-xl shadow-slate-950/20",
        destructive:
          "bg-rose-500 text-white hover:bg-rose-600 shadow-xl shadow-rose-500/20",
        outline:
          "border-2 border-slate-100 bg-transparent hover:bg-slate-50 hover:text-slate-950 hover:border-slate-200",
        secondary:
          "bg-slate-50 text-slate-900 hover:bg-slate-100",
        ghost: "hover:bg-slate-50 text-slate-500 hover:text-slate-950",
        link: "text-primary underline-offset-4 hover:underline lowercase normal-case",
      },
      size: {
        default: "h-14 px-8 py-4",
        sm: "h-11 rounded-xl px-4 text-[10px]",
        lg: "h-16 rounded-[1.5rem] px-10 text-body font-bold",
        icon: "h-12 w-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
