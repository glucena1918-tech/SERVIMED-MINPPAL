"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function HelpPage() {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <main className="min-h-screen bg-[#292358] selection:bg-accent/30 selection:text-white relative">
            {/* Background Image with Parallax & Overlay */}
            <div className="fixed inset-0 z-0">
                <img 
                    src="/images/bg-help.jpeg" 
                    alt="Background" 
                    className="w-full h-full object-cover scale-110"
                    style={{ 
                        opacity: 0.82,
                        transform: `translateY(${scrollY * 0.1}px)` 
                    }}
                />
                <div className="absolute inset-0" 
                     style={{
                        background: 'linear-gradient(to bottom, rgba(41,35,88,0.50) 0%, rgba(41,35,88,0.15) 35%, rgba(41,35,88,0.15) 65%, rgba(41,35,88,0.80) 100%)'
                     }} 
                />
            </div>

            {/* Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-1">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#0F75C1]/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#1C26EC]/15 blur-[100px] rounded-full" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 w-full bg-[#292358]/40 backdrop-blur-2xl border-b border-white/10">
                <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center space-x-4 group">
                        <div className="relative w-12 h-12 overflow-hidden rounded-xl border-2 border-[#0F75C1]/40 group-hover:border-[#0F75C1] transition-all duration-500 shadow-xl shadow-[#0F75C1]/20 bg-white/10 backdrop-blur-md">
                            <img
                                src="/images/logo-minppal.png"
                                alt="Logo SSI MINPPAL"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                        </div>
                        <div className="flex flex-col -space-y-1">
                            <span className="text-white font-black text-xl tracking-tight leading-none drop-shadow-md">
                                <span className="text-[#0F75C1]">Sistema de Salud</span> <br />
                                Institucional <span className="text-white/80">MINPPAL</span>
                            </span>
                        </div>
                    </Link>
                    <Link href="/" className="text-white/80 hover:text-white font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-2 group bg-white/5 px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/10 backdrop-blur-md">
                        <span className="group-hover:-translate-x-1 transition-transform duration-300">←</span>
                        <span>Volver al Inicio</span>
                    </Link>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="relative pt-24 pb-16 container mx-auto px-6 text-center z-10">
                <div className="inline-flex items-center gap-3 mb-8 px-6 py-2.5 rounded-full border border-white/20 backdrop-blur-3xl text-white text-[11px] font-black tracking-[0.3em] uppercase shadow-2xl bg-white/10 animate-bounce-subtle">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    Centro de Soporte Digital
                </div>
                <h1 className="text-6xl md:text-8xl font-black text-white mb-8 leading-tight tracking-tighter drop-shadow-2xl">
                    Centro de <span className="text-[#0F75C1]">Ayuda</span>
                </h1>
                <p className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto font-medium leading-relaxed drop-shadow-md">
                    Descubre cómo maximizar el uso de nuestra plataforma institucional. 
                    <span className="block mt-2 text-white/40 text-lg italic">Guía interactiva paso a paso para el personal y beneficiarios.</span>
                </p>
            </section>

            {/* Content Section */}
            <section className="container mx-auto px-6 pb-32 relative z-10">
                <div className="grid lg:grid-cols-2 gap-10">
                    
                    {/* Patient Guide */}
                    <div className="space-y-8 animate-in fade-in slide-in-from-left duration-1000">
                        <div className="flex items-center gap-5 p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md inline-flex">
                            <div className="w-16 h-16 rounded-2xl bg-[#1C26EC] flex items-center justify-center text-4xl shadow-2xl shadow-[#1C26EC]/40">
                                👤
                            </div>
                            <div>
                                <h2 className="text-4xl font-black text-white tracking-tighter">Para el <span className="text-[#1C26EC]">Paciente</span></h2>
                                <p className="text-[#1C26EC] text-xs font-black uppercase tracking-widest opacity-80">Gestión de Salud Personal</p>
                            </div>
                        </div>
                        
                        <div className="space-y-5">
                            {[
                                { title: "Registro e Inicio", desc: "Haz clic en 'Soy Paciente' en la pantalla principal. Crea tu cuenta con datos básicos o inicia sesión si ya eres usuario registrado." },
                                { title: "Completar Perfil", desc: "En la sección 'Mi Perfil', completa tus datos demográficos. Es vital que el médico tenga tu información actualizada antes de la cita." },
                                { title: "Agendar Cita", desc: "Ve a 'Solicitar Cita', elige la especialidad y el médico de tu preferencia. Selecciona el horario disponible y confirma la solicitud." },
                                { title: "Consulta y Seguimiento", desc: "Acude en el horario acordado. Puedes monitorear el estado de tu cita (Pendiente, Confirmada o Completada) en tu Dashboard." },
                                { title: "Descargar Documentos", desc: "Al finalizar la consulta, accede a 'Mi Historial' para descargar tu Informe Médico, Receta y Constancia en formato PDF oficial." }
                            ].map((step, i) => (
                                <div key={i} className="group relative p-8 rounded-[40px] bg-white/[0.03] border border-white/10 backdrop-blur-md hover:bg-white/[0.08] transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-[#1C26EC]/10">
                                    <div className="flex gap-8">
                                        <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white text-xl font-black border border-white/10 group-hover:bg-[#1C26EC] group-hover:border-[#1C26EC] group-hover:shadow-[0_0_30px_rgba(28,38,236,0.5)] transition-all duration-500">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold text-2xl mb-2 group-hover:translate-x-1 transition-transform duration-300">{step.title}</h3>
                                            <p className="text-white/50 leading-relaxed font-medium text-lg">{step.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Doctor Guide */}
                    <div className="space-y-8 animate-in fade-in slide-in-from-right duration-1000">
                        <div className="flex items-center gap-5 p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md inline-flex">
                            <div className="w-16 h-16 rounded-2xl bg-[#15F0EB] flex items-center justify-center text-4xl shadow-2xl shadow-[#15F0EB]/40">
                                🩺
                            </div>
                            <div>
                                <h2 className="text-4xl font-black text-white tracking-tighter">Para el <span className="text-[#15F0EB]">Médico</span></h2>
                                <p className="text-[#15F0EB] text-xs font-black uppercase tracking-widest opacity-80">Gestión Profesional</p>
                            </div>
                        </div>
                        
                        <div className="space-y-5">
                            {[
                                { title: "Acceso Profesional", desc: "Selecciona 'Soy Médico' e ingresa con tus credenciales. Al registrarte, debes completar tu Perfil Profesional incluyendo tus Datos y Horario de Atención para ser visible." },
                                { title: "Gestión de Agenda", desc: "En tu Dashboard verás las solicitudes entrantes. Debes 'Confirmar' las citas para asegurar el espacio y notificar al paciente." },
                                { title: "Atención al Paciente", desc: "Durante la consulta, abre la cita confirmada para llenar la Historia Clínica electrónica (Diagnóstico, Tratamiento y Reposo)." },
                                { title: "Finalizar Registro", desc: "Haz clic en 'Guardar Historia'. El sistema actualizará automáticamente el estado de la cita a 'Completada' de forma inmediata." },
                                { title: "Emisión de Formatos", desc: "Al guardar, el sistema genera automáticamente los 3 formatos institucionales (Informe, Receta y Constancia) con tu firma digital." }
                            ].map((step, i) => (
                                <div key={i} className="group relative p-8 rounded-[40px] bg-white/[0.03] border border-white/10 backdrop-blur-md hover:bg-white/[0.08] transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-[#15F0EB]/10">
                                    <div className="flex gap-8">
                                        <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white text-xl font-black border border-white/10 group-hover:bg-[#15F0EB] group-hover:border-[#15F0EB] group-hover:text-[#292358] group-hover:shadow-[0_0_30px_rgba(21,240,235,0.5)] transition-all duration-500">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold text-2xl mb-2 group-hover:translate-x-1 transition-transform duration-300">{step.title}</h3>
                                            <p className="text-white/50 leading-relaxed font-medium text-lg">{step.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </section>

            {/* Support Contact Section */}
            <section className="container mx-auto px-6 py-20 relative z-10">
                <div className="max-w-4xl mx-auto p-16 rounded-[60px] bg-white/5 border border-white/10 backdrop-blur-2xl relative overflow-hidden group shadow-3xl text-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#0F75C1]/10 blur-3xl rounded-full -mr-20 -mt-20 group-hover:bg-[#0F75C1]/20 transition-all duration-700" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#1C26EC]/10 blur-3xl rounded-full -ml-20 -mb-20 group-hover:bg-[#1C26EC]/20 transition-all duration-700" />
                    
                    <h2 className="text-4xl font-black text-white mb-6 tracking-tighter">¿Necesitas ayuda adicional?</h2>
                    <p className="text-xl text-white/60 mb-10 font-medium max-w-2xl mx-auto leading-relaxed">
                        Si experimentas inconvenientes técnicos, problemas de acceso o tienes dudas sobre tus permisos, contacta directamente a la <span className="text-[#0F75C1] font-black underline underline-offset-8 decoration-accent/30">Gerencia General de Gestión Humana</span>.
                    </p>
                    <div className="inline-flex items-center gap-4 px-10 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black tracking-[0.2em] uppercase text-xs shadow-inner">
                        Sede Única Institucional MINPPAL
                    </div>
                </div>
            </section>

            {/* Official Footer */}
            <footer className="relative z-10 border-t border-white/8" style={{ backgroundColor: 'rgba(2,7,20,0.95)' }}>
                <div className="container mx-auto px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center gap-3">
                            <img
                                src="/images/logo-minppal.png"
                                className="w-10 h-10 object-cover rounded-xl border border-white/10"
                                alt="Logo SSI MINPPAL"
                            />
                            <span className="text-white font-black tracking-tight text-xl uppercase">Sistema de Salud Institucional MINPPAL</span>
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
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 3s ease-in-out infinite;
                }
            `}</style>
        </main>
    );
}
