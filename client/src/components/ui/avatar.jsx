import * as React from "react"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef(({ className, ...props }, ref) => (
  <img
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef(({ className, name, ...props }, ref) => {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-red-500",
    "bg-indigo-500",
  ]
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0
  const bgColor = colors[colorIndex]

  return (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full text-white text-sm font-medium",
        bgColor,
        className
      )}
      {...props}
    >
      {initials}
    </div>
  )
})
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
