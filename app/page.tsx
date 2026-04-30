'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const BG_IMAGES = [
    'https://images.pexels.com/photos/8376277/pexels-photo-8376277.jpeg',
    'https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg',
    'https://images.pexels.com/photos/4989176/pexels-photo-4989176.jpeg',
    'https://images.pexels.com/photos/7578803/pexels-photo-7578803.jpeg',
    'https://images.pexels.com/photos/4309557/pexels-photo-4309557.jpeg',
];

export default function HomePage() {
    const [scrollY, setScrollY] = useState(0);
    const [currentImg, setCurrentImg] = useState(0);
    const [fading, setFading] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setFading(true);
            setTimeout(() => {
                setCurrentImg(prev => (prev + 1) % BG_IMAGES.length);
                setFading(false);
            }, 800);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative min-h-screen overflow-x-hidden">
            {/* ── BACKGROUND SLIDESHOW ── */}
            <div className="fixed inset-0 w-full h-full -z-20 overflow-hidden" style={{ backgroundColor: '#020714' }}>
                {BG_IMAGES.map((src, i) => (
                    <img
                        key={src}
                        src={src}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms]"
                        style={{
                            opacity: i === currentImg ? (fading ? 0 : 0.82) : 0,
                            transform: `translateY(${scrollY * 0.12}px) scale(1.08)`,
                        }}
                    />
                ))}
                {/* Dark gradient for text legibility */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'linear-gradient(to bottom, rgba(2,7,20,0.50) 0%, rgba(2,7,20,0.10) 35%, rgba(2,7,20,0.10) 65%, rgba(2,7,20,0.70) 100%)',
                    }}
                />
                {/* Slide dots indicator */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {BG_IMAGES.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentImg(i)}
                            className="transition-all duration-500 rounded-full"
                            style={{
                                width: i === currentImg ? 24 : 8,
                                height: 8,
                                backgroundColor: i === currentImg ? '#06D6A0' : 'rgba(255,255,255,0.3)',
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* ── HEADER ── */}
            <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-white/10"
                style={{ backgroundColor: 'rgba(2,7,20,0.30)' }}>
                <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center space-x-4 group">
                        <div className="relative w-14 h-14 overflow-hidden rounded-2xl border-2 border-accent/40 group-hover:border-accent transition-all duration-500 shadow-xl shadow-accent/20">
                            <img
                                src="https://images.pexels.com/photos/37340896/pexels-photo-37340896.png"
                                alt="Servimed Logo"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                        </div>
                        <div className="flex flex-col -space-y-1">
                            <span className="text-white font-black text-2xl tracking-tighter drop-shadow-md">
                                SERVI<span className="text-accent">MED</span>
                            </span>
                            <span className="text-white/60 text-[10px] font-bold tracking-[0.3em] uppercase">
                                Minppal
                            </span>
                        </div>
                    </Link>

                    <div className="flex items-center space-x-8">
                        <nav className="hidden lg:flex space-x-8 text-xs font-bold text-white/60 uppercase tracking-widest">
                            <a href="#" className="hover:text-accent transition-colors">Especialidades</a>
                            <a href="#" className="hover:text-accent transition-colors">Sedes</a>
                            <a href="#" className="hover:text-accent transition-colors">Ayuda</a>
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

            {/* ── HERO ── */}
            <main className="relative container mx-auto px-6 pt-64 pb-32 z-10">
                <div
                    className="max-w-5xl mx-auto text-center"
                    style={{ transform: `translateY(-${scrollY * 0.08}px)` }}
                >
                    {/* Badge */}
                    <div className="inline-flex items-center gap-3 mb-10 px-5 py-2 rounded-full border border-accent/25 backdrop-blur-xl text-accent text-[10px] font-black tracking-[0.3em] uppercase"
                        style={{ backgroundColor: 'rgba(6,214,160,0.08)' }}>
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
                        </span>
                        Plataforma Digital Institucional
                    </div>

                    {/* Headline */}
                    <h1 className="text-7xl md:text-9xl font-black text-white mb-10 tracking-tighter leading-[0.85] drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                        Tu Salud en <br />
                        <span className="italic" style={{
                            background: 'linear-gradient(90deg, #06D6A0, #a7f3d0, #06D6A0)',
                            backgroundSize: '200% auto',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            animation: 'shimmer 4s linear infinite',
                        }}>
                            Buenas Manos
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-white/65 mb-20 max-w-3xl mx-auto leading-relaxed font-medium">
                        Modernizamos la gestión médica de MINPPAL para ofrecerte rapidez y calidad en cada consulta.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-6 justify-center mb-40">
                        <Link
                            href="/login"
                            className="group relative px-14 py-5 text-white rounded-3xl text-xl font-black overflow-hidden shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_50px_rgba(6,214,160,0.5)]"
                            style={{ backgroundColor: '#06D6A0' }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            <span className="relative z-10">Soy Paciente</span>
                        </Link>
                        <Link
                            href="/login"
                            className="px-14 py-5 text-white border border-white/15 rounded-3xl text-xl font-black backdrop-blur-2xl hover:-translate-y-2 hover:border-white/35 hover:bg-white/10 transition-all duration-300 shadow-2xl"
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                        >
                            Soy Médico
                        </Link>
                    </div>

                    {/* Feature Cards */}
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { emoji: '🩺', title: 'Especialistas', desc: 'Atención profesional garantizada para todos nuestros trabajadores.', accent: 'rgba(59,130,246,0.15)' },
                            { emoji: '📅', title: 'Citas Rápidas', desc: 'Sin colas ni esperas; agenda tu consulta desde cualquier lugar.', accent: 'rgba(6,214,160,0.15)' },
                            { emoji: '📋', title: 'Historial Único', desc: 'Acceso seguro a tu información clínica en tiempo real.', accent: 'rgba(168,85,247,0.15)' },
                        ].map((f, i) => (
                            <div key={i} className="group relative">
                                <div
                                    className="relative p-8 rounded-3xl border border-white/8 backdrop-blur-2xl hover:border-white/20 transition-all duration-500 hover:-translate-y-3 shadow-2xl overflow-hidden"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                                >
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                                        style={{ background: `radial-gradient(circle at 50% 0%, ${f.accent}, transparent 70%)` }}
                                    />
                                    <div className="w-18 h-18 rounded-2xl flex items-center justify-center text-5xl mb-6 mx-auto group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                                        {f.emoji}
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-3 tracking-tight group-hover:text-accent transition-colors">{f.title}</h3>
                                    <p className="text-white/45 leading-relaxed text-sm">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* ── FOOTER ── */}
            <footer className="relative z-10 border-t border-white/8" style={{ backgroundColor: 'rgba(2,7,20,0.95)' }}>
                <div className="container mx-auto px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center gap-3">
                            <img
                                src="https://images.pexels.com/photos/37340896/pexels-photo-37340896.png"
                                className="w-10 h-10 object-cover rounded-xl border border-white/10"
                                alt=""
                            />
                            <span className="text-white font-black tracking-tight text-xl uppercase">SERVIMED MINPPAL</span>
                        </div>
                        <p className="text-white/30 text-sm max-w-xs leading-relaxed">
                            Tecnología al servicio de la salud de la familia MINPPAL.
                        </p>
                        <div className="pt-6 border-t border-white/8 w-full text-white/20 text-[10px] uppercase tracking-[0.4em] font-bold">
                            &copy; 2026 Ministerio del Poder Popular para la Alimentación
                        </div>
                    </div>
                </div>
            </footer>

            <style jsx global>{`
                @keyframes shimmer {
                    0% { background-position: 0% center; }
                    100% { background-position: 200% center; }
                }
            `}</style>
        </div>
    );
}
