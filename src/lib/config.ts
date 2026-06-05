const DEMO_HOSTS = ["cluster0.mongodb.net"];

export function getServerConfigError(): string | null {
  const uri = process.env.MONGODB_URI?.trim();
  const jwtSecret = process.env.JWT_SECRET?.trim();

  if (!uri) {
    return "Database is not configured. Add MONGODB_URI to .env.local.";
  }

  if (/username:password/i.test(uri) || /YOUR_DB_/i.test(uri)) {
    return "MongoDB URI still has placeholder values. Paste your real Atlas connection string in .env.local.";
  }

  if (DEMO_HOSTS.some((host) => uri.includes(host))) {
    return "MongoDB URI points to demo host cluster0.mongodb.net. Use your real Atlas cluster host from MongoDB Atlas → Connect.";
  }

  if (!jwtSecret || jwtSecret.includes("replace_with") || jwtSecret.includes("change_this_to")) {
    return "JWT_SECRET is still a placeholder. Set a long random secret in .env.local, then restart npm run dev.";
  }

  return null;
}

export function mapDbErrorMessage(error: unknown): string | null {
  const msg =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: string }).message).toLowerCase()
      : "";
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: string }).code)
      : "";

  if (code === "ENOTFOUND" || msg.includes("enotfound") || msg.includes("querysrv") || msg.includes("getaddrinfo")) {
    return "Cannot reach MongoDB. Update MONGODB_URI in .env.local with your real Atlas cluster, then restart the dev server.";
  }
  if (msg.includes("authentication failed") || msg.includes("bad auth")) {
    return "MongoDB username or password is incorrect.";
  }
  if (msg.includes("missing mongodb_uri")) {
    return "Database is not configured. Add MONGODB_URI to .env.local.";
  }
  if (msg.includes("missing jwt_secret")) {
    return "JWT secret is not configured. Set JWT_SECRET in .env.local.";
  }
  return null;
}
