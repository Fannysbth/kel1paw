const { google } = require('googleapis');
const streamifier = require('streamifier');

// Inisialisasi Google Drive API
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_DRIVE_KEY_FILE, // service account JSON
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

/**
 * Cek apakah folder parent memperbolehkan akses publik
 * @param {string} folderId
 * @returns {boolean}
 */
const checkParentPermissions = async (folderId) => {
  try {
    const res = await drive.permissions.list({
      fileId: folderId,
      supportsAllDrives: true,
    });

    return res.data.permissions.some(
      (perm) => perm.type === 'anyone' && perm.role === 'reader'
    );
  } catch (err) {
    console.error('Error checking parent folder permissions:', err);
    return false; // default aman: anggap tidak bisa public
  }
};

/**
 * Upload file buffer ke Google Drive
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 * @param {string} mimeType
 * @returns {object} {id, viewLink, downloadLink}
 */
const uploadToDrive = async (fileBuffer, fileName, mimeType) => {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType,
      body: streamifier.createReadStream(fileBuffer),
    };

    // Upload file
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
      supportsAllDrives: true,
    });

    const fileId = response.data.id;

    // Cek apakah parent folder memperbolehkan akses publik
    const canMakePublic = await checkParentPermissions(folderId);

    if (canMakePublic) {
      try {
        await drive.permissions.create({
          fileId,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true,
        });
      } catch (err) {
        if (err.code === 403) {
          console.warn('Tidak bisa membuat file public karena batasan folder parent.');
        } else {
          throw err;
        }
      }
    } else {
      console.warn('Folder parent terbatas. File akan tetap private.');
    }

    // Ambil link file
    const result = await drive.files.get({
      fileId,
      fields: 'webViewLink, webContentLink',
      supportsAllDrives: true,
    });

    return {
      id: fileId,
      viewLink: result.data.webViewLink,
      downloadLink: result.data.webContentLink,
    };
  } catch (error) {
    console.error('Google Drive upload error:', error);
    throw new Error('Gagal mengupload file ke Google Drive');
  }
};

module.exports = { uploadToDrive };
