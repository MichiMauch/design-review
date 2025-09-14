import { getDb, initDatabase } from '../../../../../lib/db.js';

export async function GET() {
  try {
    // Add timeout for database initialization
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database initialization timeout')), 5000)
    );

    await Promise.race([initDatabase(), timeoutPromise]);
    const db = getDb();

    // Get projects count
    const projectsResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM projects'
    });
    const projectsCount = projectsResult.rows[0].count;

    // Get total tasks count
    const tasksResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM tasks'
    });
    const totalTasks = tasksResult.rows[0].count;

    // Get tasks created today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const tasksToday = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM tasks WHERE created_at >= ? AND created_at <= ?',
      args: [todayStart.toISOString(), todayEnd.toISOString()]
    });
    const tasksTodayCount = tasksToday.rows[0].count;

    // Get user counts by role
    const usersResult = await db.execute({
      sql: 'SELECT role, COUNT(*) as count FROM authorized_users GROUP BY role'
    });
    
    const userCounts = { admin: 0, user: 0 };
    usersResult.rows.forEach(row => {
      userCounts[row.role] = row.count;
    });
    const totalUsers = userCounts.admin + userCounts.user;

    return Response.json({
      success: true,
      stats: {
        projects: projectsCount,
        totalTasks: totalTasks,
        tasksToday: tasksTodayCount,
        users: {
          total: totalUsers,
          admin: userCounts.admin,
          user: userCounts.user
        }
      }
    });

  } catch (error) {
    console.error('Error in admin stats:', error);
    return Response.json(
      { success: false, error: error.message || 'Fehler beim Laden der Statistiken' },
      { status: 500 }
    );
  }
}