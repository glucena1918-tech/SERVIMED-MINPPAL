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

    return (
        <header className="fixed top-0 left-0 right-0 z-[100] px-4 md:px-6 py-4 md:py-8">
            <nav className="container mx-auto flex items-center justify-between bg-[#020714]/40 backdrop-blur-3xl border border-white/10 px-4 md:px-8 py-3 md:py-5 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl relative overflow-visible">
                
                {/* Logo Section */}
                <div className="flex items-center gap-4 relative z-[110]">
                    <Link href="/" className="flex items-center gap-2 md:gap-4 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 md:w-14 md:h-14 overflow-hidden rounded-xl md:rounded-2xl border-2 border-accent/20 shadow-xl shadow-accent/10">
                            <img src="/images/logo-minppal.png" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-white font-black text-[10px] md:text-xl tracking-tighter leading-none mb-0.5 md:mb-1">
                                SISTEMA DE SALUD
                            </h1>
                            <p className="text-accent font-bold text-[6px] md:text-xs tracking-widest uppercase opacity-80">
                                Institucional MINPPAL
                            </p>
                        </div>
                    </Link>
                </div>

                {/* Desktop Navigation (lg+) */}
                <div className="hidden lg:flex items-center gap-8 relative z-[110]">
                    {!isDashboardPath && (
                        <nav className="flex items-center gap-10">
                            <Link href="/specialties" className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 hover:text-accent transition-all">Especialidades</Link>
                            <Link href="/help" className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 hover:text-accent transition-all">Ayuda</Link>
                        </nav>
                    )}
                    
                    {!isDashboardPath && <div className="h-6 w-px bg-white/10" />}
                    
                    {!isDashboardPath && (
                        <div className="flex items-center gap-4">
                            <Link href="/register" className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-accent border border-accent/30 hover:bg-accent hover:text-[#020714] transition-all">
                                Crear Cuenta
                            </Link>
                            <Link href="/login/admin" className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all">
                                🛡️ Admin
                            </Link>
                        </div>
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
                        className="lg:hidden relative z-[120] w-12 h-12 flex flex-col items-center justify-center gap-1.5 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all"
                    >
                        <span className={`w-6 h-0.5 bg-accent transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                        <span className={`w-6 h-0.5 bg-accent transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`} />
                        <span className={`w-6 h-0.5 bg-accent transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                    </button>
                )}

                {/* Mobile Menu Overlay */}
                <div className={`lg:hidden fixed inset-0 z-[115] bg-[#020714] transition-all duration-500 ${isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
                    <div className="flex flex-col h-full pt-32 px-8 gap-6">
                        <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.5em] mb-4">Navegación Principal</p>
                        
                        <Link href="/specialties" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between group">
                            <span className="text-2xl font-black text-white group-hover:text-accent transition-colors italic">Especialidades</span>
                            <span className="text-accent text-2xl group-hover:translate-x-2 transition-transform">🩺</span>
                        </Link>
                        
                        <Link href="/help" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between group">
                            <span className="text-2xl font-black text-white group-hover:text-accent transition-colors italic">Ayuda</span>
                            <span className="text-accent text-2xl group-hover:translate-x-2 transition-transform">❓</span>
                        </Link>

                        <div className="h-px bg-white/5 my-6" />

                        <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.5em] mb-4">Acceso Usuarios</p>

                        <Link href="/register" onClick={() => setIsMenuOpen(false)} className="w-full py-6 rounded-3xl bg-accent text-[#020714] text-center font-black text-lg uppercase tracking-widest shadow-[0_20px_40px_rgba(6,214,160,0.2)]">
                            Crear Cuenta
                        </Link>

                        <Link href="/login/admin" onClick={() => setIsMenuOpen(false)} className="w-full py-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 text-center font-black text-lg uppercase tracking-widest">
                            🛡️ Acceso Administrativo
                        </Link>

                        <div className="mt-auto pb-12 text-center">
                            <img src="/images/logo-minppal.png" alt="Logo" className="w-12 h-12 mx-auto opacity-20 grayscale mb-4" />
                            <p className="text-white/20 text-[8px] font-bold uppercase tracking-widest">Servimed Minppal © 2024</p>
                        </div>
                    </div>
                </div>

                {isDashboardPath && (
                     <button onClick={handleLogout} className="lg:hidden relative z-[110] bg-red-500/20 border border-red-500/50 text-red-400 px-5 py-2.5 rounded-xl font-black text-[10px] tracking-widest uppercase">
                        Salir
                    </button>
                )}
            </nav>
        </header>
    );
}
