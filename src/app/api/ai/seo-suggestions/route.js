import { NextResponse } from 'next/server';
import { generateSeoSuggestions } from '../../../../lib/ai-service.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, currentTitle, currentDescription, pageContent } = body;

    // Validate required parameters
    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Generate AI suggestions
    const suggestions = await generateSeoSuggestions({
      url,
      currentTitle: currentTitle || '',
      currentDescription: currentDescription || '',
      pageContent: pageContent || ''
    });

    return NextResponse.json({
      success: true,
      suggestions
    });

  } catch (error) {
    console.error('SEO suggestions error:', error);

    // Handle specific AI/OpenAI errors
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'AI service not configured. Please check OpenAI API key.' },
        { status: 503 }
      );
    }

    if (error.message?.includes('rate limit')) {
      return NextResponse.json(
        { error: 'AI service rate limit reached. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate SEO suggestions' },
      { status: 500 }
    );
  }
}