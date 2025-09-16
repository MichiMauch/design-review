import { NextResponse } from 'next/server';
import { getDb, initDatabase } from '../../../../../../lib/db.js';

export async function POST(request, { params }) {
    // Add CORS headers for widget
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    try {
        const { id } = params;

        // Body may be empty; ignore parsing errors
        try { await request.json(); } catch {}

        // Update widget_last_ping and mark widget as installed
        await initDatabase();
        const db = getDb();

        const updateResult = await db.execute({
            sql: `
                UPDATE projects
                SET widget_installed = TRUE,
                    widget_last_ping = datetime('now')
                WHERE id = ?
            `,
            args: [id]
        });

        if (!updateResult || updateResult.rowsAffected === 0) {
            return NextResponse.json(
                { success: false, error: 'Projekt nicht gefunden' },
                { status: 404, headers }
            );
        }

        // Read back last_ping to return to client
        const select = await db.execute({
            sql: 'SELECT widget_last_ping FROM projects WHERE id = ?',
            args: [id]
        });
        const lastPing = select.rows?.[0]?.widget_last_ping || null;

        return NextResponse.json(
            {
                success: true,
                message: 'Widget ping received',
                projectId: id,
                last_ping: lastPing
            },
            { status: 200, headers }
        );
    } catch (e) {
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
