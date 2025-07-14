import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for demo purposes
// In production, use a proper database
const commentsStore: Record<string, Array<{
  id: string;
  url: string;
  x: number;
  y: number;
  text: string;
  timestamp: string;
}>> = {};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    const hostname = new URL(url).hostname;
    const comments = commentsStore[hostname] || [];

    return NextResponse.json({
      success: true,
      comments: comments.filter(comment => comment.url === url),
    });

  } catch (error) {
    console.error('Comments GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, x, y, text } = body;

    if (!url || !text || x === undefined || y === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const hostname = new URL(url).hostname;
    
    if (!commentsStore[hostname]) {
      commentsStore[hostname] = [];
    }

    const comment = {
      id: Date.now().toString(),
      url,
      x,
      y,
      text,
      timestamp: new Date().toISOString(),
    };

    commentsStore[hostname].push(comment);

    return NextResponse.json({
      success: true,
      comment,
    });

  } catch (error) {
    console.error('Comments POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const url = searchParams.get('url');

    if (!id || !url) {
      return NextResponse.json(
        { success: false, error: 'ID and URL parameters are required' },
        { status: 400 }
      );
    }

    const hostname = new URL(url).hostname;
    
    if (commentsStore[hostname]) {
      commentsStore[hostname] = commentsStore[hostname].filter(
        comment => comment.id !== id
      );
    }

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('Comments DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}