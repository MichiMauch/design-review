#!/usr/bin/env node

// Migration script to upload Data URLs to R2 and update database
import { createClient } from '@libsql/client';

// Load environment variables
process.env.CLOUDFLARE_ACCOUNT_ID = '6a52908bab2567e2a24d0dec042053d5';
process.env.CLOUDFLARE_ACCESS_KEY_ID = '9c5b2fcb25254bb1d795dc691e64129c';
process.env.CLOUDFLARE_SECRET_ACCESS_KEY = '5ec874aea0e34fa8a17853962eeb1eca1fc08a8ed2cd99ee80d1ae34930ae050';
process.env.CLOUDFLARE_R2_BUCKET = 'kokomo';

async function migrateDataUrlsToR2() {
  console.log('🚀 Starting Data URL to R2 migration...');
  
  const url = 'libsql://design-review-feedback-netnode-ag.turso.io';
  const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTI0MDQ4ODAsImlkIjoiNzk0YzcwMTItMWNmYy00YTZkLWE3MmUtNzNjYjE0ZWMxZDI3In0.gA9WwOeoTWPqltj5bo0kbCOIYr27GSfVbt_-N79IrSA4zGpZOXTOHXVDuaIHF6qXiCbfki2OYjaCJfwqnhKADg';

  const db = createClient({
    url,
    authToken,
  });
  
  try {
    // Process tasks in batches to avoid response size limits
    let offset = 0;
    const batchSize = 1; // Start with 1 task for testing
    let totalMigrated = 0;
    
    while (true) {
      // Get a batch of tasks with Data URLs (only ID and first few chars to check) 
      // Test with specific task first
      const batchResult = await db.execute({
        sql: 'SELECT id, title FROM tasks WHERE id = 155 AND screenshot IS NOT NULL AND screenshot LIKE "data:%" LIMIT ? OFFSET ?',
        args: [batchSize, offset]
      });
      
      if (batchResult.rows.length === 0) {
        break; // No more tasks to process
      }
      
      console.log(`📦 Processing batch ${Math.floor(offset/batchSize) + 1} (${batchResult.rows.length} tasks)...`);
      
      for (const task of batchResult.rows) {
        try {
          // Get the full screenshot data for this specific task
          const fullTaskResult = await db.execute({
            sql: 'SELECT id, title, screenshot FROM tasks WHERE id = ?',
            args: [task.id]
          });
          
          if (fullTaskResult.rows.length === 0) continue;
          
          const fullTask = fullTaskResult.rows[0];
          const dataUrl = fullTask.screenshot;
          
          console.log(`🔄 Migrating task ${task.id}: "${task.title}" (${Math.round(dataUrl.length/1024)}KB)`);
          
          // Import and use the R2 upload function
          const { uploadDataUrlToR2 } = await import('./.next/server/_rsc_src_lib_cloudflare-r2-v2_ts.js');
          const uploadResult = await uploadDataUrlToR2(dataUrl);
          
          if (uploadResult.success) {
            // Update database with filename and R2 URL, remove Data URL
            await db.execute({
              sql: 'UPDATE tasks SET screenshot = ?, screenshot_url = ? WHERE id = ?',
              args: [uploadResult.filename, uploadResult.url, task.id]
            });
            
            console.log(`  ✅ Success: ${uploadResult.filename} -> ${uploadResult.url}`);
            totalMigrated++;
          } else {
            console.log(`  ❌ Failed: ${uploadResult.error}`);
          }
          
        } catch (taskError) {
          console.error(`  💥 Error processing task ${task.id}:`, taskError.message);
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      offset += batchSize;
    }
    
    console.log(`🎉 Migration completed! ${totalMigrated} tasks migrated to R2.`);
    
    // Show final summary
    const finalStats = await db.execute({
      sql: 'SELECT COUNT(*) as total, COUNT(screenshot_url) as with_r2_url, COUNT(CASE WHEN screenshot LIKE "data:%" THEN 1 END) as with_data_url FROM tasks'
    });
    
    const stats = finalStats.rows[0];
    console.log('📊 Final database stats:');
    console.log(`  Total tasks: ${stats.total}`);
    console.log(`  With R2 URLs: ${stats.with_r2_url}`);
    console.log(`  Still with Data URLs: ${stats.with_data_url}`);
    
  } catch (error) {
    console.error('💥 Migration error:', error);
    process.exit(1);
  }
}

migrateDataUrlsToR2();