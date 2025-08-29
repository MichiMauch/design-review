import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export async function getUser() {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return null;
    }

    const decoded = jwt.verify(sessionToken, JWT_SECRET);
    return {
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      projectAccess: decoded.projectAccess || [],
      loginTime: decoded.loginTime
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return user;
}

export function hasProjectAccess(user, projectId) {
  if (user.role === 'admin') {
    return true;
  }
  return user.projectAccess.includes(parseInt(projectId));
}

// Middleware helper for API routes
export function withAuth(handler, options = {}) {
  return async (request, context) => {
    try {
      const user = await getUser();
      
      if (!user) {
        return Response.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      if (options.adminRequired && user.role !== 'admin') {
        return Response.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        );
      }

      if (options.checkProjectAccess && context?.params?.id) {
        const projectId = await context.params.id;
        if (!hasProjectAccess(user, projectId)) {
          return Response.json(
            { success: false, error: 'Project access denied' },
            { status: 403 }
          );
        }
      }

      // Add user to request context
      request.user = user;
      
      return handler(request, context);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return Response.json(
        { success: false, error: 'Authentication error' },
        { status: 500 }
      );
    }
  };
}