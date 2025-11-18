// utils/driveService.js
const { google } = require('googleapis');
const stream = require('stream');

/**
 * Initialize Google Drive API
 */
const getDriveClient = () => {
  try {
    if (!JSON.parse(process.env.GOOGLE_DRIVE_JSON)) {
      throw new Error("GOOGLE_DRIVE_KEY_FILE not configured in .env");
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: JSON.parse(process.env.GOOGLE_DRIVE_JSON),
      scopes: ["https://www.googleapis.com/auth/drive"],

    });

    return google.drive({ version: "v3", auth });

  } catch (error) {
    console.error("Error initializing Google Drive client:", error);
    throw error;
  }
};


/**
 * Upload file to Google Drive
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type
 * @returns {Promise<Object>} - Drive file metadata with links
 */
const uploadToDrive = async (fileBuffer, fileName, mimeType) => {
  console.log('=== UPLOAD TO DRIVE START ===');
  console.log('File name:', fileName);
  console.log('MIME type:', mimeType);
  console.log('Buffer size:', fileBuffer ? fileBuffer.length : 'null');

  try {
    if (!fileBuffer) {
      throw new Error('File buffer is empty or null');
    }

    if (!fileName) {
      throw new Error('File name is required');
    }

    const drive = getDriveClient();

    // Convert buffer to readable stream
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    console.log('Uploading file to Google Drive...');

    // Upload file
    const fileMetadata = {
      name: fileName,
      parents: process.env.GOOGLE_DRIVE_FOLDER_ID 
        ? [process.env.GOOGLE_DRIVE_FOLDER_ID] 
        : undefined, // Optional: specify folder
    };

    const media = {
      mimeType: mimeType,
      body: bufferStream,
    };

    const response = await drive.files.create({
  requestBody: fileMetadata,
  media: media,
  fields: 'id, name, webViewLink, webContentLink',
  supportsAllDrives: true,  // ← WAJIB untuk Shared Drive
});

    console.log('Upload successful! File ID:', response.data.id);

    // Set file permissions to be viewable by anyone with link
    


    console.log('Permissions set successfully');

    const fileData = {
      id: response.data.id,
      fileName: response.data.name,
      viewLink: response.data.webViewLink,
      downloadLink: response.data.webContentLink || 
        `https://drive.google.com/uc?export=download&id=${response.data.id}`,
    };

    console.log('=== UPLOAD TO DRIVE SUCCESS ===');
    console.log('File data:', fileData);

    return fileData;

  } catch (error) {
    console.error('=== UPLOAD TO DRIVE ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Handle specific Google API errors
    if (error.response) {
      console.error('Google API Response Error:');
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      throw new Error(`Google Drive API error: ${error.response.data.error.message}`);
    }

    // Re-throw with more context
    throw new Error(`Failed to upload to Google Drive: ${error.message}`);
  }
};

/**
 * Delete file from Google Drive
 * @param {string} fileId - Drive file ID
 * @returns {Promise<void>}
 */
const deleteFromDrive = async (fileId) => {
  console.log('=== DELETE FROM DRIVE START ===');
  console.log('File ID:', fileId);

  try {
    if (!fileId) {
      console.warn('No file ID provided, skipping delete');
      return;
    }

    const drive = getDriveClient();

    await drive.files.delete({
      fileId: fileId,
    });

    console.log('=== DELETE FROM DRIVE SUCCESS ===');

  } catch (error) {
    console.error('=== DELETE FROM DRIVE ERROR ===');
    console.error('Error:', error.message);
    
    // Don't throw error on delete failure, just log it
    console.warn('Failed to delete file from Drive, continuing...');
  }
};

module.exports = {
  uploadToDrive,
  deleteFromDrive,
};