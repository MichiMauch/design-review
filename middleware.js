import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Routes that require authentication
const protectedRoutes = [
  '/admin',
  '/project',
  '/projects'
];

// API routes that require authentication
const protectedApiRoutes = [
  '/api/admin',
  '/api/projects/.*/edit',
  '/api/jira'
];

// Public routes that should NOT redirect to login (for widget compatibility)
const publicRoutes = [
  '/api/feedback',
  '/api/projects/.*/tasks', // POST for widget task creation
  '/api/upload-screenshot',
  '/api/projects/.*/widget-ping',
  '/api/projects/.*/widget-status',
  '/api/simple-screenshot',
  '/auth',
  '/login'
];

function isPublicRoute(pathname) {
  return publicRoutes.some(route => {
    if (route.includes('.*')) {
      // Handle regex patterns
      const regex = new RegExp('^' + route.replace('.*', '[^/]+') + '$');
      return regex.test(pathname);
    }
    return pathname.startsWith(route);
  });
}

function isProtectedRoute(pathname) {
  // Check protected pages
  const isProtectedPage = protectedRoutes.some(route => pathname.startsWith(route));
  
  // Check protected API routes
  const isProtectedApi = protectedApiRoutes.some(route => {
    if (route.includes('.*')) {
      const regex = new RegExp('^' + route.replace('.*', '[^/]+'));
      return regex.test(pathname);
    }
    return pathname.startsWith(route);
  });
  
  return isProtectedPage || isProtectedApi;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/widget') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check if route needs protection
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // Get session token
  const sessionToken = request.cookies.get('session')?.value;
  
  if (!sessionToken) {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return Response.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // For pages, redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(sessionToken, JWT_SECRET);
    
    // Check if user has access to specific project routes
    if (pathname.startsWith('/project/')) {
      const projectIdMatch = pathname.match(/^\/project\/(\d+)/);
      if (projectIdMatch && decoded.role !== 'admin') {
        const projectId = parseInt(projectIdMatch[1]);
        const hasAccess = decoded.projectAccess?.includes(projectId);
        
        if (!hasAccess) {
          // For API routes, return 403
          if (pathname.startsWith('/api/')) {
            return Response.json(
              { success: false, error: 'Project access denied' },
              { status: 403 }
            );
          }
          
          // For pages, redirect to projects overview
          const projectsUrl = new URL('/projects', request.url);
          return NextResponse.redirect(projectsUrl);
        }
      }
    }

    // Check admin routes
    if (pathname.startsWith('/admin') && decoded.role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return Response.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        );
      }
      
      const projectsUrl = new URL('/projects', request.url);
      return NextResponse.redirect(projectsUrl);
    }

    return NextResponse.next();
    
  } catch (error) {
    console.error('JWT verification failed:', error);
    
    // Invalid token - clear cookie and redirect
    const response = pathname.startsWith('/api/') 
      ? Response.json({ success: false, error: 'Invalid session' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));
    
    response.headers.set('Set-Cookie', 'session=; HttpOnly; Path=/; Max-Age=0');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (widget.js, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|widget-new.js|.*\\.(?:jpg|jpeg|gif|png|svg|ico|css|js)$).*)',
  ],
};