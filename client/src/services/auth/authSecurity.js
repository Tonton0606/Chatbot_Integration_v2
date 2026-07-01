export function calculatePasswordStrength(password) {
  if (!password) return { score: 0, label: "", valid: false, checks: {} };

  const checks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
    noCommon: !["password", "123456", "qwerty", "admin"].some((common) =>
      password.toLowerCase().includes(common)
    ),
  };

  let score = 0;
  if (checks.length) score += 25;
  if (checks.uppercase) score += 15;
  if (checks.lowercase) score += 10;
  if (checks.numbers) score += 15;
  if (checks.special) score += 20;
  if (checks.noCommon) score += 15;

  const passedChecks = Object.values(checks).filter(Boolean).length;

  let label = "Weak";
  if (score >= 80 && passedChecks >= 5) label = "Strong";
  else if (score >= 60 && passedChecks >= 4) label = "Good";
  else if (score >= 40 && passedChecks >= 3) label = "Fair";

  return {
    score: Math.min(score, 100),
    label,
    valid: Object.values(checks).every(Boolean),
    checks,
  };
}

export function generateDeviceFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}`,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency,
    navigator.deviceMemory,
  ];

  return btoa(components.join("|")).substring(0, 32);
}

export function getFriendlyAuthError(error) {
  const message = error?.message || "An error occurred. Please try again.";

  // Network failure — server is down or unreachable
  if (
    message === "Failed to fetch" ||
    message.includes("NetworkError") ||
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("ECONNREFUSED")
  ) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  if (message.includes("Invalid login credentials")) {
    return "Invalid email or password. Please check your credentials and try again.";
  }

  if (message.includes("User already registered")) {
    return "An account with this email already exists. Please log in instead.";
  }

  if (message.includes("Password should be at least") || message.includes("Password must be at least")) {
    return "Password does not meet the security requirements. Please use at least 12 characters with uppercase, lowercase, number, and special character.";
  }

  if (message.includes("Email not confirmed")) {
    return "Please confirm your email address before logging in.";
  }

  if (message.includes("rate limit") || message.includes("Too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (message.includes("account is not active") || message.includes("User account is not active")) {
    return "Your account has been deactivated. Please contact support.";
  }

  if (message.includes("Token has been revoked") || message.includes("expired")) {
    return "Your session has expired. Please sign in again.";
  }

  return message;
}

export function getProgressiveDelay(failedAttempts) {
  if (failedAttempts >= 10) return 30000;
  if (failedAttempts >= 7) return 10000;
  if (failedAttempts >= 5) return 5000;
  if (failedAttempts >= 3) return 2000;

  return 0;
}
