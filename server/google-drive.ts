import { google } from 'googleapis';
import { Readable } from 'stream';

// Google Drive Folder ID for verifications - should be in .env
const FOLDER_ID = process.env.GOOGLE_DRIVE_VERIFICATION_FOLDER_ID;

const auth = new google.auth.GoogleAuth({
  credentials: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS) : undefined,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

export async function uploadToDrive(file: Express.Multer.File, fileName: string) {
  if (!process.env.GOOGLE_CREDENTIALS || !FOLDER_ID) {
    console.warn('Google Drive credentials or Folder ID missing. Skipping upload.');
    return null;
  }

  try {
    const fileMetadata = {
      name: fileName,
      parents: [FOLDER_ID],
    };

    const media = {
      mimeType: file.mimetype,
      body: Readable.from(file.buffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    // Make file public if needed, or just return the link
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return response.data.webViewLink;
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw error;
  }
}
