#!/usr/bin/env node

// Script to move only the migrated screenshots from kokomo to review bucket
import { createClient } from '@libsql/client';
import AWS from 'aws-sdk';
import https from 'https';

// Environment configuration
const CLOUDFLARE_ACCOUNT_ID = '6a52908bab2567e2a24d0dec042053d5';
const CLOUDFLARE_ACCESS_KEY_ID = '9c5b2fcb25254bb1d795dc691e64129c';
const CLOUDFLARE_SECRET_ACCESS_KEY = '5ec874aea0e34fa8a17853962eeb1eca1fc08a8ed2cd99ee80d1ae34930ae050';

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

async function moveScreenshots() {
  console.log('🚀 Moving migrated screenshots from kokomo to review bucket...');
  
  const db = createClient({
    url: 'libsql://design-review-feedback-netnode-ag.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTI0MDQ4ODAsImlkIjoiNzk0YzcwMTItMWNmYy00YTZkLWE3MmUtNzNjYjE0ZWMxZDI3In0.gA9WwOeoTWPqltj5bo0kbCOIYr27GSfVbt_-N79IrSA4zGpZOXTOHXVDuaIHF6qXiCbfki2OYjaCJfwqnhKADg',
  });
  
  try {
    // Get only the migrated screenshots (those with timestamp pattern from today's migration)
    console.log('🔍 Finding migrated screenshots to move...');
    
    const migratedScreenshots = await db.execute({
      sql: 'SELECT id, title, screenshot FROM tasks WHERE screenshot LIKE "175646%task%" AND screenshot IS NOT NULL',
      args: []
    });
    
    console.log(`📊 Found ${migratedScreenshots.rows.length} migrated screenshots to move`);
    
    if (migratedScreenshots.rows.length === 0) {
      console.log('✅ No migrated screenshots to move!');
      return;
    }
    
    let movedCount = 0;
    let failedCount = 0;
    
    for (const task of migratedScreenshots.rows) {
      const filename = task.screenshot;
      const sourceKey = `screenshots/${filename}`;
      
      try {
        console.log(`📦 Moving ${filename}...`);
        
        // Copy from kokomo to review
        await s3.copyObject({
          Bucket: 'review',
          CopySource: `kokomo/${sourceKey}`,
          Key: sourceKey
        }).promise();
        
        console.log(`  ✅ Copied to review bucket`);
        
        // Delete from kokomo (only after successful copy)
        await s3.deleteObject({
          Bucket: 'kokomo',
          Key: sourceKey
        }).promise();
        
        console.log(`  🗑️  Deleted from kokomo bucket`);
        
        movedCount++;
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`  ❌ Failed to move ${filename}:`, error.message);
        failedCount++;
      }
    }
    
    console.log(`\n🎉 Move operation completed!`);
    console.log(`  ✅ Successfully moved: ${movedCount} screenshots`);
    console.log(`  ❌ Failed: ${failedCount} screenshots`);
    
    if (movedCount > 0) {
      console.log(`\n📍 Screenshots are now located in:`);
      console.log(`  Bucket: review`);
      console.log(`  Path: screenshots/`);
      console.log(`  Example: review/screenshots/1756465856053-task-1756465856053.jpeg`);
    }
    
  } catch (error) {
    console.error('💥 Move operation error:', error);
  }
}

moveScreenshots();