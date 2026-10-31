import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-sm text-white shadow-inner backdrop-blur-md transition-all duration-200 placeholder:text-slate-500 focus-visible:outline-none focus-visible:border-cyan-400/60 focus-visible:ring-2 focus-visible:ring-cyan-400/25 focus-visible:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      ref={ref}
      {...props} />
  );
})
Input.displayName = "Input"

export { Input }
