import { google } from 'googleapis';
import { Readable } from 'stream';
import type { User } from '@shared/schema';

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

export async function uploadVerificationToDrive(user: User) {
  if (!process.env.GOOGLE_CREDENTIALS || !FOLDER_ID) {
    console.warn('Google Drive credentials or Folder ID missing. Skipping backup.');
    return false;
  }

  console.log(`Backing up verification for user ${user.id} (${user.firstName} ${user.lastName}) to Google Drive...`);

  try {
    // 1. Create a subfolder for this user
    const folderMetadata = {
      name: `Seller_${user.id}_${user.firstName}_${user.lastName}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [FOLDER_ID],
    };

    const folderResponse = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
    });
    const userFolderId = folderResponse.data.id!;

    // 2. Create a details text file
    const details = `
      SELLER VERIFICATION DETAILS
      --------------------------
      User ID: ${user.id}
      Name: ${user.firstName} ${user.lastName}
      Email: ${user.email}
      Phone: ${user.phoneNumber || 'N/A'}
      Verification Type: ${user.sellerVerificationType || 'STUDENT'}
      ID Type: ${user.idType || 'N/A'}
      Verification Status: ${user.verificationStatus}
      Verified At: ${user.verifiedAt ? new Date(user.verifiedAt).toLocaleString() : 'N/A'}
      
      Address: ${user.sellerAddress || 'N/A'}
      Coordinates: ${user.sellerLatitude}, ${user.sellerLongitude}
      Social Media: ${user.socialMediaPresence || 'N/A'}
      WhatsApp Business: ${user.whatsappBusinessNumber || 'N/A'}
      
      PAYMENT DETAILS
      ---------------
      Method: ${user.paymentMethod || 'N/A'}
      Bank: ${user.bankName || 'N/A'}
      Account Name: ${user.accountHolderName || 'N/A'}
      Account Number: ${user.bankAccountNumber || 'N/A'}
      MoMo Number: ${user.mobileMoneyPhone || 'N/A'}
    `;

    await drive.files.create({
      requestBody: {
        name: 'seller_details.txt',
        parents: [userFolderId],
      },
      media: {
        mimeType: 'text/plain',
        body: Readable.from(details),
      },
    });

    // 3. Upload images if they exist
    const uploadImageFromUrl = async (url: string, name: string) => {
      try {
        let buffer: Buffer;
        let contentType: string;

        if (url.startsWith('http')) {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
          contentType = response.headers.get('content-type') || 'image/jpeg';
        } else if (url.startsWith('/uploads/')) {
          const filePath = path.join(process.cwd(), url);
          if (fs.existsSync(filePath)) {
            buffer = await fs.promises.readFile(filePath);
            const ext = path.extname(url).toLowerCase();
            contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
          } else {
            return;
          }
        } else {
          return;
        }

        await drive.files.create({
          requestBody: {
            name: name,
            parents: [userFolderId],
          },
          media: {
            mimeType: contentType,
            body: Readable.from(buffer),
          },
        });
      } catch (err) {
        console.error(`Failed to upload image ${name} for user ${user.id}:`, err);
      }
    };

    if (user.idScanUrl) await uploadImageFromUrl(user.idScanUrl, 'id_scan_front');
    if (user.idScanUrlBack) await uploadImageFromUrl(user.idScanUrlBack, 'id_scan_back');
    if (user.faceScanUrl) await uploadImageFromUrl(user.faceScanUrl, 'face_scan');

    console.log(`Successfully backed up seller ${user.id} to Google Drive`);
    return true;
  } catch (error) {
    console.error('Error backing up to Google Drive:', error);
    return false;
  }
}

export async function uploadBuyerVerificationToDrive(user: User) {
  if (!process.env.GOOGLE_CREDENTIALS || !FOLDER_ID) {
    console.warn('Google Drive credentials or Folder ID missing. Skipping buyer backup.');
    return false;
  }

  console.log(`Backing up buyer installment verification for user ${user.id} (${user.firstName} ${user.lastName}) to Google Drive...`);

  try {
    // 1. Create a subfolder for this buyer
    const folderMetadata = {
      name: `Buyer_Installment_${user.id}_${user.firstName}_${user.lastName}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [FOLDER_ID],
    };

    const folderResponse = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
    });
    const userFolderId = folderResponse.data.id!;

    // 2. Create a details text file
    const details = `
      BUYER INSTALLMENT VERIFICATION DETAILS
      ------------------------------------
      User ID: ${user.id}
      Name: ${user.firstName} ${user.lastName}
      Email: ${user.email}
      Phone: ${user.phoneNumber || 'N/A'}
      Verification Status: Verified for Installments
      Verified At: ${user.buyerVerifiedAt ? new Date(user.buyerVerifiedAt).toLocaleString() : 'N/A'}
      
      Location: ${user.buyerLatitude}, ${user.buyerLongitude}
      
      EMPLOYMENT / INCOME DETAILS (From Schema)
      ---------------------------------------
      Occupation: ${user.verificationOccupation || 'N/A'}
      Salary: ${user.verificationSalary || 'N/A'}
    `;

    await drive.files.create({
      requestBody: {
        name: 'buyer_details.txt',
        parents: [userFolderId],
      },
      media: {
        mimeType: 'text/plain',
        body: Readable.from(details),
      },
    });

    // 3. Upload images if they exist
    const uploadImageFromUrl = async (url: string, name: string) => {
      try {
        let buffer: Buffer;
        let contentType: string;

        if (url.startsWith('http')) {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
          contentType = response.headers.get('content-type') || 'image/jpeg';
        } else if (url.startsWith('/uploads/')) {
          const filePath = path.join(process.cwd(), url);
          if (fs.existsSync(filePath)) {
            buffer = await fs.promises.readFile(filePath);
            const ext = path.extname(url).toLowerCase();
            contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
          } else {
            return;
          }
        } else {
          return;
        }

        await drive.files.create({
          requestBody: {
            name: name,
            parents: [userFolderId],
          },
          media: {
            mimeType: contentType,
            body: Readable.from(buffer),
          },
        });
      } catch (err) {
        console.error(`Failed to upload image ${name} for user ${user.id}:`, err);
      }
    };

    if (user.buyerIdScanUrl) await uploadImageFromUrl(user.buyerIdScanUrl, 'buyer_id_scan');
    if (user.buyerFaceScanUrl) await uploadImageFromUrl(user.buyerFaceScanUrl, 'buyer_face_scan');

    console.log(`Successfully backed up buyer ${user.id} installment verification to Google Drive`);
    return true;
  } catch (error) {
    console.error('Error backing up buyer to Google Drive:', error);
    return false;
  }
}
