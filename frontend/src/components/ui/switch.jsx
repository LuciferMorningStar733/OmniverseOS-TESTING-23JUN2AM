import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-white/10 shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#00F0FF] data-[state=checked]:border-cyan-300/40 data-[state=checked]:shadow-[0_0_12px_rgba(0,240,255,0.5)] data-[state=unchecked]:bg-white/10",
      className
    )}
    {...props}
    ref={ref}>
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full shadow-md ring-0 transition-transform duration-200 ease-out data-[state=checked]:translate-x-4 data-[state=checked]:bg-[#05050A] data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-slate-200"
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
