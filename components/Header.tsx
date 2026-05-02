'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const isDashboardPath = pathname.includes('/dashboard');

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-6 py-8">
            <nav className="container mx-auto flex items-center justify-between bg-white/[0.03] backdrop-blur-3xl border border-white/10 px-8 py-5 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                {/* Logo Section */}
                <div className="flex items-center gap-4 relative z-10">
                    <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                        <div className="w-14 h-14 overflow-hidden rounded-2xl border-2 border-accent/20 shadow-xl shadow-accent/10">
                            <img src="/images/logo-minppal.png" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <div className="hidden md:block">
                            <h1 className="text-white font-black text-xl tracking-tighter leading-none mb-1">
                                SISTEMA DE SALUD
                            </h1>
                            <p className="text-accent font-bold text-xs tracking-widest uppercase opacity-80">
                                Institucional MINPPAL
                            </p>
                        </div>
                    </Link>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-6 relative z-10">
                    {!isDashboardPath && (
                        <nav className="hidden lg:flex items-center gap-10">
                            {['Especialidades', 'Ayuda'].map((item) => (
                                <Link
                                    key={item}
                                    href={`#${item.toLowerCase()}`}
                                    className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-accent transition-all duration-300 hover:tracking-[0.4em]"
                                >
                                    {item}
                                </Link>
                            ))}
                        </nav>
                    )}
                    
                    {!isDashboardPath && <div className="h-6 w-px bg-white/15 hidden lg:block" />}
                    
                    {!isDashboardPath && (
                        <>
                            <Link
                                href="/register"
                                className="hidden sm:flex items-center px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-accent hover:text-[#020714] border border-accent/30 hover:bg-accent transition-all duration-300 bg-accent/5"
                            >
                                Crear Cuenta
                            </Link>
                            <Link
                                href="/login/admin"
                                className="hidden sm:flex items-center px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-white border border-red-500/30 hover:bg-red-500 transition-all duration-300 bg-red-500/5"
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
            </nav>
        </header>
    );
}
