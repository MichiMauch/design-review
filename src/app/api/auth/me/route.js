import { getUser } from '../../../../../lib/auth.js';

export async function GET() {
  try {
    const user = await getUser();
    
    if (!user) {
      return Response.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return Response.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        projectAccess: user.projectAccess
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    return Response.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}