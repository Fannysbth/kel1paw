// utils/driveService.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Initialize Google Drive API
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_DRIVE_KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

// Upload file to Google Drive
const uploadToDrive = async (filePath, fileName, mimeType) => {
  try {
    const fileMetadata = {
      name: fileName,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
    };

    const media = {
      mimeType,
      body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    // Make the file publicly viewable
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Get the public URL
    const result = await drive.files.get({
      fileId: response.data.id,
      fields: 'webViewLink, webContentLink',
    });

    // Delete the local file after upload
    fs.unlinkSync(filePath);

    return {
      id: response.data.id,
      viewLink: result.data.webViewLink,
      downloadLink: result.data.webContentLink,
    };
  } catch (error) {
    console.error('Google Drive upload error:', error);
    throw new Error('Failed to upload file to Google Drive');
  }
};

// Delete file from Google Drive
const deleteFromDrive = async (fileId) => {
  try {
    await drive.files.delete({
      fileId: fileId,
    });
  } catch (error) {
    console.error('Google Drive delete error:', error);
    throw new Error('Failed to delete file from Google Drive');
  }
};

module.exports = {
  uploadToDrive,
  deleteFromDrive
};