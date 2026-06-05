import "server-only";
import { v2 as cloudinary } from "cloudinary";

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
  bytes: number;
};

let configured = false;

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

function ensureConfigured() {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local."
    );
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME!.trim(),
      api_key: process.env.CLOUDINARY_API_KEY!.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET!.trim(),
      secure: true,
    });
    configured = true;
  }
}

export async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    folder: string;
    fileName: string;
    mimeType?: string;
  }
): Promise<CloudinaryUploadResult> {
  ensureConfigured();

  const resourceType =
    options.mimeType === "application/pdf" || options.fileName.toLowerCase().endsWith(".pdf")
      ? "raw"
      : "image";

  const publicId = options.fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 180);

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: `gdf-portal/${options.folder}`,
        public_id: publicId,
        resource_type: resourceType,
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes ?? buffer.length,
        });
      }
    );
    upload.end(buffer);
  });
}
