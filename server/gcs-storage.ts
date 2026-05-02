import { Storage } from '@google-cloud/storage';
import path from 'path';

const credentials = process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS) : undefined;
const projectId = credentials?.project_id || process.env.GOOGLE_CLOUD_PROJECT;
const bucketName = `${projectId}.appspot.com`;

const storage = new Storage({
  projectId,
  credentials,
});

const bucket = storage.bucket(bucketName);

export async function uploadToGCS(buffer: Buffer, fileName: string, mimetype: string): Promise<string> {
  const file = bucket.file(`uploads/${fileName}`);
  
  await file.save(buffer, {
    metadata: {
      contentType: mimetype,
    },
    resumable: false,
  });

  // Make the file public if you want it to be accessible via a public URL
  // Alternatively, use signed URLs if you want to keep them private
  try {
    await file.makePublic();
  } catch (error) {
    console.warn(`Could not make ${fileName} public, it might already be public or permissions are restricted.`);
  }

  return `https://storage.googleapis.com/${bucketName}/uploads/${fileName}`;
}

export async function deleteFromGCS(fileName: string): Promise<void> {
  const file = bucket.file(`uploads/${fileName}`);
  try {
    await file.delete();
  } catch (error) {
    console.error(`Error deleting file ${fileName} from GCS:`, error);
  }
}
