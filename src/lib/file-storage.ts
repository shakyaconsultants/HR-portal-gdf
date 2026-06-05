import "server-only";
import { readFile } from "fs/promises";
import { uploadToCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";
import { resolveStorageDiskPath } from "@/lib/storage-paths";

export type StoredFile = {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export function isStoredFileUrl(storagePath: string) {
  return /^https?:\/\//i.test(storagePath.trim());
}

/** Public href for UI — Cloudinary URLs pass through; legacy paths stay relative. */
export function resolveFileHref(storagePath: string) {
  const trimmed = storagePath.trim();
  if (!trimmed) return "";
  if (isStoredFileUrl(trimmed)) return trimmed;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export async function readStoredFileBuffer(storagePath: string): Promise<Buffer> {
  const trimmed = storagePath.trim();
  if (!trimmed) {
    throw new Error("File path is empty.");
  }

  if (isStoredFileUrl(trimmed)) {
    const res = await fetch(trimmed, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Unable to fetch file (${res.status}).`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  const diskPath = resolveStorageDiskPath(trimmed);
  return readFile(diskPath);
}

export async function storeBuffer(
  buffer: Buffer,
  folder: string,
  fileName: string,
  mimeType: string
): Promise<StoredFile> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "File storage requires Cloudinary. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  const uploaded = await uploadToCloudinary(buffer, { folder, fileName, mimeType });
  return {
    url: uploaded.url,
    fileName,
    mimeType,
    size: uploaded.bytes,
  };
}

export async function storeUploadedFile(
  file: File,
  folder: string,
  namePrefix: string
): Promise<StoredFile> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${namePrefix}_${Date.now()}_${safeName}`;
  const mimeType = file.type || "application/octet-stream";
  return storeBuffer(bytes, folder, storedName, mimeType);
}
