import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import type { User } from '@shared/schema';

// Required environment variables:
// GOOGLE_DRIVE_CLIENT_ID
// GOOGLE_DRIVE_CLIENT_SECRET
// GOOGLE_DRIVE_REFRESH_TOKEN
// GOOGLE_DRIVE_FOLDER_ID (The parent folder where all verifications will be stored)

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_DRIVE_CLIENT_ID,
  process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN
  });
}

const drive = google.drive({ version: 'v3', auth: oauth2Client });

export async function uploadVerificationToDrive(user: User) {
  if (!process.env.GOOGLE_DRIVE_REFRESH_TOKEN || !process.env.GOOGLE_DRIVE_FOLDER_ID) {
    console.warn('[Google Drive] Missing credentials or folder ID. Skipping upload.');
    return;
  }

  try {
    console.log(`[Google Drive] Starting verification backup for user ${user.id} (${user.email})`);

    // 1. Create a folder for this user
    const folderMetadata = {
      name: `${user.firstName} ${user.lastName} (${user.email}) - Verification`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!]
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });

    const userFolderId = folder.data.id!;

    // 2. Upload JSON data
    const verificationData = {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phoneNumber: user.phoneNumber,
      whatsapp: user.whatsappBusinessNumber,
      socialMedia: user.socialMediaPresence,
      verificationType: user.sellerVerificationType,
      idType: user.idType,
      address: user.sellerAddress,
      location: {
        lat: user.sellerLatitude,
        lng: user.sellerLongitude
      },
      verifiedAt: new Date().toISOString()
    };

    const tempFilePath = path.join(process.cwd(), `verification_${user.id}.json`);
    fs.writeFileSync(tempFilePath, JSON.stringify(verificationData, null, 2));

    await drive.files.create({
      requestBody: {
        name: 'data.json',
        parents: [userFolderId]
      },
      media: {
        mimeType: 'application/json',
        body: fs.createReadStream(tempFilePath)
      }
    });

    fs.unlinkSync(tempFilePath);

    // 3. Upload images
    const uploadImage = async (url: string, fileName: string) => {
      // url is like /uploads/filename.jpg
      const fullPath = path.join(process.cwd(), url);
      if (fs.existsSync(fullPath)) {
        await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [userFolderId]
          },
          media: {
            body: fs.createReadStream(fullPath)
          }
        });
      }
    };

    if (user.idScanUrl) await uploadImage(user.idScanUrl, 'id_front' + path.extname(user.idScanUrl));
    if (user.idScanUrlBack) await uploadImage(user.idScanUrlBack, 'id_back' + path.extname(user.idScanUrlBack));
    if (user.faceScanUrl) await uploadImage(user.faceScanUrl, 'face_scan' + path.extname(user.faceScanUrl));

    console.log(`[Google Drive] Backup completed for user ${user.id}`);
  } catch (error) {
    console.error('[Google Drive] Backup failed:', error);
  }
}
