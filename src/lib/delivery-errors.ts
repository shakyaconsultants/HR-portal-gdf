/**
 * Map raw SMTP / filesystem errors to short, user-safe messages.
 * Never expose local paths, stack traces, or Node error codes in the UI.
 */
export function sanitizeDeliveryError(raw: string | undefined | null): string {
  if (!raw?.trim()) {
    return "Email could not be delivered. Please try again or use Retry delivery.";
  }

  const msg = raw.trim().replace(/^delivery failed:\s*/i, "");
  const lower = msg.toLowerCase();

  if (lower.includes("enoent") || lower.includes("no such file")) {
    return "The offer letter PDF could not be found. Resend the offer letter to generate a new PDF.";
  }
  if (lower.includes("smtp is not configured")) {
    return "Email is not configured. Add SMTP settings to .env.local.";
  }
  if (lower.includes("eauth") || lower.includes("authentication") || lower.includes("username and password")) {
    return "Email login failed. Check SMTP username and app password.";
  }
  if (lower.includes("etimedout") || lower.includes("timeout") || lower.includes("timed out")) {
    return "The email server took too long to respond. Try again in a few minutes.";
  }
  if (lower.includes("econnrefused") || lower.includes("connection refused")) {
    return "Could not connect to the email server. Check SMTP host and port.";
  }
  if (lower.includes("attachment") && lower.includes("no content")) {
    return "An email attachment is missing. Resend the offer letter to regenerate the PDF.";
  }

  // Strip technical noise: paths, long system messages
  if (
    msg.length > 160 ||
    /[a-z]:\\/i.test(msg) ||
    /\/uploads\//i.test(msg) ||
    lower.includes("node_modules") ||
    lower.includes("syscall")
  ) {
    return "Email could not be delivered. Use Retry delivery or check Email Management.";
  }

  return msg;
}
