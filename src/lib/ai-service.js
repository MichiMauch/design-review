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
export async function analyzeFeedback(feedbackText, options = {}) {
  const startTime = Date.now();
  const { debug = false, retries = 2 } = options;

  try {
    if (!feedbackText || feedbackText.trim().length === 0) {
      throw new Error('Feedback text is required');
    }

    if (debug) {
      console.log('🤖 AI Analysis Starting:', {
        text: feedbackText.substring(0, 100) + (feedbackText.length > 100 ? '...' : ''),
        length: feedbackText.length,
        timestamp: new Date().toISOString()
      });
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

    let response;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        if (debug && attempt > 0) {
          console.log(`🔄 Retry attempt ${attempt}/${retries}`);
        }

        response = await openai.chat.completions.create({
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
          throw new Error('No response content from OpenAI');
        }

        if (debug) {
          console.log('✅ OpenAI Response:', {
            model: response.model,
            usage: response.usage,
            contentLength: content.length,
            duration: Date.now() - startTime + 'ms'
          });
        }

        break; // Success, exit retry loop
      } catch (apiError) {
        attempt++;

        if (debug) {
          console.error(`❌ OpenAI API Error (attempt ${attempt}):`, {
            error: apiError.message,
            code: apiError.code,
            type: apiError.type,
            status: apiError.status
          });
        }

        if (attempt > retries) {
          throw new Error(`OpenAI API failed after ${retries + 1} attempts: ${apiError.message}`);
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    const content = response.choices[0]?.message?.content;

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(content);

      if (debug) {
        console.log('📋 Parsed Analysis:', {
          sentiment: analysis.sentiment,
          confidence: analysis.confidence,
          category: analysis.category,
          priority: analysis.priority,
          hasKeywords: Array.isArray(analysis.keywords),
          keywordCount: Array.isArray(analysis.keywords) ? analysis.keywords.length : 0
        });
      }
    } catch (parseError) {
      if (debug) {
        console.error('❌ JSON Parse Error:', {
          error: parseError.message,
          rawContent: content,
          contentLength: content?.length
        });
      }

      // Try to extract data from malformed JSON
      const extractedData = tryExtractDataFromText(content);
      if (extractedData) {
        analysis = extractedData;
        console.warn('⚠️ Used extracted data from malformed JSON');
      } else {
        console.error('Failed to parse OpenAI response, using fallback analysis');
        analysis = createFallbackAnalysis(feedbackText);
      }
    }

    // Validate and normalize the response
    analysis = validateAndNormalizeAnalysis(analysis, feedbackText);

    const finalAnalysis = {
      sentiment: analysis.sentiment,
      confidence: Math.max(0, Math.min(100, analysis.confidence || 70)),
      category: analysis.category,
      categoryLabel: FEEDBACK_CATEGORIES[analysis.category] || 'Other',
      priority: analysis.priority,
      summary: analysis.summary || feedbackText.substring(0, 50) + '...',
      keywords: Array.isArray(analysis.keywords) ? analysis.keywords.slice(0, 5) : [],
      analyzedAt: new Date().toISOString(),
      processingTime: Date.now() - startTime
    };

    if (debug) {
      console.log('✅ AI Analysis Complete:', {
        ...finalAnalysis,
        inputLength: feedbackText.length,
        totalDuration: Date.now() - startTime + 'ms'
      });
    }

    return {
      success: true,
      analysis: finalAnalysis
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('AI Analysis Error:', {
      error: error.message,
      stack: error.stack,
      inputText: feedbackText.substring(0, 100) + '...',
      duration: duration + 'ms',
      timestamp: new Date().toISOString()
    });

    // Return fallback analysis if OpenAI fails
    const fallbackAnalysis = createFallbackAnalysis(feedbackText);
    return {
      success: false,
      error: error.message,
      analysis: {
        ...fallbackAnalysis,
        processingTime: duration,
        fallbackUsed: true
      }
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

/**
 * Try to extract analysis data from malformed text response
 * @param {string} text - The malformed response text
 * @returns {Object|null} Extracted data or null if extraction fails
 */
function tryExtractDataFromText(text) {
  try {
    // Common patterns to extract data
    const patterns = {
      sentiment: /sentiment[\"']?\s*:\s*[\"']?(positive|negative|neutral)[\"']?/i,
      confidence: /confidence[\"']?\s*:\s*[\"']?(\d+)[\"']?/i,
      category: /category[\"']?\s*:\s*[\"']?([\w-]+)[\"']?/i,
      priority: /priority[\"']?\s*:\s*[\"']?(low|medium|high)[\"']?/i,
      summary: /summary[\"']?\s*:\s*[\"']([^\"']+)[\"']?/i
    };

    const extracted = {};
    let hasData = false;

    // Extract each field using regex
    for (const [key, regex] of Object.entries(patterns)) {
      const match = text.match(regex);
      if (match && match[1]) {
        extracted[key] = key === 'confidence' ? parseInt(match[1]) : match[1].trim();
        hasData = true;
      }
    }

    // Try to extract keywords
    const keywordsMatch = text.match(/keywords[\"']?\s*:\s*\[([^\]]+)\]/i);
    if (keywordsMatch) {
      try {
        const keywordStr = keywordsMatch[1].replace(/[\"']/g, '');
        extracted.keywords = keywordStr.split(',').map(k => k.trim()).filter(k => k);
        hasData = true;
      } catch {
        // Ignore keyword extraction errors
      }
    }

    return hasData ? extracted : null;
  } catch (error) {
    console.error('Text extraction failed:', error);
    return null;
  }
}