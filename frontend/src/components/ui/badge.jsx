import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-cyan-400/30 bg-cyan-500/10 text-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.15)]",
        secondary:
          "border-white/10 bg-white/[0.06] text-slate-200 backdrop-blur-md",
        destructive:
          "border-red-500/30 bg-red-500/15 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]",
        outline: "border-white/20 text-slate-200 bg-transparent",
        cyber: "border-[#00F0FF]/50 bg-[#00F0FF]/15 text-[#00F0FF] font-mono shadow-[0_0_12px_rgba(0,240,255,0.25)]",
        neon: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_10px_rgba(57,255,20,0.2)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
