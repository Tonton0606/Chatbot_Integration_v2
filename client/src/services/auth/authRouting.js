export function shouldStartInLoginMode({ pathname, search, hasInvite }) {
  if (hasInvite) return false;

  return (
    pathname === "/login" ||
    (pathname !== "/signup" && !search.includes("signup=true"))
  );
}

export function canToggleAuthMode(hasInvite) {
  return !hasInvite;
}
