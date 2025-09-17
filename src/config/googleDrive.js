const { google } = require('googleapis');
const stream = require('stream');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI // usually not needed for service account, but we might use OAuth2 for drive
);

// Note: This example assumes you are using OAuth2 for Drive as well. 
// Alternatively, you can use a service account. Adjust accordingly.

// Set up the Google Drive API client
const drive = google.drive({ version: 'v3', auth: oauth2Client });

const uploadFile = async (fileObject) => {
  const { originalname, buffer } = fileObject;

  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);

  const { data } = await drive.files.create({
    media: {
      mimeType: fileObject.mimetype,
      body: bufferStream,
    },
    requestBody: {
      name: originalname,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
    },
    fields: 'id, webViewLink, webContentLink',
  });

  return data;
};

module.exports = { drive, uploadFile };