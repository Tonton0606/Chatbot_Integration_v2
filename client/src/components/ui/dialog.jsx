import * as React from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = ({ open, onClose, children, className }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative bg-background rounded-lg shadow-lg w-full max-h-[90vh] overflow-y-auto border",
          className || "max-w-md"
        )}
      >
        {children}
      </div>
    </div>
  )
}

const DialogHeader = ({ className, children, ...props }) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left p-6 border-b",
      className
    )}
    {...props}
  >
    {children}
  </div>
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, children, ...props }) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-0",
      className
    )}
    {...props}
  >
    {children}
  </div>
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

const DialogContent = ({ className, children, onClose, ...props }) => (
  <div className={cn("p-6", className)} {...props}>
    {onClose && (
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
    )}
    {children}
  </div>
)
DialogContent.displayName = "DialogContent"

export {
  Dialog,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogContent,
}
