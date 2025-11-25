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
 * Generate SEO suggestions for title and meta description using AI
 * @param {Object} options - SEO analysis options
 * @returns {Promise<Object>} SEO suggestions
 */
export async function generateSeoSuggestions(options = {}) {
  const { url, currentTitle, currentDescription, pageContent } = options;

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Create AI prompt for SEO optimization
    const prompt = `Als SEO-Experte sollst du optimierte Vorschläge für Title und Meta Description erstellen.

Aktuelle Daten:
- URL: ${url}
- Aktueller Title: "${currentTitle}"
- Aktuelle Meta Description: "${currentDescription}"
- Seiteninhalt (Auszug): ${pageContent.substring(0, 1000)}

Erstelle optimierte Vorschläge unter Berücksichtigung folgender SEO Best Practices:

TITLE-TAG (30-60 Zeichen):
- Hauptkeyword am Anfang
- Einzigartig und aussagekräftig
- Call-to-Action wenn möglich
- Brand-Name am Ende (falls passend)

META DESCRIPTION (120-160 Zeichen):
- Überzeugende Beschreibung des Seiteninhalts
- Relevante Keywords natürlich eingebaut
- Call-to-Action oder Nutzenversprechen
- Keine Keyword-Stuffing

Antworte ausschließlich im folgenden JSON-Format:
{
  "title": {
    "suggestion": "Optimierter Title-Tag hier",
    "length": 45,
    "reasoning": "Kurze Erklärung der Optimierung"
  },
  "metaDescription": {
    "suggestion": "Optimierte Meta Description hier",
    "length": 145,
    "reasoning": "Kurze Erklärung der Optimierung"
  },
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein erfahrener SEO-Experte, der optimierte Title-Tags und Meta Descriptions erstellt. Antworte immer im geforderten JSON-Format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from AI service');
    }

    // Parse JSON response
    let suggestions;
    try {
      suggestions = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse AI response:', response);
      throw new Error('Invalid AI response format');
    }

    // Validate response structure
    if (!suggestions.title || !suggestions.metaDescription) {
      throw new Error('Incomplete AI response');
    }

    // Add timestamp and validation
    suggestions.generatedAt = new Date().toISOString();
    suggestions.url = url;

    return suggestions;

  } catch (error) {
    console.error('SEO suggestions generation error:', error);

    // Provide fallback suggestions
    return {
      title: {
        suggestion: currentTitle || 'Optimierter Title benötigt',
        length: currentTitle?.length || 0,
        reasoning: 'AI-Service nicht verfügbar. Bitte überprüfen Sie die OpenAI-Konfiguration.'
      },
      metaDescription: {
        suggestion: currentDescription || 'Optimierte Meta Description benötigt',
        length: currentDescription?.length || 0,
        reasoning: 'AI-Service nicht verfügbar. Bitte überprüfen Sie die OpenAI-Konfiguration.'
      },
      keywords: [],
      generatedAt: new Date().toISOString(),
      url,
      fallback: true,
      error: error.message
    };
  }
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
 * Analyze content quality using AI
 * @param {Object} options - Content analysis options
 * @returns {Promise<Object>} Content analysis results
 */
export async function analyzeContent(options = {}) {
  const { url, pageContent, headings = [], pageTitle = '' } = options;
  const startTime = Date.now();

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    if (!pageContent || pageContent.trim().length < 50) {
      throw new Error('Insufficient content for analysis');
    }

    const prompt = `Du bist ein erfahrener Content-Strategist und UX-Writer. Analysiere den folgenden Webseiteninhalt strukturiert.

URL: ${url}
Page Title: ${pageTitle}
Überschriften-Struktur: ${headings.map(h => `${h.level}: ${h.text}`).join(' | ')}

INHALT:
${pageContent.substring(0, 6000)}

Analysiere nach diesen Kriterien und antworte AUSSCHLIESSLICH im folgenden JSON-Format:

{
  "overallScore": {
    "score": <Zahl 0-100>,
    "summary": "<Zusammenfassung der Gesamtbewertung in 1-2 Sätzen>"
  },
  "coreMessage": {
    "clear": <true/false - Wird klar kommuniziert, worum es geht?>,
    "understandableIn5Seconds": <true/false - Versteht ein Besucher in 5 Sekunden den Nutzen?>,
    "identifiedMessage": "<Die identifizierte Kernaussage der Seite>",
    "feedback": "<Detailliertes Feedback zur Kernaussage>"
  },
  "targetAudience": {
    "identified": "<Vermutete Zielgruppe>",
    "languageFit": "<gut/mittel/schlecht>",
    "toneFit": "<gut/mittel/schlecht>",
    "feedback": "<Detailliertes Feedback zum Zielgruppen-Fit>"
  },
  "structure": {
    "headingsCorrect": <true/false - Überschriften sinnvoll und hierarchisch?>,
    "paragraphsOrganized": <true/false - Absätze klar gegliedert?>,
    "hasRedThread": <true/false - Roter Faden vorhanden?>,
    "feedback": "<Detailliertes Feedback zur Struktur>"
  },
  "contentQuality": {
    "repetitions": <true/false - Gibt es Wiederholungen?>,
    "gaps": <true/false - Gibt es inhaltliche Lücken?>,
    "accurate": <true/false - Fachlich korrekt?>,
    "fillerSentences": <true/false - Gibt es unnötige Füllsätze?>,
    "feedback": "<Detailliertes Feedback zur inhaltlichen Qualität>"
  },
  "callToAction": {
    "hasCtAs": <true/false - Gibt es klare CTAs?>,
    "logicallyPlaced": <true/false - Sind sie logisch platziert?>,
    "identifiedCtAs": ["<Liste der gefundenen CTAs>"],
    "feedback": "<Detailliertes Feedback zu den CTAs>"
  },
  "recommendations": [
    {
      "title": "<Kurzer Titel>",
      "description": "<Präziser, sofort umsetzbarer Vorschlag>",
      "priority": "<high/medium/low>"
    }
  ],
  "keyTextSections": {
    "hero": "<Identifizierter Hero-Text, falls vorhanden>",
    "intro": "<Identifizierter Intro-Text, falls vorhanden>",
    "mainContent": "<Wichtigster Kernabschnitt, falls identifizierbar>"
  }
}

WICHTIG:
- Maximal 6 Empfehlungen in "recommendations"
- Bewerte ehrlich und kritisch
- Alle Texte auf Deutsch
- Antworte NUR mit dem JSON, keine zusätzlichen Erklärungen`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein erfahrener Content-Strategist und UX-Writer, der Webseiteninhalte analysiert. Antworte immer im geforderten JSON-Format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 3000,
      temperature: 0.4
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from AI service');
    }

    // Parse JSON response
    let analysis;
    try {
      // Remove potential markdown code blocks
      const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', response);
      throw new Error('Invalid AI response format');
    }

    // Validate and ensure required fields
    if (!analysis.overallScore || typeof analysis.overallScore.score !== 'number') {
      throw new Error('Invalid analysis structure');
    }

    return {
      success: true,
      analysis: {
        ...analysis,
        processingTime: Date.now() - startTime,
        analyzedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Content analysis error:', error);
    return {
      success: false,
      error: error.message,
      analysis: createFallbackContentAnalysis(pageContent)
    };
  }
}

/**
 * Create fallback content analysis when AI fails
 * @param {string} pageContent
 * @returns {Object} Fallback analysis
 */
function createFallbackContentAnalysis(pageContent) {
  const wordCount = pageContent ? pageContent.split(/\s+/).filter(w => w.length > 0).length : 0;
  const hasStructure = pageContent && pageContent.length > 500;

  return {
    overallScore: {
      score: 50,
      summary: 'AI-Analyse nicht verfügbar. Manuelle Überprüfung empfohlen.'
    },
    coreMessage: {
      clear: null,
      understandableIn5Seconds: null,
      identifiedMessage: 'Konnte nicht ermittelt werden',
      feedback: 'AI-Service nicht verfügbar für detaillierte Analyse.'
    },
    targetAudience: {
      identified: 'Nicht ermittelt',
      languageFit: 'unbekannt',
      toneFit: 'unbekannt',
      feedback: 'AI-Service nicht verfügbar.'
    },
    structure: {
      headingsCorrect: null,
      paragraphsOrganized: hasStructure,
      hasRedThread: null,
      feedback: `${wordCount} Wörter gefunden. Detaillierte Analyse nicht verfügbar.`
    },
    contentQuality: {
      repetitions: null,
      gaps: null,
      accurate: null,
      fillerSentences: null,
      feedback: 'AI-Service nicht verfügbar.'
    },
    callToAction: {
      hasCtAs: null,
      logicallyPlaced: null,
      identifiedCtAs: [],
      feedback: 'AI-Service nicht verfügbar.'
    },
    recommendations: [
      {
        title: 'Manuelle Überprüfung',
        description: 'AI-Analyse nicht verfügbar. Bitte Content manuell überprüfen.',
        priority: 'medium'
      }
    ],
    keyTextSections: {
      hero: null,
      intro: null,
      mainContent: null
    },
    fallback: true,
    analyzedAt: new Date().toISOString()
  };
}

/**
 * Generate optimized content versions using AI
 * @param {Object} options - Content optimization options
 * @returns {Promise<Object>} Optimized content
 */
export async function generateContentOptimization(options = {}) {
  const { sections, url, targetAudience = '' } = options;

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    if (!sections || Object.keys(sections).length === 0) {
      throw new Error('No content sections provided for optimization');
    }

    const sectionsText = Object.entries(sections)
      .filter(([key, value]) => value && value.trim())
      .map(([key, value]) => `### ${key.toUpperCase()}:\n${value}`)
      .join('\n\n');

    if (!sectionsText.trim()) {
      throw new Error('No valid content sections to optimize');
    }

    const prompt = `Du bist ein erfahrener UX-Writer und Content-Optimierer. Erstelle optimierte Versionen der folgenden Textabschnitte.

URL: ${url}
${targetAudience ? `Zielgruppe: ${targetAudience}` : ''}

ORIGINAL-TEXTE:
${sectionsText}

Die optimierten Texte sollen:
- KLARER: Eindeutige Aussagen, keine Mehrdeutigkeiten
- VERSTÄNDLICHER: Einfache Sprache, kurze Sätze
- NUTZERZENTRIERTER: Vorteile und Nutzen hervorheben
- KÜRZER oder STRUKTURIERTER: Unnötiges entfernen, besser gliedern

Antworte AUSSCHLIESSLICH im folgenden JSON-Format:

{
  "optimizations": [
    {
      "section": "<hero/intro/mainContent>",
      "original": "<Original-Text>",
      "optimized": "<Optimierter Text>",
      "changes": ["<Änderung 1>", "<Änderung 2>"],
      "reasoning": "<Warum diese Änderungen die Qualität verbessern>"
    }
  ],
  "generalTips": [
    "<Allgemeiner Tipp 1>",
    "<Allgemeiner Tipp 2>"
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein erfahrener UX-Writer der Texte optimiert. Antworte immer im geforderten JSON-Format auf Deutsch.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 3000,
      temperature: 0.6
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from AI service');
    }

    let optimization;
    try {
      const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      optimization = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', response);
      throw new Error('Invalid AI response format');
    }

    return {
      success: true,
      optimization: {
        ...optimization,
        generatedAt: new Date().toISOString(),
        url
      }
    };

  } catch (error) {
    console.error('Content optimization error:', error);
    return {
      success: false,
      error: error.message,
      optimization: {
        optimizations: [],
        generalTips: ['AI-Service nicht verfügbar. Bitte später erneut versuchen.'],
        fallback: true,
        generatedAt: new Date().toISOString(),
        url
      }
    };
  }
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