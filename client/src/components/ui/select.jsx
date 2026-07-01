import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <div className={cn("relative", className)} ref={ref}>
    <select
      className={cn(
        "flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
  </div>
))
Select.displayName = "Select"

const SelectItem = ({ value, children, ...props }) => (
  <option value={value} {...props}>
    {children}
  </option>
)

export { Select, SelectItem }
