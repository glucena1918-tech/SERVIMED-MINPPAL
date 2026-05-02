'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const BG_IMAGES = [
    '/images/hero-slide-1.jpeg',
    '/images/hero-slide-2.jpeg',
    '/images/hero-slide-3.jpeg',
    '/images/hero-slide-4.jpeg',
    '/images/hero-slide-5.jpeg',
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

            <Header />

            {/* ── HERO ── */}
            <main className="relative container mx-auto px-6 pt-64 pb-32 z-10">
                <div
                    className="max-w-5xl mx-auto text-center"
                    style={{ transform: `translateY(-${scrollY * 0.08}px)` }}
                >
                    {/* Badge */}
                    <div className="inline-flex items-center gap-3 mb-10 px-6 py-2.5 rounded-full border border-white/20 backdrop-blur-2xl text-white text-[11px] font-black tracking-[0.3em] uppercase shadow-lg"
                        style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
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
                    <div className="flex flex-col sm:flex-row gap-6 justify-center mb-10">
                        <Link
                            href="/login"
                            className="group relative px-14 py-5 text-white rounded-3xl text-xl font-black overflow-hidden shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_50px_rgba(28,38,236,0.5)]"
                            style={{ backgroundColor: '#1C26EC' }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            <span className="relative z-10">Soy Paciente</span>
                        </Link>
                        <Link
                            href="/login"
                            className="px-14 py-5 text-[#020714] border border-[#15F0EB]/20 rounded-3xl text-xl font-black backdrop-blur-2xl hover:-translate-y-2 hover:shadow-[0_0_50_rgba(21,240,235,0.4)] transition-all duration-300 shadow-2xl"
                            style={{ backgroundColor: '#15F0EB' }}
                        >
                            Soy Médico
                        </Link>
                    </div>

                    <div className="mb-40">
                        <p className="text-white/40 text-sm font-black uppercase tracking-[0.3em]">
                            ¿Eres nuevo en la plataforma? <Link href="/register" className="text-accent hover:text-white transition-colors underline underline-offset-8 decoration-accent/30">Crea tu cuenta aquí</Link>
                        </p>
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
                    
                    <div className="mt-48 mb-12 animate-fade-in-up">
                        <h2 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-[1.1] drop-shadow-2xl">
                            Donde cada paciente <br />
                            <span className="relative" style={{ 
                                background: 'linear-gradient(90deg, #15F0EB, #06D6A0, #15F0EB)',
                                backgroundSize: '200% auto',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                animation: 'shimmer 5s linear infinite',
                            }}>
                                importa de verdad.
                                <span className="absolute -bottom-2 left-0 right-0 h-1.5 bg-accent/30 blur-xl rounded-full" />
                            </span>
                        </h2>
                        <div className="relative inline-block mt-4">
                            <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full opacity-50" />
                            <p className="relative text-xl md:text-2xl text-white/60 max-w-3xl mx-auto font-medium italic tracking-wide">
                                "Creamos una forma más humana de gestionar la atención médica."
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            
            <Footer />

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes shimmer {
                    0% { background-position: 0% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 1.2s ease-out forwards;
                }
            `.replace(/\n/g, '') }} />
        </div>
    );
}
