import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

let storageInstance: Storage | null = null;

function getStorageClient(): Storage {
  if (!storageInstance) {
    // Under local development, if GCP credentials are not set up, Storage might fail to instantiate without arguments.
    // If credentials/project are configured via GCP environment variables or service account files, it initializes automatically.
    storageInstance = new Storage();
  }
  return storageInstance;
}

/**
 * Uploads a WebP image buffer to Google Cloud Storage if configured,
 * otherwise falls back to local disk storage (dev/testing).
 * 
 * @param buffer - WebP image Buffer
 * @param filename - Target filename (including extension)
 * @returns The web-accessible URL of the stored file
 */
export async function uploadImage(buffer: Buffer, filename: string): Promise<string> {
  const bucketName = process.env.GCS_BUCKET_NAME;

  if (bucketName) {
    try {
      console.log(`GCS configured. Uploading ${filename} to bucket ${bucketName}...`);
      const storage = getStorageClient();
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(filename);

      // Save the buffer directly to the storage bucket
      await file.save(buffer, {
        metadata: {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000', // Cache for 1 year
        },
        resumable: false, // Disables resumable uploads for fast small buffer writes
      });

      // Construct and return the standard public URL
      return `https://storage.googleapis.com/${bucketName}/${filename}`;
    } catch (err) {
      console.error('Failed to upload to Google Cloud Storage. Falling back to local storage:', err);
    }
  }

  // Fallback: Local filesystem storage
  console.log(`Using local filesystem storage fallback for ${filename}...`);
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filepath = path.join(uploadDir, filename);
  await fs.promises.writeFile(filepath, buffer);
  
  return `/uploads/${filename}`;
}
