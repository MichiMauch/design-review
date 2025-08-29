import { S3 } from 'aws-sdk';
import https from 'https';

// Use the same configuration as kokomo2
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'cac1d67ee1dc4cb6814dff593983d703';

// Important: Remove ACL from putObject as R2 doesn't support it
// R2 requires specific configuration
const s3 = new S3({
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  signatureVersion: 'v4',
  s3ForcePathStyle: true,
  region: 'auto',
  sslEnabled: true,
  httpOptions: {
    agent: https.globalAgent,
    timeout: 120000,
  }
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET!;

export async function uploadScreenshotToR2(
  file: Buffer,
  fileName: string,
  contentType: string = 'image/png'
): Promise<{ filename: string; url: string }> {
  try {
    const timestamp = Date.now();
    const cleanFileName = `${timestamp}-${fileName}`;
    // Store directly in screenshots folder within review bucket
    const key = `screenshots/${cleanFileName}`;
    
    console.log('R2 Upload v2: Preparing upload...', {
      cleanFileName,
      key,
      contentType,
      fileSize: file.length,
      bucketName: BUCKET_NAME,
      targetPath: 'review bucket -> screenshots folder'
    });
    
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      // R2 doesn't support ACL - bucket is already configured for public read
    }).promise();
    
    console.log('R2 Upload v2: Upload successful');
    
    const result = {
      filename: cleanFileName,
      url: `https://pub-${accountId}.r2.dev/${key}` // This will be https://pub-6a52908bab2567e2a24d0dec042053d5.r2.dev/screenshots/filename
    };
    
    console.log('R2 Upload v2: Generated result:', result);
    return result;
    
  } catch (error: unknown) {
    const err = error as Error & { code?: string };
    console.error('R2 Upload v2: FAILED', {
      error: err.message,
      errorType: err.constructor.name,
      errorCode: err.code,
      errorStack: err.stack
    });
    throw error;
  }
}

export async function uploadDataUrlToR2(dataUrl: string): Promise<{ success: boolean; filename?: string; url?: string; error?: string }> {
  try {
    console.log('R2 Upload v2: Starting upload process...');
    console.log('R2 Upload v2: Environment check:', {
      hasAccountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
      hasAccessKey: !!process.env.CLOUDFLARE_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
      hasBucket: !!process.env.CLOUDFLARE_R2_BUCKET,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID?.substring(0, 10) + '...',
      bucket: process.env.CLOUDFLARE_R2_BUCKET
    });
    
    // Extract content type and base64 data
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      console.error('R2 Upload v2: Invalid data URL format');
      return { success: false, error: 'Invalid data URL format' };
    }
    
    const contentType = matches[1];
    const base64Data = matches[2];
    console.log('R2 Upload v2: Data URL parsed:', {
      contentType,
      base64Length: base64Data.length
    });
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    console.log('R2 Upload v2: Buffer created:', {
      bufferSize: buffer.length,
      bufferSizeMB: (buffer.length / 1024 / 1024).toFixed(2)
    });
    
    // Generate filename with proper extension
    const ext = contentType.split('/')[1] || 'png';
    const timestamp = Date.now();
    const filename = `task-${timestamp}.${ext}`;
    console.log('R2 Upload v2: Generated filename:', filename);
    
    // Upload to R2
    console.log('R2 Upload v2: Calling uploadScreenshotToR2...');
    const result = await uploadScreenshotToR2(buffer, filename, contentType);
    console.log('R2 Upload v2: Upload successful!', result);
    
    return {
      success: true,
      filename: result.filename,
      url: result.url
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('R2 Upload v2: FAILED with error:', error);
    console.error('R2 Upload v2: Error type:', err.constructor.name);
    console.error('R2 Upload v2: Error message:', err.message);
    console.error('R2 Upload v2: Error stack:', err.stack);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function getScreenshotUrl(filename: string): string {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'cac1d67ee1dc4cb6814dff593983d703';
  return `https://pub-${accountId}.r2.dev/screenshots/${filename}`;
}