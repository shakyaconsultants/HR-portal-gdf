import path from "path";
import { existsSync } from "fs";

/**
 * Resolve a stored attachment path (public URL like /uploads/... or absolute disk path)
 * to an absolute filesystem path for reading file contents.
 */
export function resolveStorageDiskPath(storagePath: string): string {
  const trimmed = storagePath.trim();
  if (!trimmed) return "";

  const normalized = trimmed.replace(/\\/g, "/");

  // Web-relative: /uploads/... or uploads/...
  const webUploads = normalized.match(/^\/?uploads\/(.+)$/i);
  if (webUploads) {
    return path.join(process.cwd(), "public", "uploads", ...webUploads[1].split("/"));
  }

  // Windows mistake: C:/uploads/... (path.resolve artifact) → project public/uploads
  const driveRootUploads = normalized.match(/^[a-z]:\/uploads\/(.+)$/i);
  if (driveRootUploads) {
    return path.join(process.cwd(), "public", "uploads", ...driveRootUploads[1].split("/"));
  }

  if (normalized.startsWith("public/")) {
    return path.join(process.cwd(), ...normalized.split("/"));
  }

  // Already under project public/uploads (absolute)
  const publicUploads = normalized.match(/\/public\/uploads\/(.+)$/i);
  if (publicUploads && path.isAbsolute(trimmed)) {
    return trimmed;
  }

  if (path.isAbsolute(trimmed)) {
    return trimmed;
  }

  return path.join(process.cwd(), ...normalized.replace(/^\//, "").split("/"));
}

/** Resolve upload path and verify the file exists (for email attachments). */
export function resolveExistingUploadPath(storagePath: string): string {
  const diskPath = resolveStorageDiskPath(storagePath);
  if (diskPath && existsSync(diskPath)) return diskPath;

  // Last resort: filename only under public/uploads/offers
  const baseName = path.basename(storagePath.replace(/\\/g, "/"));
  const candidateIdMatch = storagePath.replace(/\\/g, "/").match(/uploads\/offers\/([^/]+)\//i);
  if (baseName && candidateIdMatch) {
    const alt = path.join(
      process.cwd(),
      "public",
      "uploads",
      "offers",
      candidateIdMatch[1],
      baseName
    );
    if (existsSync(alt)) return alt;
  }

  return diskPath;
}
