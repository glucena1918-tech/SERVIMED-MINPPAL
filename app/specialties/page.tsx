'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Doctor {
    id: string;
    full_name: string;
    specialty: string;
    avatar_url: string | null;
    bio: string | null;
}

const SPECIALTY_METADATA: Record<string, { icon: string; description: string; gradient: string }> = {
    'Medicina General': { 
        icon: '🩺', 
        description: 'Atención médica primaria e integral para diagnósticos iniciales y prevención.',
        gradient: 'from-blue-500 to-cyan-400'
    },
    'Cardiología': { 
        icon: '❤️', 
        description: 'Especialistas en el cuidado del corazón y el sistema cardiovascular.',
        gradient: 'from-red-500 to-rose-400'
    },
    'Pediatría': { 
        icon: '👶', 
        description: 'Cuidado especializado para el crecimiento y salud de los más pequeños.',
        gradient: 'from-orange-400 to-yellow-300'
    },
    'Ginecología': { 
        icon: '🤰', 
        description: 'Salud integral de la mujer en todas sus etapas.',
        gradient: 'from-pink-500 to-purple-400'
    },
    'Dermatología': { 
        icon: '🧴', 
        description: 'Expertos en salud de la piel, cabello y uñas.',
        gradient: 'from-teal-500 to-emerald-400'
    },
    'Traumatología': { 
        icon: '🦴', 
        description: 'Especialistas en lesiones óseas y del sistema musculoesquelético.',
        gradient: 'from-slate-600 to-gray-400'
    },
    'Oftalmología': { 
        icon: '👁️', 
        description: 'Cuidado y cirugía para la salud visual.',
        gradient: 'from-indigo-500 to-blue-400'
    },
    'Psicología': { 
        icon: '🧠', 
        description: 'Apoyo profesional para el bienestar mental y emocional.',
        gradient: 'from-violet-500 to-purple-500'
    },
    'Nutrición': { 
        icon: '🥗', 
        description: 'Asesoría para una alimentación equilibrada y saludable.',
        gradient: 'from-green-500 to-lime-400'
    },
    'Odontología': { 
        icon: '🦷', 
        description: 'Salud bucal completa y estética dental.',
        gradient: 'from-cyan-500 to-blue-400'
    },
    'Medicina Interna': { 
        icon: '📋', 
        description: 'Diagnóstico y tratamiento de enfermedades complejas en adultos.',
        gradient: 'from-blue-600 to-indigo-500'
    }
};

export default function SpecialtiesPage() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDoctors() {
            const { data, error } = await supabase
                .from('doctors')
                .select('id, full_name, specialty, avatar_url, bio')
                .eq('is_active', true);
            
            if (error) {
                console.error('Error fetching doctors:', error);
            } else {
                setDoctors(data || []);
            }
            setLoading(false);
        }
        fetchDoctors();
    }, []);

    // Agrupar doctores por especialidad
    const specialties = Array.from(new Set(doctors.map(d => d.specialty))).sort();

    return (
        <div className="min-h-screen bg-[#050b1a] text-white selection:bg-accent/30 selection:text-white">
            {/* ── BACKGROUND IMAGE WITH OVERLAY ── */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <img 
                    src="/images/bg-specialties.jpeg"
                    alt=""
                    className="w-full h-full object-cover opacity-84 scale-100 transition-opacity duration-1000"
                    style={{ filter: 'brightness(65%) contrast(110%)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#050b1a]/30 via-[#050b1a]/60 to-[#050b1a]/80" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,214,160,0.12)_0%,transparent_70%)]" />
            </div>

            <Header />
            
            {/* ── HEADER / HERO ── */}
            <div className="relative pt-48 pb-40 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px] animate-pulse" />
                    <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-3 mb-8 px-5 py-2 rounded-full border border-white/10 bg-[#050b1a]/40 backdrop-blur-md text-[10px] font-black tracking-[0.3em] uppercase text-white/50 shadow-2xl">
                        <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                        Nuestro Cuerpo Médico
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                        Excelencia en <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-accent to-blue-400 bg-[length:200%_auto] animate-shimmer">Atención Médica</span>
                    </h1>
                    <p className="text-white/70 text-xl max-w-3xl mx-auto leading-relaxed font-medium italic drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">
                        "Uniendo tecnología y humanidad para el bienestar de cada trabajador."
                    </p>
                </div>
            </div>

            {/* ── LISTADO DE ESPECIALIDADES ── */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 -mt-20 pb-32">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="w-16 h-16 border-4 border-accent/10 border-t-accent rounded-full animate-spin mb-6" />
                        <p className="text-white/30 font-medium tracking-widest uppercase text-xs animate-pulse">Consultando especialistas...</p>
                    </div>
                ) : specialties.length > 0 ? (
                    <div className="space-y-32">
                        {specialties.map((spec) => {
                            const meta = SPECIALTY_METADATA[spec] || { 
                                icon: '👨‍⚕️', 
                                description: 'Atención especializada de calidad.',
                                gradient: 'from-gray-500 to-gray-400'
                            };
                            const specDoctors = doctors.filter(d => d.specialty === spec);

                            return (
                                <section key={spec} className="scroll-mt-32 animate-fade-in-up">
                                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
                                        <div className="max-w-2xl">
                                            <div className="flex items-center gap-5 mb-4">
                                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-4xl shadow-inner">
                                                    {meta.icon}
                                                </div>
                                                <h2 className="text-4xl font-black tracking-tight text-white">{spec}</h2>
                                            </div>
                                            <p className="text-white/40 text-lg leading-relaxed font-medium">
                                                {meta.description}
                                            </p>
                                        </div>
                                        <div className="h-px flex-grow mx-8 bg-gradient-to-r from-transparent via-white/5 to-transparent hidden xl:block" />
                                        <div className="inline-flex items-center gap-2 text-accent/80 text-[10px] font-black uppercase tracking-[0.2em] bg-accent/5 px-5 py-2.5 rounded-full border border-accent/10 backdrop-blur-md">
                                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                            {specDoctors.length} {specDoctors.length === 1 ? 'Especialista' : 'Especialistas'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {specDoctors.map((doc, idx) => (
                                            <div 
                                                key={doc.id} 
                                                className="group relative bg-[#0a1124]/40 backdrop-blur-3xl border-2 border-white/5 rounded-[2.5rem] p-8 hover:border-accent/40 transition-all duration-700 hover:-translate-y-3 hover:shadow-[0_40px_80px_rgba(0,0,0,0.5)] animate-fade-in-up shadow-2xl"
                                                style={{ animationDelay: `${idx * 250}ms` }}
                                            >
                                                {/* Card Background Glow (Subtle) */}
                                                <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-1000 rounded-[2.5rem]`} />
                                                
                                                <div className="relative z-10 flex flex-col items-center text-center">
                                                    {/* Avatar container */}
                                                    <div className="relative mb-8">
                                                        <div className={`absolute -inset-4 bg-gradient-to-br ${meta.gradient} rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-700`} />
                                                        <div className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-br from-white/20 to-transparent">
                                                            {doc.avatar_url ? (
                                                                <img 
                                                                    src={doc.avatar_url} 
                                                                    alt={doc.full_name} 
                                                                    className="w-full h-full rounded-full object-cover border-4 border-[#0a1124]"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full rounded-full bg-[#16203a] flex items-center justify-center text-4xl font-black text-white/20 border-4 border-[#0a1124]">
                                                                    {doc.full_name.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* Online indicator */}
                                                        <div className="absolute bottom-1 right-2 w-6 h-6 bg-[#0a1124] rounded-full flex items-center justify-center">
                                                            <div className="w-3 h-3 bg-accent rounded-full shadow-[0_0_10px_#06D6A0]" />
                                                        </div>
                                                    </div>

                                                    <h3 className="text-2xl font-black mb-2 tracking-tight text-white group-hover:text-accent transition-colors duration-500">{doc.full_name}</h3>
                                                    <div className="w-12 h-1 bg-accent/20 rounded-full mb-6 group-hover:w-20 group-hover:bg-accent/40 transition-all duration-500" />
                                                    
                                                    <p className="text-white/40 text-[13px] leading-relaxed mb-10 h-10 line-clamp-2 font-medium italic">
                                                        "{doc.bio || 'Profesional de la salud dedicado a brindar una atención integral y humana a cada paciente.'}"
                                                    </p>

                                                    <Link 
                                                        href={`/patient/appointments/request?doctor_id=${doc.id}`}
                                                        className="w-full py-5 bg-white/5 hover:bg-accent text-white font-black rounded-[1.5rem] border border-white/5 hover:border-accent shadow-lg hover:shadow-accent/20 transition-all duration-500 flex items-center justify-center gap-3 group/btn relative overflow-hidden"
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                                                        <span className="relative z-10 text-xs uppercase tracking-widest">Agendar Cita</span>
                                                        <span className="relative z-10 group-hover/btn:translate-x-2 transition-transform duration-500">→</span>
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white/5 rounded-[3rem] border border-white/5 backdrop-blur-2xl">
                        <div className="text-7xl mb-8 animate-bounce">🔍</div>
                        <h2 className="text-3xl font-black mb-4">Aún no hay especialistas registrados</h2>
                        <p className="text-white/30 max-w-md mx-auto text-lg leading-relaxed">Estamos trabajando para incorporar a los mejores profesionales en esta área. Vuelve pronto.</p>
                    </div>
                )}
            </main>

            <Footer />
            
            <style jsx global>{`
                @keyframes shimmer {
                    0% { background-position: 0% center; }
                    100% { background-position: 200% center; }
                }
                .animate-shimmer {
                    animation: shimmer 5s linear infinite;
                }
                @keyframes fadeInUp {
                    from { 
                        opacity: 0; 
                        transform: translateY(100px) scale(0.95) rotateX(10deg); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0) scale(1) rotateX(0); 
                    }
                }
                .animate-fade-in-up {
                    opacity: 0;
                    animation: fadeInUp 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
