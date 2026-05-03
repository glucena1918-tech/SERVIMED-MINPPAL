'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isDashboardPath = pathname.includes('/dashboard');

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    // Cerrar menú al cambiar de ruta
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    // Debug para consola
    useEffect(() => {
        console.log("Header Responsive Cargado - Menu Abierto:", isMenuOpen);
    }, [isMenuOpen]);

    return (
        <header className="fixed top-0 left-0 right-0 z-[100] px-4 md:px-6 py-4 md:py-8">
            <nav className="container mx-auto flex items-center justify-between bg-white/[0.05] backdrop-blur-3xl border border-white/10 px-4 md:px-8 py-3 md:py-5 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl relative overflow-visible group">
                
                {/* Logo Section */}
                <div className="flex items-center gap-4 relative z-[110]">
                    <Link href="/" className="flex items-center gap-2 md:gap-4 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 md:w-14 md:h-14 overflow-hidden rounded-xl md:rounded-2xl border-2 border-accent/20 shadow-xl shadow-accent/10">
                            <img src="/images/logo-minppal.png" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-white font-black text-xs md:text-xl tracking-tighter leading-none mb-0.5 md:mb-1">
                                SISTEMA DE SALUD
                            </h1>
                            <p className="text-accent font-bold text-[7px] md:text-xs tracking-widest uppercase opacity-80">
                                Institucional MINPPAL
                            </p>
                        </div>
                    </Link>
                </div>

                {/* Desktop Actions (Hidden on screens smaller than 1024px) */}
                <div className="hidden lg:flex items-center gap-6 relative z-[110]">
                    {!isDashboardPath && (
                        <nav className="flex items-center gap-10">
                            <Link
                                href="/specialties"
                                className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-accent transition-all duration-300 hover:tracking-[0.4em]"
                            >
                                Especialidades
                            </Link>
                            <Link
                                href="/help"
                                className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-accent transition-all duration-300 hover:tracking-[0.4em]"
                            >
                                Ayuda
                            </Link>
                        </nav>
                    )}
                    
                    {!isDashboardPath && <div className="h-6 w-px bg-white/15" />}
                    
                    {!isDashboardPath && (
                        <>
                            <Link
                                href="/register"
                                className="flex items-center px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-accent hover:text-[#020714] border border-accent/30 hover:bg-accent transition-all duration-300 bg-accent/5"
                            >
                                Crear Cuenta
                            </Link>
                            <Link
                                href="/login/admin"
                                className="flex items-center px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-white border border-red-500/30 hover:bg-red-500 transition-all duration-300 bg-red-500/5"
                            >
                                <span className="mr-2">🛡️</span> Acceso Administrativo
                            </Link>
                        </>
                    )}

                    {isDashboardPath && (
                        <button
                            onClick={handleLogout}
                            className="group relative overflow-hidden bg-red-500/20 border border-red-500/50 text-red-400 px-8 py-3 rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl shadow-red-500/10 hover:bg-red-500 hover:text-white transition-all duration-300 active:scale-95"
                        >
                            Cerrar Sesión
                        </button>
                    )}
                </div>

                {/* Mobile Menu Toggle (Visible ONLY on mobile/tablet) */}
                {!isDashboardPath && (
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="lg:hidden relative z-[120] w-10 h-10 flex flex-col items-center justify-center gap-1.5 bg-accent/10 rounded-xl border-2 border-accent/50 active:scale-90 transition-all"
                        aria-label="Menu"
                    >
                        <span className={`w-5 h-0.5 bg-accent transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                        <span className={`w-5 h-0.5 bg-accent transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`} />
                        <span className={`w-5 h-0.5 bg-accent transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                    </button>
                )}

                {/* Mobile Menu Overlay */}
                <div 
                    className={`lg:hidden fixed inset-0 z-[115] bg-[#020714]/98 backdrop-blur-3xl transition-all duration-500 ease-in-out ${
                        isMenuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'
                    }`}
                >
                    <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
                        <Link
                            href="/specialties"
                            className="text-xl font-black uppercase tracking-[0.4em] text-white hover:text-accent transition-all"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Especialidades
                        </Link>
                        <Link
                            href="/help"
                            className="text-xl font-black uppercase tracking-[0.4em] text-white hover:text-accent transition-all"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Ayuda
                        </Link>
                        
                        <div className="w-full max-w-[200px] h-px bg-white/10 my-4" />
                        
                        <Link
                            href="/register"
                            className="w-full max-w-[280px] text-center py-5 rounded-2xl text-sm font-black uppercase tracking-[0.2em] bg-accent text-[#020714] shadow-[0_0_30px_rgba(6,214,160,0.3)]"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Crear Cuenta
                        </Link>
                        
                        <Link
                            href="/login/admin"
                            className="w-full max-w-[280px] text-center py-5 rounded-2xl text-sm font-black uppercase tracking-[0.2em] bg-red-500/20 border border-red-500/50 text-red-400"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            🛡️ Acceso Administrativo
                        </Link>
                    </div>
                </div>

                {isDashboardPath && (
                     <button
                        onClick={handleLogout}
                        className="lg:hidden relative z-[110] bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-xl font-black text-[10px] tracking-widest uppercase"
                    >
                        Salir
                    </button>
                )}
            </nav>
        </header>
    );
}
