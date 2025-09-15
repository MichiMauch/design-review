import { NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/db.js';
import { analyzeFeedback, batchAnalyzeFeedback } from '../../../../lib/ai-service.js';

/**
 * POST /api/ai/analyze-feedback
 * Analyze feedback text and update task with AI insights
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { taskId, text, batch = false, taskIds = [] } = body;

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'OpenAI API key nicht konfiguriert. Bitte OPENAI_API_KEY Environment Variable setzen.'
        },
        { status: 500 }
      );
    }

    const db = getDb();

    if (batch && taskIds.length > 0) {
      // Batch processing for multiple tasks
      return await processBatchAnalysis(db, taskIds);
    } else if (taskId && text) {
      // Single task analysis
      return await processSingleAnalysis(db, taskId, text);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Ungültige Parameter. taskId und text oder taskIds für Batch-Verarbeitung erforderlich.'
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unerwarteter Fehler bei der AI-Analyse: ' + error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Process single task analysis
 */
async function processSingleAnalysis(db, taskId, text) {
  try {
    // Get task details
    const taskResult = await db.execute({
      sql: 'SELECT * FROM tasks WHERE id = ?',
      args: [taskId]
    });

    if (taskResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task nicht gefunden' },
        { status: 404 }
      );
    }

    const task = taskResult.rows[0];

    // Check if already analyzed recently (within last hour)
    if (task.ai_analyzed_at) {
      const analyzedAt = new Date(task.ai_analyzed_at);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      if (analyzedAt > oneHourAgo) {
        return NextResponse.json({
          success: true,
          message: 'Task wurde bereits kürzlich analysiert',
          analysis: {
            sentiment: task.ai_sentiment,
            confidence: task.ai_confidence,
            category: task.ai_category,
            priority: task.ai_priority,
            summary: task.ai_summary,
            keywords: task.ai_keywords ? JSON.parse(task.ai_keywords) : [],
            analyzedAt: task.ai_analyzed_at
          }
        });
      }
    }

    // Perform AI analysis
    const result = await analyzeFeedback(text);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI-Analyse fehlgeschlagen: ' + result.error,
          fallback: result.analysis
        },
        { status: 500 }
      );
    }

    const analysis = result.analysis;

    // Update task with AI analysis
    await db.execute({
      sql: `
        UPDATE tasks
        SET
          ai_sentiment = ?,
          ai_confidence = ?,
          ai_category = ?,
          ai_priority = ?,
          ai_summary = ?,
          ai_keywords = ?,
          ai_analyzed_at = datetime('now', 'localtime')
        WHERE id = ?
      `,
      args: [
        analysis.sentiment,
        analysis.confidence,
        analysis.category,
        analysis.priority,
        analysis.summary,
        JSON.stringify(analysis.keywords),
        taskId
      ]
    });

    return NextResponse.json({
      success: true,
      message: 'Task erfolgreich analysiert',
      analysis: {
        ...analysis,
        taskId: parseInt(taskId)
      }
    });

  } catch (error) {
    console.error('Single Analysis Error:', error);
    throw error;
  }
}

/**
 * Process batch analysis for multiple tasks
 */
async function processBatchAnalysis(db, taskIds) {
  try {
    // Get all tasks that need analysis
    const placeholders = taskIds.map(() => '?').join(',');
    const tasksResult = await db.execute({
      sql: `SELECT * FROM tasks WHERE id IN (${placeholders}) AND (ai_analyzed_at IS NULL OR ai_analyzed_at < datetime('now', '-1 hour', 'localtime'))`,
      args: taskIds
    });

    if (tasksResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Alle Tasks wurden bereits analysiert',
        results: []
      });
    }

    // Prepare feedback items for batch analysis
    const feedbackItems = tasksResult.rows.map(task => ({
      id: task.id,
      text: task.description || task.title || ''
    }));

    // Perform batch AI analysis
    const analysisResults = await batchAnalyzeFeedback(feedbackItems);

    // Update all tasks with their analysis results
    const updatePromises = analysisResults.map(async (result) => {
      if (result.success && result.analysis) {
        const analysis = result.analysis;

        await db.execute({
          sql: `
            UPDATE tasks
            SET
              ai_sentiment = ?,
              ai_confidence = ?,
              ai_category = ?,
              ai_priority = ?,
              ai_summary = ?,
              ai_keywords = ?,
              ai_analyzed_at = datetime('now', 'localtime')
            WHERE id = ?
          `,
          args: [
            analysis.sentiment,
            analysis.confidence,
            analysis.category,
            analysis.priority,
            analysis.summary,
            JSON.stringify(analysis.keywords),
            result.id
          ]
        });
      }

      return result;
    });

    await Promise.all(updatePromises);

    const successCount = analysisResults.filter(r => r.success).length;
    const failureCount = analysisResults.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Batch-Analyse abgeschlossen: ${successCount} erfolgreich, ${failureCount} fehlgeschlagen`,
      results: analysisResults,
      summary: {
        total: analysisResults.length,
        successful: successCount,
        failed: failureCount
      }
    });

  } catch (error) {
    console.error('Batch Analysis Error:', error);
    throw error;
  }
}

/**
 * GET /api/ai/analyze-feedback
 * Get AI analysis statistics for a project
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId Parameter erforderlich' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get all analyzed tasks for the project
    const result = await db.execute({
      sql: `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN ai_analyzed_at IS NOT NULL THEN 1 END) as analyzed,
          COUNT(CASE WHEN ai_sentiment = 'positive' THEN 1 END) as positive,
          COUNT(CASE WHEN ai_sentiment = 'negative' THEN 1 END) as negative,
          COUNT(CASE WHEN ai_sentiment = 'neutral' THEN 1 END) as neutral,
          COUNT(CASE WHEN ai_category = 'bug' THEN 1 END) as bugs,
          COUNT(CASE WHEN ai_category = 'feature' THEN 1 END) as features,
          COUNT(CASE WHEN ai_category = 'ui-ux' THEN 1 END) as ui_ux,
          COUNT(CASE WHEN ai_priority = 'high' THEN 1 END) as high_priority,
          COUNT(CASE WHEN ai_priority = 'medium' THEN 1 END) as medium_priority,
          COUNT(CASE WHEN ai_priority = 'low' THEN 1 END) as low_priority,
          AVG(CASE WHEN ai_confidence IS NOT NULL THEN ai_confidence END) as avg_confidence
        FROM tasks
        WHERE project_id = ?
      `,
      args: [projectId]
    });

    const stats = result.rows[0];

    return NextResponse.json({
      success: true,
      statistics: {
        total: stats.total || 0,
        analyzed: stats.analyzed || 0,
        unanalyzed: (stats.total || 0) - (stats.analyzed || 0),
        sentiment: {
          positive: stats.positive || 0,
          negative: stats.negative || 0,
          neutral: stats.neutral || 0
        },
        categories: {
          bugs: stats.bugs || 0,
          features: stats.features || 0,
          ui_ux: stats.ui_ux || 0
        },
        priority: {
          high: stats.high_priority || 0,
          medium: stats.medium_priority || 0,
          low: stats.low_priority || 0
        },
        averageConfidence: Math.round(stats.avg_confidence || 0)
      }
    });

  } catch (error) {
    console.error('Statistics Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Laden der AI-Statistiken: ' + error.message
      },
      { status: 500 }
    );
  }
}