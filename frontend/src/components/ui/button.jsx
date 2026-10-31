import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 active:scale-[0.96] active:translate-y-[0.5px] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#00F0FF] text-[#05050A] font-semibold shadow-[0_0_20px_rgba(0,240,255,0.30)] hover:bg-[#5FF8FF] hover:shadow-[0_0_28px_rgba(0,240,255,0.50)] border border-cyan-300/40",
        destructive:
          "bg-[#DC2626]/80 text-white shadow-[0_0_20px_rgba(220,38,38,0.35)] hover:bg-[#DC2626] border border-red-500/40 backdrop-blur-md",
        outline:
          "border border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:border-cyan-400/40 hover:text-[#00F0FF] shadow-sm backdrop-blur-md",
        secondary:
          "bg-white/[0.06] text-white hover:bg-white/[0.12] border border-white/[0.08] shadow-sm backdrop-blur-md",
        ghost: "text-slate-300 hover:text-white hover:bg-white/[0.08] backdrop-blur-sm",
        glass:
          "bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 hover:border-cyan-400/40 text-white backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]",
        cyber:
          "bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/40 hover:bg-[#00F0FF]/20 hover:border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.2)] font-mono",
        glow:
          "bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:shadow-[0_0_35px_rgba(0,240,255,0.6)] hover:brightness-110",
        link: "text-[#00F0FF] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-7 rounded-lg px-2.5 text-xs",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6 text-base",
        pill: "h-9 rounded-full px-5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
