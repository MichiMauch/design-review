#!/usr/bin/env node

// Screenshot Database Cleanup Script
// Removes Data URLs from screenshot field, keeping only filenames

import pkg from './lib/db.js';
const { getDb, initDatabase } = pkg;

async function cleanupScreenshots() {
  console.log('Starting screenshot database cleanup...');
  
  await initDatabase();
  const db = getDb();
  
  try {
    // Find all tasks with Data URLs in screenshot field
    const result = await db.execute({
      sql: 'SELECT id, title, screenshot FROM tasks WHERE screenshot IS NOT NULL AND screenshot LIKE "data:%"'
    });
    
    console.log(`Found ${result.rows.length} tasks with Data URLs to clean up.`);
    
    for (const row of result.rows) {
      console.log(`Cleaning up task ${row.id}: "${row.title}"`);
      
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

cleanupScreenshots();