'use client';

/**
 * SESSION LOG - 2024-05-03
 * ------------------------
 * 1. FIX: Mobile Scroll Lock - Removed overflow-hidden from Help/Register/Admin pages.
 * 2. UI: Unified Header - Added borders to "Especialidades" and "Ayuda" for desktop consistency.
 * 3. PERF: Optimized mobile tap response and removed role selection delay in Register.
 * 4. NAV: Implemented v1.3.1 Grid layout for mobile menu to prevent overlapping.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const isDashboardPath = pathname?.includes('/dashboard') || false;

    // Función para cerrar el menú y LIBERAR el scroll instantáneamente
    const closeMenu = () => {
        setIsMenuOpen(false);
        document.body.style.overflow = 'unset';
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            // Limpieza profunda de persistencia local
            window.localStorage.clear();
            window.sessionStorage.clear();
            // Redirección forzada para limpiar cookies de SSR y estado de middleware
            window.location.replace('/');
        } catch (error) {
            console.error('Error logging out:', error);
            window.location.replace('/');
        }
    };

    // Asegurar que al cambiar de ruta el scroll siempre esté habilitado
    useEffect(() => {
        closeMenu();
    }, [pathname]);

    // Control del scroll del cuerpo
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        // Limpieza al desmontar
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMenuOpen]);

    return (
        <>
            {/* Overlay Móvil - v1.3.1 OPTIMIZADO */}
            <div 
                className={`fixed inset-0 z-[999] bg-[#050b18] transition-transform duration-300 ease-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} lg:hidden`}
            >
                <div className="flex flex-col h-full w-full p-6">
                    {/* Botón Cerrar */}
                    <div className="flex justify-end pt-2">
                        <button 
                            onClick={closeMenu}
                            className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl active:scale-95 transition-all"
                        >
                            <span className="text-accent text-2xl font-light">✕</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-8 mt-6 overflow-y-auto px-2 pb-20">
                        
                        <div className="grid grid-cols-1 gap-3">
                            <p className="text-accent text-[9px] font-black uppercase tracking-[0.4em] opacity-50 mb-2">Navegación</p>
                            <Link href="/specialties" onClick={closeMenu} className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/10">
                                <span className="text-lg font-black text-white italic">Especialidades</span>
                                <span className="text-2xl">🩺</span>
                            </Link>
                            <Link href="/help" onClick={closeMenu} className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/10">
                                <span className="text-lg font-black text-white italic">Ayuda</span>
                                <span className="text-2xl">❓</span>
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <p className="text-accent text-[9px] font-black uppercase tracking-[0.4em] opacity-50 mb-2">
                                {isDashboardPath ? 'Mi Sesión' : 'Acceso Seguro'}
                            </p>
                            
                            {isDashboardPath ? (
                                <button 
                                    onClick={() => {
                                        closeMenu();
                                        handleLogout();
                                    }} 
                                    className="w-full py-5 rounded-2xl bg-red-500 text-white text-center font-black text-base uppercase tracking-widest shadow-[0_10px_20px_rgba(239,68,68,0.2)] active:bg-red-600 transition-colors"
                                >
                                    Cerrar Sesión
                                </button>
                            ) : (
                                <>
                                    <Link href="/register" onClick={closeMenu} className="w-full py-5 rounded-2xl bg-accent text-[#020714] text-center font-black text-base uppercase tracking-widest shadow-[0_10px_20px_rgba(6,214,160,0.1)] active:bg-accent/80 transition-colors">
                                        Crear Cuenta
                                    </Link>
                                    
                                    <Link href="/login/admin" onClick={closeMenu} className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-center font-black text-[10px] uppercase tracking-[0.2em] active:bg-red-500/20 transition-colors">
                                        🛡️ Acceso Administrativo
                                    </Link>
                                </>
                            )}
                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-accent text-[9px] font-black tracking-widest opacity-40">v1.3.2 - AUTH FIXED</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Header Principal - OPTIMIZACIÓN DE BACKDROP BLUR PARA MÓVIL */}
            <header className="fixed top-0 left-0 right-0 z-[100] px-4 md:px-6 py-4 md:py-8">
                <nav className="container mx-auto flex items-center justify-between bg-[#020714]/80 lg:backdrop-blur-3xl border border-white/10 px-4 md:px-8 py-3 md:py-5 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl">
                    
                    <Link href="/" className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-14 md:h-14 overflow-hidden rounded-xl md:rounded-2xl border-2 border-accent/20">
                            <img src="/images/logo-minppal.png" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-white font-black text-[10px] md:text-xl tracking-tighter leading-none mb-0.5 md:mb-1 uppercase">
                                SISTEMA DE SALUD
                            </span>
                            <span className="text-accent font-bold text-[6px] md:text-xs tracking-widest uppercase opacity-80">
                                Institucional MINPPAL
                            </span>
                        </div>
                    </Link>

                    {/* Botón Hamburguesa Móvil - SIEMPRE VISIBLE PARA CERRAR SESIÓN EN DASHBOARD */}
                    <button 
                        onClick={() => setIsMenuOpen(true)}
                        className="lg:hidden w-12 h-12 flex flex-col items-center justify-center gap-1.5 bg-accent/10 rounded-2xl border border-accent/30 active:scale-90 transition-all"
                    >
                        <div className="w-6 h-0.5 bg-accent" />
                        <div className="w-6 h-0.5 bg-accent" />
                        <div className="w-6 h-0.5 bg-accent" />
                    </button>
                    
                    {/* El resto del código de escritorio se mantiene igual */}
                    <div className="hidden lg:flex items-center gap-8">
                        {!isDashboardPath && (
                            <>
                                <div className="flex items-center gap-4">
                                    <Link href="/specialties" className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70 border border-white/10 hover:border-accent hover:text-accent transition-all bg-white/5 backdrop-blur-md">
                                        Especialidades
                                    </Link>
                                    <Link href="/help" className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70 border border-white/10 hover:border-blue-400 hover:text-blue-400 transition-all bg-white/5 backdrop-blur-md">
                                        Ayuda
                                    </Link>
                                </div>
                                <div className="h-6 w-px bg-white/10" />
                                <div className="flex items-center gap-4">
                                    <Link href="/register" className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-accent border border-accent/30 hover:bg-accent hover:text-[#020714] transition-all">
                                        Crear Cuenta
                                    </Link>
                                    <Link href="/login/admin" className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all">
                                        🛡️ Admin
                                    </Link>
                                </div>
                            </>
                        )}
                        {isDashboardPath && (
                            <button onClick={handleLogout} className="bg-red-500/20 border border-red-500/50 text-red-400 px-8 py-3 rounded-2xl font-black text-sm tracking-widest uppercase">
                                Cerrar Sesión
                            </button>
                        )}
                    </div>
                </nav>
            </header>
        </>
    );
}
