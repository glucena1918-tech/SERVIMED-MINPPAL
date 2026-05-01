'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
    const pathname = usePathname();
    const isSpecialtiesPage = pathname === '/specialties';

    return (
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-white/10"
            style={{ backgroundColor: 'rgba(2,7,20,0.30)' }}>
            <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center space-x-4 group">
                    <div className="relative w-14 h-14 overflow-hidden rounded-2xl border-2 border-accent/40 group-hover:border-accent transition-all duration-500 shadow-xl shadow-accent/20">
                        <img
                            src="https://images.pexels.com/photos/37340896/pexels-photo-37340896.png"
                            alt="Logo Sistema de Salud Institucional MINPPAL"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                    </div>
                    <div className="flex flex-col -space-y-1">
                        <span className="text-white font-black text-xl tracking-tight leading-none drop-shadow-md">
                            Sistema de Salud <br />
                            Institucional <span className="text-white/80">MINPPAL</span>
                        </span>
                    </div>
                </Link>

                <div className="flex items-center space-x-8">
                    <nav className="hidden lg:flex space-x-8 text-xs font-bold text-white/60 uppercase tracking-widest">
                        <Link 
                            href={isSpecialtiesPage ? "/" : "/specialties"} 
                            className="hover:text-accent transition-colors"
                        >
                            {isSpecialtiesPage ? "Inicio" : "Especialidades"}
                        </Link>
                        <Link href="/help" className="hover:text-accent transition-colors">Ayuda</Link>
                    </nav>
                    <div className="h-6 w-px bg-white/15 hidden lg:block" />
                    <Link
                        href="/login"
                        className="group relative overflow-hidden bg-accent text-white px-8 py-3 rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl shadow-accent/30 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(6,214,160,0.5)] transition-all duration-300 active:scale-95"
                    >
                        <span className="relative z-10">Acceder</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    </Link>
                </div>
            </nav>
        </header>
    );
}
