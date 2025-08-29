#!/usr/bin/env node

// Simple migration script with inline R2 upload
import { createClient } from '@libsql/client';
import AWS from 'aws-sdk';
import https from 'https';

// Environment configuration
const CLOUDFLARE_ACCOUNT_ID = '6a52908bab2567e2a24d0dec042053d5';
const CLOUDFLARE_ACCESS_KEY_ID = '9c5b2fcb25254bb1d795dc691e64129c';
const CLOUDFLARE_SECRET_ACCESS_KEY = '5ec874aea0e34fa8a17853962eeb1eca1fc08a8ed2cd99ee80d1ae34930ae050';
const CLOUDFLARE_R2_BUCKET = 'kokomo';

// R2 configuration
const s3 = new AWS.S3({
  endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: CLOUDFLARE_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
  s3ForcePathStyle: true,
  region: 'auto',
  sslEnabled: true,
  httpOptions: {
    agent: https.globalAgent,
    timeout: 120000,
  }
});

async function uploadDataUrlToR2(dataUrl) {
  try {
    // Extract content type and base64 data
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return { success: false, error: 'Invalid data URL format' };
    }
    
    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generate filename
    const ext = contentType.split('/')[1] || 'png';
    const timestamp = Date.now();
    const filename = `${timestamp}-task-${timestamp}.${ext}`;
    const key = `screenshots/${filename}`;
    
    console.log(`  📤 Uploading ${Math.round(buffer.length/1024)}KB to R2...`);
    
    // Upload to R2
    await s3.putObject({
      Bucket: CLOUDFLARE_R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }).promise();
    
    const url = `https://pub-${CLOUDFLARE_ACCOUNT_ID}.r2.dev/${key}`;
    
    return {
      success: true,
      filename: filename,
      url: url
    };
  } catch (error) {
    console.error(`  💥 Upload error:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function migrateDataUrls() {
  console.log('🚀 Starting Data URL to R2 migration...');
  
  const db = createClient({
    url: 'libsql://design-review-feedback-netnode-ag.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTI0MDQ4ODAsImlkIjoiNzk0YzcwMTItMWNmYy00YTZkLWE3MmUtNzNjYjE0ZWMxZDI3In0.gA9WwOeoTWPqltj5bo0kbCOIYr27GSfVbt_-N79IrSA4zGpZOXTOHXVDuaIHF6qXiCbfki2OYjaCJfwqnhKADg',
  });
  
  try {
    // Get all tasks with Data URLs
    console.log('🔍 Finding all tasks with Data URLs...');
    
    const dataUrlTasksResult = await db.execute({
      sql: 'SELECT id, title FROM tasks WHERE screenshot IS NOT NULL AND screenshot LIKE "data:%" ORDER BY id',
      args: []
    });
    
    const totalTasks = dataUrlTasksResult.rows.length;
    console.log(`📊 Found ${totalTasks} tasks with Data URLs to migrate`);
    
    if (totalTasks === 0) {
      console.log('✅ No Data URLs to migrate!');
      return;
    }
    
    let migratedCount = 0;
    let failedCount = 0;
    const batchSize = 5;
    
    // Process in batches
    for (let i = 0; i < totalTasks; i += batchSize) {
      const batch = dataUrlTasksResult.rows.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(totalTasks/batchSize)} (${batch.length} tasks)...`);
      
      for (const taskInfo of batch) {
        try {
          // Get full task data (we need the screenshot data)
          const fullTaskResult = await db.execute({
            sql: 'SELECT id, title, screenshot FROM tasks WHERE id = ?',
            args: [taskInfo.id]
          });
          
          if (fullTaskResult.rows.length === 0) continue;
          
          const task = fullTaskResult.rows[0];
          const dataUrl = task.screenshot;
          
          if (!dataUrl || !dataUrl.startsWith('data:')) {
            console.log(`  ⏭️  Skipping task ${task.id}: No valid Data URL`);
            continue;
          }
          
          console.log(`  🔄 Migrating task ${task.id}: "${task.title}" (${Math.round(dataUrl.length/1024)}KB)`);
          
          // Upload to R2
          const uploadResult = await uploadDataUrlToR2(dataUrl);
          
          if (uploadResult.success) {
            // Update database
            await db.execute({
              sql: 'UPDATE tasks SET screenshot = ?, screenshot_url = ? WHERE id = ?',
              args: [uploadResult.filename, uploadResult.url, task.id]
            });
            
            console.log(`    ✅ Success: ${uploadResult.filename}`);
            migratedCount++;
          } else {
            console.log(`    ❌ Failed: ${uploadResult.error}`);
            failedCount++;
          }
          
          // Small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (taskError) {
          console.error(`  💥 Error processing task ${taskInfo.id}:`, taskError.message);
          failedCount++;
        }
      }
      
      console.log(`  📈 Batch progress: ${migratedCount} migrated, ${failedCount} failed`);
      
      // Longer delay between batches
      if (i + batchSize < totalTasks) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`  ✅ Successfully migrated: ${migratedCount} tasks`);
    console.log(`  ❌ Failed: ${failedCount} tasks`);
    
    // Final verification
    const finalStats = await db.execute({
      sql: 'SELECT COUNT(*) as total, COUNT(screenshot_url) as with_r2_url, COUNT(CASE WHEN screenshot LIKE "data:%" THEN 1 END) as still_data_url FROM tasks'
    });
    
    const stats = finalStats.rows[0];
    console.log(`\n📊 Final database stats:`);
    console.log(`  Total tasks: ${stats.total}`);
    console.log(`  With R2 URLs: ${stats.with_r2_url}`);
    console.log(`  Still with Data URLs: ${stats.still_data_url}`);
    
  } catch (error) {
    console.error('💥 Migration error:', error);
  }
}

migrateDataUrls();