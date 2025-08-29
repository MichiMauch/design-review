import AWS from 'aws-sdk';
import https from 'https';

// Use the same configuration as the original
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'cac1d67ee1dc4cb6814dff593983d703';

// R2 configuration using AWS SDK v2
const s3 = new AWS.S3({
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
  s3ForcePathStyle: true,
  region: 'auto',
  sslEnabled: true,
  httpOptions: {
    agent: https.globalAgent,
    timeout: 120000,
  }
});

const BUCKET_NAME = 'review';

export async function uploadScreenshotToR2(
  file,
  fileName,
  contentType = 'image/png'
) {
  try {
    const timestamp = Date.now();
    const cleanFileName = `${timestamp}-${fileName}`;
    const key = `screenshots/${cleanFileName}`;
    
    console.log('R2 Upload v2: Preparing upload...', {
      cleanFileName,
      key,
      contentType,
      fileSize: file.length,
      bucketName: BUCKET_NAME
    });
    
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    }).promise();
    
    console.log('R2 Upload v2: Upload successful');
    
    const result = {
      filename: cleanFileName,
      url: `https://pub-${accountId}.r2.dev/${key}`
    };
    
    console.log('R2 Upload v2: Generated result:', result);
    return result;
    
  } catch (error) {
    console.error('R2 Upload v2: FAILED', {
      error: error.message,
      errorType: error.constructor.name,
      errorCode: error.code,
      errorStack: error.stack
    });
    throw error;
  }
}

export async function uploadDataUrlToR2(dataUrl) {
  try {
    console.log('R2 Upload v2: Starting upload process...');
    
    // Extract content type and base64 data
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      console.error('R2 Upload v2: Invalid data URL format');
      return { success: false, error: 'Invalid data URL format' };
    }
    
    const contentType = matches[1];
    const base64Data = matches[2];
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generate filename with proper extension
    const ext = contentType.split('/')[1] || 'png';
    const timestamp = Date.now();
    const filename = `task-${timestamp}.${ext}`;
    
    // Upload to R2
    const result = await uploadScreenshotToR2(buffer, filename, contentType);
    
    return {
      success: true,
      filename: result.filename,
      url: result.url
    };
  } catch (error) {
    console.error('R2 Upload v2: FAILED with error:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}