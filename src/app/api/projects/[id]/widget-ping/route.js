import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
    // Add CORS headers for widget
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    try {
        const { id } = params;
        await request.json();
        
        // Log widget ping for monitoring

        return NextResponse.json(
            { 
                success: true, 
                message: 'Widget ping received',
                projectId: id 
            },
            { status: 200, headers }
        );
    } catch {
        return NextResponse.json(
            { 
                success: false, 
                error: 'Widget ping failed' 
            },
            { status: 500, headers }
        );
    }
}

export async function OPTIONS() {
    // Handle preflight requests
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}