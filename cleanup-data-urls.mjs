#!/usr/bin/env node

// Simple cleanup script to remove Data URLs from screenshot field
import { createClient } from '@libsql/client';

async function cleanupDataUrls() {
  console.log('🧹 Starting Data URL cleanup...');
  
  const url = 'libsql://design-review-feedback-netnode-ag.turso.io';
  const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTI0MDQ4ODAsImlkIjoiNzk0YzcwMTItMWNmYy00YTZkLWE3MmUtNzNjYjE0ZWMxZDI3In0.gA9WwOeoTWPqltj5bo0kbCOIYr27GSfVbt_-N79IrSA4zGpZOXTOHXVDuaIHF6qXiCbfki2OYjaCJfwqnhKADg';

  const db = createClient({
    url,
    authToken,
  });
  
  try {
    // Find all tasks with Data URLs in screenshot field
    const result = await db.execute({
      sql: 'SELECT id, title, screenshot FROM tasks WHERE screenshot IS NOT NULL AND screenshot LIKE "data:%"'
    });
    
    console.log(`📊 Found ${result.rows.length} tasks with Data URLs to clean up.`);
    
    for (const row of result.rows) {
      console.log(`🔧 Cleaning up task ${row.id}: "${row.title}"`);
      
      // Set screenshot to NULL for Data URLs since we don't need them anymore
      await db.execute({
        sql: 'UPDATE tasks SET screenshot = NULL WHERE id = ?',
        args: [row.id]
      });
    }
    
    console.log('✅ Cleanup completed successfully!');
    
    // Show summary
    const finalResult = await db.execute({
      sql: 'SELECT COUNT(*) as total, COUNT(screenshot_url) as with_url, COUNT(screenshot) as with_filename FROM tasks'
    });
    
    const stats = finalResult.rows[0];
    console.log('📊 Final stats:');
    console.log(`  Total tasks: ${stats.total}`);
    console.log(`  With R2 URLs: ${stats.with_url}`);
    console.log(`  With filenames: ${stats.with_filename}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupDataUrls();