import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Categories for feedback classification
const FEEDBACK_CATEGORIES = {
  'ui-ux': 'UI/UX Design',
  'bug': 'Bug Report',
  'feature': 'Feature Request',
  'performance': 'Performance Issue',
  'content': 'Content Issue',
  'accessibility': 'Accessibility',
  'other': 'Other'
};

// Priority levels based on sentiment and category
const PRIORITY_MAPPING = {
  'bug': { negative: 'high', neutral: 'medium', positive: 'low' },
  'performance': { negative: 'high', neutral: 'high', positive: 'medium' },
  'accessibility': { negative: 'high', neutral: 'medium', positive: 'medium' },
  'ui-ux': { negative: 'medium', neutral: 'low', positive: 'low' },
  'feature': { negative: 'medium', neutral: 'low', positive: 'low' },
  'content': { negative: 'low', neutral: 'low', positive: 'low' },
  'other': { negative: 'medium', neutral: 'low', positive: 'low' }
};

/**
 * Analyze feedback text using OpenAI
 * @param {string} feedbackText - The feedback text to analyze
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeFeedback(feedbackText) {
  try {
    if (!feedbackText || feedbackText.trim().length === 0) {
      throw new Error('Feedback text is required');
    }

    const prompt = `
Analyze the following user feedback and provide:
1. Sentiment (positive, negative, neutral)
2. Confidence score (0-100)
3. Category from: ui-ux, bug, feature, performance, content, accessibility, other
4. Priority level (low, medium, high)
5. A brief summary (max 50 words)

Feedback: "${feedbackText}"

Respond in JSON format:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 85,
  "category": "category-key",
  "priority": "low|medium|high",
  "summary": "Brief summary of the feedback",
  "keywords": ["keyword1", "keyword2"]
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert UX researcher and product manager analyzing user feedback. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (error) {
      // Fallback if JSON parsing fails
      console.error('Failed to parse OpenAI response:', content, error);
      analysis = createFallbackAnalysis(feedbackText);
    }

    // Validate and normalize the response
    analysis = validateAndNormalizeAnalysis(analysis, feedbackText);

    return {
      success: true,
      analysis: {
        sentiment: analysis.sentiment,
        confidence: Math.max(0, Math.min(100, analysis.confidence || 70)),
        category: analysis.category,
        categoryLabel: FEEDBACK_CATEGORIES[analysis.category] || 'Other',
        priority: analysis.priority,
        summary: analysis.summary || feedbackText.substring(0, 50) + '...',
        keywords: Array.isArray(analysis.keywords) ? analysis.keywords.slice(0, 5) : [],
        analyzedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('AI Analysis Error:', error);

    // Return fallback analysis if OpenAI fails
    return {
      success: false,
      error: error.message,
      analysis: createFallbackAnalysis(feedbackText)
    };
  }
}

/**
 * Create a fallback analysis when AI fails
 * @param {string} feedbackText
 * @returns {Object} Fallback analysis
 */
function createFallbackAnalysis(feedbackText) {
  const text = feedbackText.toLowerCase();

  // Simple keyword-based category detection
  let category = 'other';
  if (text.includes('bug') || text.includes('error') || text.includes('broken')) {
    category = 'bug';
  } else if (text.includes('slow') || text.includes('loading') || text.includes('performance')) {
    category = 'performance';
  } else if (text.includes('design') || text.includes('layout') || text.includes('ui')) {
    category = 'ui-ux';
  } else if (text.includes('feature') || text.includes('add') || text.includes('would like')) {
    category = 'feature';
  } else if (text.includes('content') || text.includes('text') || text.includes('copy')) {
    category = 'content';
  }

  // Simple sentiment detection
  let sentiment = 'neutral';
  const positiveWords = ['good', 'great', 'awesome', 'love', 'like', 'excellent'];
  const negativeWords = ['bad', 'terrible', 'hate', 'broken', 'awful', 'useless'];

  const hasPositive = positiveWords.some(word => text.includes(word));
  const hasNegative = negativeWords.some(word => text.includes(word));

  if (hasPositive && !hasNegative) sentiment = 'positive';
  else if (hasNegative && !hasPositive) sentiment = 'negative';

  return {
    sentiment,
    confidence: 60,
    category,
    categoryLabel: FEEDBACK_CATEGORIES[category],
    priority: determinePriority(category, sentiment),
    summary: feedbackText.substring(0, 50) + (feedbackText.length > 50 ? '...' : ''),
    keywords: extractSimpleKeywords(feedbackText),
    analyzedAt: new Date().toISOString(),
    fallback: true
  };
}

/**
 * Validate and normalize AI analysis response
 * @param {Object} analysis
 * @param {string} originalText
 * @returns {Object} Normalized analysis
 */
function validateAndNormalizeAnalysis(analysis, originalText) {
  // Validate sentiment
  if (!['positive', 'negative', 'neutral'].includes(analysis.sentiment)) {
    analysis.sentiment = 'neutral';
  }

  // Validate category
  if (!Object.keys(FEEDBACK_CATEGORIES).includes(analysis.category)) {
    analysis.category = 'other';
  }

  // Validate priority
  if (!['low', 'medium', 'high'].includes(analysis.priority)) {
    analysis.priority = determinePriority(analysis.category, analysis.sentiment);
  }

  // Ensure summary exists
  if (!analysis.summary || analysis.summary.length === 0) {
    analysis.summary = originalText.substring(0, 50) + (originalText.length > 50 ? '...' : '');
  }

  // Ensure keywords is an array
  if (!Array.isArray(analysis.keywords)) {
    analysis.keywords = extractSimpleKeywords(originalText);
  }

  return analysis;
}

/**
 * Determine priority based on category and sentiment
 * @param {string} category
 * @param {string} sentiment
 * @returns {string} Priority level
 */
function determinePriority(category, sentiment) {
  const mapping = PRIORITY_MAPPING[category];
  if (mapping && mapping[sentiment]) {
    return mapping[sentiment];
  }
  return 'medium';
}

/**
 * Extract simple keywords from text
 * @param {string} text
 * @returns {Array} Keywords
 */
function extractSimpleKeywords(text) {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'said', 'each', 'which', 'their', 'time', 'would', 'about', 'there', 'could', 'other', 'after', 'first', 'well', 'many'].includes(word));

  return [...new Set(words)].slice(0, 5);
}

/**
 * Analyze multiple feedback items in batch
 * @param {Array} feedbackItems - Array of feedback objects with text
 * @returns {Promise<Array>} Array of analysis results
 */
export async function batchAnalyzeFeedback(feedbackItems) {
  const results = [];

  // Process in small batches to avoid rate limits
  const batchSize = 3;
  for (let i = 0; i < feedbackItems.length; i += batchSize) {
    const batch = feedbackItems.slice(i, i + batchSize);

    const batchPromises = batch.map(async (item) => {
      try {
        const analysis = await analyzeFeedback(item.text || item.description || '');
        return {
          id: item.id,
          ...analysis
        };
      } catch (error) {
        return {
          id: item.id,
          success: false,
          error: error.message,
          analysis: createFallbackAnalysis(item.text || item.description || '')
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Small delay between batches to respect rate limits
    if (i + batchSize < feedbackItems.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Get statistics from analyzed feedback
 * @param {Array} analyzedFeedback - Array of feedback with AI analysis
 * @returns {Object} Statistics
 */
export function getAnalysisStatistics(analyzedFeedback) {
  if (!analyzedFeedback || analyzedFeedback.length === 0) {
    return {
      total: 0,
      sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
      categoryBreakdown: {},
      priorityBreakdown: { high: 0, medium: 0, low: 0 },
      averageConfidence: 0
    };
  }

  const stats = {
    total: analyzedFeedback.length,
    sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
    categoryBreakdown: {},
    priorityBreakdown: { high: 0, medium: 0, low: 0 },
    averageConfidence: 0
  };

  let totalConfidence = 0;

  analyzedFeedback.forEach(item => {
    const analysis = item.ai_analysis || item.analysis;
    if (analysis) {
      // Sentiment
      stats.sentimentBreakdown[analysis.sentiment] = (stats.sentimentBreakdown[analysis.sentiment] || 0) + 1;

      // Category
      stats.categoryBreakdown[analysis.category] = (stats.categoryBreakdown[analysis.category] || 0) + 1;

      // Priority
      stats.priorityBreakdown[analysis.priority] = (stats.priorityBreakdown[analysis.priority] || 0) + 1;

      // Confidence
      totalConfidence += analysis.confidence || 70;
    }
  });

  stats.averageConfidence = Math.round(totalConfidence / analyzedFeedback.length);

  return stats;
}