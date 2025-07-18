import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'cac1d67ee1dc4cb6814dff593983d703';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET!;

export async function uploadScreenshotToR2(
  file: Buffer,
  fileName: string,
  contentType: string = 'image/png'
): Promise<{ filename: string; url: string }> {
  const timestamp = Date.now();
  const cleanFileName = `${timestamp}-${fileName}`;
  const key = `screenshots/${cleanFileName}`;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await r2Client.send(command);
  
  return {
    filename: cleanFileName,
    url: `https://pub-${accountId}.r2.dev/${key}`
  };
}

export function getScreenshotUrl(filename: string): string {
  return `https://pub-${accountId}.r2.dev/screenshots/${filename}`;
}

export async function getScreenshotFromR2(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);
  
  if (!response.Body) {
    throw new Error('Screenshot not found');
  }

  const chunks: Uint8Array[] = [];
  const reader = response.Body as ReadableStream;
  const readableStreamReader = reader.getReader();

  try {
    while (true) {
      const { done, value } = await readableStreamReader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    readableStreamReader.releaseLock();
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return Buffer.from(result);
}