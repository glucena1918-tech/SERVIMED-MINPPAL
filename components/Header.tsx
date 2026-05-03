'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // Validación segura para evitar errores en el cliente
    const isDashboardPath = pathname?.includes('/dashboard') || false;

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            router.push('/');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    // Cerrar menú al cambiar de ruta de forma segura
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    // Prevenir scroll cuando el menú está abierto
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isMenuOpen]);

    return (
        <header className="fixed top-0 left-0 right-0 z-[100] px-4 md:px-6 py-4 md:py-8">
            <nav className="container mx-auto flex items-center justify-between bg-[#020714]/60 backdrop-blur-3xl border border-white/10 px-4 md:px-8 py-3 md:py-5 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl relative">
                
                {/* Logo Section */}
                <div className="flex items-center gap-4 relative z-[150]">
                    <Link href="/" className="flex items-center gap-2 md:gap-4 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 md:w-14 md:h-14 overflow-hidden rounded-xl md:rounded-2xl border-2 border-accent/20 shadow-xl shadow-accent/10">
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
                </div>

                {/* Desktop Navigation (lg+) */}
                <div className="hidden lg:flex items-center gap-8 relative z-[150]">
                    {!isDashboardPath && (
                        <>
                            <div className="flex items-center gap-10">
                                <Link href="/specialties" className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 hover:text-accent transition-all">Especialidades</Link>
                                <Link href="/help" className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 hover:text-accent transition-all">Ayuda</Link>
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
                        <button onClick={handleLogout} className="bg-red-500/20 border border-red-500/50 text-red-400 px-8 py-3 rounded-2xl font-black text-sm tracking-widest uppercase hover:bg-red-500 hover:text-white transition-all">
                            Cerrar Sesión
                        </button>
                    )}
                </div>

                {/* Mobile Menu Button */}
                {!isDashboardPath && (
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Abrir menú"
                        className="lg:hidden relative z-[160] w-12 h-12 flex flex-col items-center justify-center gap-1.5 bg-accent/10 rounded-2xl border border-accent/30 active:scale-90 transition-all"
                    >
                        <span className={`w-6 h-0.5 bg-accent transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                        <span className={`w-6 h-0.5 bg-accent transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`} />
                        <span className={`w-6 h-0.5 bg-accent transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                    </button>
                )}

                {/* Mobile Menu Overlay - OPAQUE */}
                <div className={`lg:hidden fixed inset-0 z-[155] bg-[#020714] transition-transform duration-500 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex flex-col h-full pt-32 pb-10 px-6 overflow-y-auto">
                        
                        <div className="mb-12">
                            <p className="text-accent text-[10px] font-black uppercase tracking-[0.5em] mb-6 opacity-60">Navegación</p>
                            
                            <div className="flex flex-col gap-4">
                                <Link href="/specialties" className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10">
                                    <span className="text-xl font-bold text-white tracking-wider">Especialidades</span>
                                    <span className="text-2xl">🩺</span>
                                </Link>
                                
                                <Link href="/help" className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10">
                                    <span className="text-xl font-bold text-white tracking-wider">Ayuda y Soporte</span>
                                    <span className="text-2xl">❓</span>
                                </Link>
                            </div>
                        </div>

                        <div className="mb-8">
                            <p className="text-accent text-[10px] font-black uppercase tracking-[0.5em] mb-6 opacity-60">Acciones</p>
                            
                            <div className="flex flex-col gap-4">
                                <Link href="/register" className="w-full py-6 rounded-3xl bg-accent text-[#020714] text-center font-black text-lg uppercase tracking-widest shadow-[0_20px_40px_rgba(6,214,160,0.2)]">
                                    Crear Cuenta
                                </Link>

                                <Link href="/login/admin" className="w-full py-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 text-center font-black text-sm uppercase tracking-widest mt-4">
                                    🛡️ Acceso Administrativo
                                </Link>
                            </div>
                        </div>

                        <div className="mt-auto pt-10 text-center border-t border-white/5">
                            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                                Servimed Minppal © 2024
                            </p>
                        </div>
                    </div>
                </div>

                {isDashboardPath && (
                     <button onClick={handleLogout} className="lg:hidden relative z-[150] bg-red-500/20 border border-red-500/50 text-red-400 px-5 py-2.5 rounded-xl font-black text-[10px] tracking-widest uppercase">
                        Salir
                    </button>
                )}
            </nav>
        </header>
    );
}
