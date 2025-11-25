import { NextResponse } from 'next/server';
import { generateContentOptimization } from '@/lib/ai-service';

export async function POST(request) {
  try {
    const body = await request.json();
    const { sections, url, targetAudience } = body;

    if (!sections || Object.keys(sections).length === 0) {
      return NextResponse.json(
        { error: 'Content sections are required' },
        { status: 400 }
      );
    }

    // Filter out empty sections
    const validSections = Object.fromEntries(
      Object.entries(sections).filter(([key, value]) => value && value.trim())
    );

    if (Object.keys(validSections).length === 0) {
      return NextResponse.json(
        { error: 'At least one non-empty content section is required' },
        { status: 400 }
      );
    }

    // Call AI service for content optimization
    const result = await generateContentOptimization({
      sections: validSections,
      url,
      targetAudience
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        optimization: result.optimization
      });
    }

    return NextResponse.json({
      success: true,
      optimization: result.optimization
    });

  } catch (error) {
    console.error('Content optimization error:', error);
    return NextResponse.json(
      { error: 'Internal server error during content optimization' },
      { status: 500 }
    );
  }
}
