'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const isDashboardPath = pathname?.includes('/dashboard') || false;

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            router.push('/');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isMenuOpen]);

    return (
        <>
            {/* Overlay Móvil - v1.3 CONTROL */}
            <div 
                className={`fixed inset-0 z-[999] bg-[#050b18] transition-transform duration-500 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} lg:hidden`}
            >
                <div className="flex flex-col h-full w-full p-6">
                    {/* Botón Cerrar */}
                    <div className="flex justify-end pt-2">
                        <button 
                            onClick={() => setIsMenuOpen(false)}
                            className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl active:scale-90"
                        >
                            <span className="text-accent text-2xl font-light">✕</span>
                        </button>
                    </div>

                    {/* USANDO GRID PARA EVITAR SOLAPAMIENTO */}
                    <div className="grid grid-cols-1 gap-12 mt-8 overflow-y-auto px-2 pb-20">
                        
                        <div className="grid grid-cols-1 gap-4">
                            <p className="text-accent text-[9px] font-black uppercase tracking-[0.4em] opacity-50 mb-2">Navegación</p>
                            <Link href="/specialties" className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10">
                                <span className="text-xl font-black text-white italic">Especialidades</span>
                                <span className="text-3xl">🩺</span>
                            </Link>
                            <Link href="/help" className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10">
                                <span className="text-xl font-black text-white italic">Ayuda</span>
                                <span className="text-3xl">❓</span>
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <p className="text-accent text-[9px] font-black uppercase tracking-[0.4em] opacity-50 mb-2">Acceso Seguro</p>
                            
                            <Link href="/register" className="w-full py-6 rounded-3xl bg-accent text-[#020714] text-center font-black text-lg uppercase tracking-widest shadow-[0_15px_40px_rgba(6,214,160,0.3)]">
                                Crear Cuenta
                            </Link>
                            
                            <Link href="/login/admin" className="w-full py-5 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 text-center font-black text-[10px] uppercase tracking-[0.2em]">
                                🛡️ Acceso Administrativo
                            </Link>
                        </div>

                        {/* MARCA DE AGUA DE CONTROL */}
                        <div className="mt-10 text-center space-y-2">
                            <p className="text-accent text-[10px] font-black tracking-widest">v1.3 - VERIFICADO</p>
                            <p className="text-white/10 text-[8px] font-bold uppercase tracking-[0.3em]">
                                Servimed Minppal © 2024
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Header Principal */}
            <header className="fixed top-0 left-0 right-0 z-[100] px-4 md:px-6 py-4 md:py-8">
                <nav className="container mx-auto flex items-center justify-between bg-[#020714]/60 backdrop-blur-3xl border border-white/10 px-4 md:px-8 py-3 md:py-5 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl">
                    
                    <Link href="/" className="flex items-center gap-3 md:gap-4 hover:opacity-80 transition-opacity">
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

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-8">
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
                            <button onClick={handleLogout} className="bg-red-500/20 border border-red-500/50 text-red-400 px-8 py-3 rounded-2xl font-black text-sm tracking-widest uppercase">
                                Cerrar Sesión
                            </button>
                        )}
                    </div>

                    {/* Botón Hamburguesa Móvil */}
                    {!isDashboardPath && (
                        <button 
                            onClick={() => setIsMenuOpen(true)}
                            className="lg:hidden w-12 h-12 flex flex-col items-center justify-center gap-1.5 bg-accent/10 rounded-2xl border border-accent/30 active:scale-90 transition-all"
                        >
                            <div className="w-6 h-0.5 bg-accent mb-1" />
                            <div className="w-6 h-0.5 bg-accent mb-1" />
                            <div className="w-6 h-0.5 bg-accent" />
                        </button>
                    )}

                    {isDashboardPath && (
                        <button onClick={handleLogout} className="lg:hidden bg-red-500/20 border border-red-500/50 text-red-400 px-5 py-2.5 rounded-xl font-black text-[10px] tracking-widest uppercase">
                            Salir
                        </button>
                    )}
                </nav>
            </header>
        </>
    );
}
