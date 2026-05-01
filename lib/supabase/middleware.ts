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
                setAll(cookiesToSet) {
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
    console.log('👤 Usuario autenticado:', user ? user.email : 'ninguno');

    // Rutas públicas que no requieren autenticación
    const publicRoutes = ['/', '/login', '/register', '/admin/login', '/help', '/specialties'];
    const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname === route);

    // Si no hay usuario y la ruta no es pública, redirigir a login
    if (!user && !isPublicRoute) {
        console.log('🚫 No autenticado, redirigiendo a /login');
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Si hay usuario, verificar que esté en la ruta correcta según su rol
    if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        const userRole = session?.user?.app_metadata?.role || session?.user?.user_metadata?.role;
        console.log('📋 Rol del usuario:', userRole);

        const pathname = request.nextUrl.pathname;

        // Mapeo de roles a sus rutas base
        const roleRoutes: Record<string, string> = {
            admin: '/admin',
            doctor: '/doctor',
            patient: '/patient',
        };

        // Si está en login o register y ya autenticado, redirigir a su portal
        if (pathname === '/login' || pathname === '/register') {
            const redirectUrl = roleRoutes[userRole] || '/patient';
            console.log('✅ Ya autenticado, redirigiendo de', pathname, 'a', `${redirectUrl}/dashboard`);
            return NextResponse.redirect(new URL(`${redirectUrl}/dashboard`, request.url));
        }

        // Verificar que el usuario esté accediendo a su portal correcto
        if (userRole && roleRoutes[userRole]) {
            const allowedBasePath = roleRoutes[userRole];

            // Si intenta acceder a un portal que no le corresponde
            if (pathname.startsWith('/admin') && userRole !== 'admin') {
                console.log('🚫 Acceso no autorizado a /admin, redirigiendo a', `${roleRoutes[userRole]}/dashboard`);
                return NextResponse.redirect(new URL(`${roleRoutes[userRole]}/dashboard`, request.url));
            }
            if (pathname.startsWith('/doctor') && userRole !== 'doctor') {
                console.log('🚫 Acceso no autorizado a /doctor, redirigiendo a', `${roleRoutes[userRole]}/dashboard`);
                return NextResponse.redirect(new URL(`${roleRoutes[userRole]}/dashboard`, request.url));
            }
            if (pathname.startsWith('/patient') && userRole !== 'patient') {
                console.log('🚫 Acceso no autorizado a /patient, redirigiendo a', `${roleRoutes[userRole]}/dashboard`);
                return NextResponse.redirect(new URL(`${roleRoutes[userRole]}/dashboard`, request.url));
            }
        }
    }

    console.log('✅ Middleware: Permitiendo acceso a', request.nextUrl.pathname);
    return response;
}
