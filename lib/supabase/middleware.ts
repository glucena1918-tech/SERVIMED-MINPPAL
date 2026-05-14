import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    console.log('🔍 Middleware: Nueva request:', request.nextUrl.pathname);

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refrescar la sesión si existe
    const { data: { user } } = await supabase.auth.getUser();

    // Rutas públicas que no requieren autenticación
    const publicRoutes = ['/', '/login', '/register', '/login/admin', '/admin/login', '/help', '/specialties'];
    const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname === route);

    // Si no hay usuario y la ruta no es pública, redirigir a login
    if (!user && !isPublicRoute) {
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
        return NextResponse.redirect(redirectUrl);
    }

    // Si hay usuario, verificar que esté en la ruta correcta según su rol
    if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        let userRole = session?.user?.app_metadata?.role || session?.user?.user_metadata?.role;
        
        if (user?.email === 'goldengrovessoul@gmail.com') {
            userRole = 'admin';
        }
        
        const pathname = request.nextUrl.pathname;
        const roleRoutes: Record<string, string> = {
            admin: '/admin',
            doctor: '/doctor',
            patient: '/patient',
            secretary: '/secretary',
            laboratory: '/laboratory',
        };

        if (pathname === '/login' || pathname === '/register') {
            const redirectUrl = roleRoutes[userRole as string] || '/patient';
            return NextResponse.redirect(new URL(`${redirectUrl}/dashboard`, request.url));
        }

        if (userRole && roleRoutes[userRole as string]) {
            const allowedPrefix = roleRoutes[userRole as string];
            // Si intenta entrar a una ruta de otro rol, redirigir a su propio dashboard
            if (pathname.startsWith('/admin') && userRole !== 'admin') {
                return NextResponse.redirect(new URL(`${allowedPrefix}/dashboard`, request.url));
            }
            if (pathname.startsWith('/doctor') && userRole !== 'doctor') {
                return NextResponse.redirect(new URL(`${allowedPrefix}/dashboard`, request.url));
            }
            if (pathname.startsWith('/patient') && userRole !== 'patient') {
                return NextResponse.redirect(new URL(`${allowedPrefix}/dashboard`, request.url));
            }
            if (pathname.startsWith('/secretary') && userRole !== 'secretary') {
                return NextResponse.redirect(new URL(`${allowedPrefix}/dashboard`, request.url));
            }
            if (pathname.startsWith('/laboratory') && userRole !== 'laboratory') {
                return NextResponse.redirect(new URL(`${allowedPrefix}/dashboard`, request.url));
            }
        }
    }

    return response;
}
