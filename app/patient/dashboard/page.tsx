'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';

export default function PatientDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [patientData, setPatientData] = useState<any>(null);
    const [nextAppointment, setNextAppointment] = useState<any>(null);
    const [labCount, setLabCount] = useState(0);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                // Usar getSession para evitar bloqueos de LockManager en navegadores
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) { router.push('/login'); return; }
                const user = session.user;

                // Cargar perfil
                const { data: patient, error: pError } = await supabase
                    .from('patients')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (pError) throw pError;
                if (!patient) return; 
                setPatientData(patient);

                // Cargar próxima cita (pendiente o confirmada)
                const tzOffset = (new Date()).getTimezoneOffset() * 60000;
                const today = new Date(Date.now() - tzOffset).toISOString().split('T')[0];
                const { data: appointment, error: aError } = await (supabase as any)
                    .from('appointments')
                    .select('*, doctors(full_name, specialty)')
                    .eq('patient_id', (patient as any).id)
                    .in('status', ['pending', 'confirmed'])
                    .gte('appointment_date', today)
                    .order('appointment_date', { ascending: true })
                    .order('appointment_time', { ascending: true })
                    .limit(1)
                    .single();

                if (!aError && appointment) {
                    setNextAppointment(appointment);
                }

                // Cargar conteo de resultados de laboratorio completados
                const { count: labCount } = await supabase
                    .from('laboratory_orders')
                    .select('*', { count: 'exact', head: true })
                    .eq('patient_id', (patient as any).id)
                    .eq('status', 'completado');
                
                // @ts-ignore
                setLabCount(labCount || 0);
            } catch (error) {
                console.error('Error al cargar datos del dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        loadDashboardData();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0a2463 0%, #020714 100%)' }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-14 w-14 border-2 border-transparent mx-auto mb-4"
                        style={{ borderTopColor: '#06D6A0', borderRightColor: '#06D6A0' }} />
                    <p className="text-white/60 text-sm font-medium tracking-wider uppercase">Cargando portal...</p>
                </div>
            </div>
        );
    }

    const firstName = patientData?.full_name?.split(' ')[0] || 'Paciente';
    const initials = patientData?.full_name
        ? patientData.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')
        : 'P';

    return (
        <div className="min-h-screen" style={{ background: '#f0f4f8' }}>

            {/* ── HERO BANNER ── */}
            <div className="relative h-72 overflow-hidden">
                {/* Imagen de fondo */}
                <Image
                    src="/images/bg-patient-dashboard.jpeg"
                    alt="Portal médico"
                    fill
                    style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
                    priority
                />
                {/* Overlay degradado */}
                <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(135deg, rgba(10,36,99,0.55) 0%, rgba(2,7,20,0.40) 100%)' }} />

                {/* Navbar flotante dentro del hero */}
                <div className="absolute top-0 left-0 right-0 z-20">
                    <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                        {/* Logo + nombre */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm"
                                style={{ background: 'linear-gradient(135deg, #06D6A0, #059669)', color: '#fff', boxShadow: '0 0 20px rgba(6,214,160,0.4)' }}>
                                {initials}
                            </div>
                            <div>
                                <p className="text-white font-bold text-base leading-tight">Portal del Paciente</p>
                                <p className="text-white/60 text-xs">Bienvenido, {patientData?.full_name || 'Paciente'}</p>
                            </div>
                        </div>

                        {/* Botón cerrar sesión */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white/80 hover:text-white border transition-all duration-200 hover:bg-white/10"
                            style={{ borderColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Cerrar Sesión
                        </button>
                    </div>
                </div>

                {/* Saludo principal */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-4" style={{ paddingTop: '56px' }}>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] mb-2"
                        style={{ color: '#06D6A0' }}>
                        ● Sistema de Salud Institucional MINPPAL
                    </p>
                    <h1 className="text-3xl md:text-4xl font-black text-white mb-2 drop-shadow-lg">
                        Hola, {firstName} 👋
                    </h1>
                    <p className="text-white/60 text-sm max-w-md">
                        Tu salud es nuestra prioridad. Gestiona tus citas e historial desde aquí.
                    </p>
                </div>

                {/* Ola inferior */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-10">
                        <path d="M0,60 C360,0 1080,0 1440,60 L1440,60 L0,60 Z" fill="#f0f4f8" />
                    </svg>
                </div>
            </div>

            {/* ── CONTENIDO PRINCIPAL ── */}
            <main className="max-w-6xl mx-auto px-6 -mt-16 pb-16 relative z-30">

                {/* ── TARJETA DE PRÓXIMOS PASOS (Floating Card) ── */}
                <div className="mb-10 group">
                    <div className="rainbow-border-container shadow-[0_20px_50px_rgba(10,36,99,0.15)] transition-all duration-500 hover:shadow-[0_30px_60px_rgba(10,36,99,0.25)]">
                        {/* La viga de luz arcoiris giratoria */}
                        <div className="rainbow-border-beam" />
                        
                        <div className="rainbow-border-content relative overflow-hidden">
                            {/* Decoración de fondo interna */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#06D6A0]/5 blur-3xl rounded-full -mr-20 -mt-20 group-hover:bg-[#06D6A0]/10 transition-all duration-700" />
                            
                            <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="flex items-center gap-6 text-center md:text-left">
                                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#06D6A0] to-[#059669] flex items-center justify-center text-4xl shadow-xl shadow-[#06D6A0]/30 animate-bounce-slow">
                                        🗓️
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-[#0a2463] tracking-tighter mb-1">
                                            ¡Buenos días, {firstName}!
                                        </h2>
                                        <div className="text-gray-500 font-medium text-lg">
                                            {nextAppointment ? (
                                                <>
                                                    Tu próxima cita es con el <span className="text-[#06D6A0] font-bold">Dr. {nextAppointment.doctors?.full_name?.split(' ').pop()}</span>
                                                    <span className="flex items-center flex-wrap gap-2 text-sm text-gray-400 mt-1 uppercase tracking-widest font-black">
                                                        <span>{new Date(nextAppointment.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                                        <span className="text-gray-300">|</span>
                                                        <span className="text-[#06D6A0] bg-[#06D6A0]/10 border border-[#06D6A0]/20 px-2 py-0.5 rounded-lg shadow-sm">
                                                            ⏰ {nextAppointment.appointment_time?.slice(0, 5)}
                                                        </span>
                                                    </span>
                                                </>
                                            ) : (
                                                "No tienes citas programadas para los próximos días."
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {nextAppointment ? (
                                    <button 
                                        onClick={() => router.push('/patient/appointments')}
                                        className="px-8 py-4 rounded-2xl bg-[#0a2463] text-white font-black tracking-widest uppercase text-xs hover:bg-[#0f3491] transition-all shadow-xl shadow-[#0a2463]/20 active:scale-95"
                                    >
                                        Ver detalles de la cita
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => router.push('/patient/appointments/request')}
                                        className="px-8 py-4 rounded-2xl bg-[#06D6A0] text-[#020714] font-black tracking-widest uppercase text-xs hover:bg-[#059669] transition-all shadow-xl shadow-[#06D6A0]/20 active:scale-95"
                                    >
                                        Solicitar cita ahora
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alerta ficha incompleta - Validación inteligente relaxada */}
                {(!patientData?.date_of_birth || !patientData?.blood_type || 
                  !patientData?.emergency_contact_phone || !patientData?.emergency_contact_name) && (
                    <div className="mb-10 relative overflow-hidden rounded-2xl shadow-xl border border-amber-200 animate-pulse-subtle"
                        style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)' }}>
                        
                        {/* Franja lateral de acento */}
                        <div className="absolute left-0 top-0 bottom-0 w-2"
                            style={{ background: 'linear-gradient(to bottom, #f59e0b, #d97706)' }} />

                        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-5 text-center md:text-left">
                                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center text-3xl shadow-inner border border-amber-500/30">
                                    ⚠️
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-amber-900 uppercase tracking-tight mb-1">
                                        ¡Atención! Ficha Médica Incompleta
                                    </h3>
                                    <p className="text-amber-800 text-sm font-semibold leading-relaxed max-w-xl">
                                        Detectamos que faltan datos vitales (Alergias, Tipo de Sangre o Contactos). 
                                        Llenar tu ficha permite que nuestros médicos te brinden una atención <span className="underline decoration-amber-600 decoration-2">más segura y efectiva</span>.
                                    </p>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => router.push('/patient/profile')}
                                className="shrink-0 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-600/20"
                                style={{ background: '#d97706', color: '#fff' }}
                            >
                                Completar Ficha Ahora →
                            </button>
                        </div>
                    </div>
                )}

                {/* ── TARJETAS ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Mi Ficha Médica */}
                    <div
                        onClick={() => router.push('/patient/profile')}
                        className="group relative bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1"
                        style={{ boxShadow: '0 4px 24px rgba(10,36,99,0.08)', border: '1px solid rgba(10,36,99,0.08)' }}
                    >
                        {/* Acento superior */}
                        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #06D6A0, #0a2463)' }} />
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                                style={{ background: 'linear-gradient(135deg, #e0f7f0, #b2f0e0)' }}>
                                <span className="text-2xl">👤</span>
                            </div>
                            <h3 className="text-lg font-bold mb-1" style={{ color: '#0a2463' }}>Mi Ficha Médica</h3>
                            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                                Actualiza tus datos personales, alergias y antecedentes clínicos.
                            </p>
                            <span className="inline-flex items-center gap-1 text-sm font-bold transition-colors duration-200"
                                style={{ color: '#06D6A0' }}>
                                Editar ficha
                                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </span>
                        </div>
                    </div>

                    {/* Mis Citas */}
                    <div
                        className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                        style={{
                            background: 'linear-gradient(135deg, #0a2463 0%, #1d4ed8 100%)',
                            boxShadow: '0 8px 32px rgba(10,36,99,0.35)'
                        }}
                    >
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                                style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <span className="text-2xl">📅</span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">Mis Citas</h3>
                            <p className="text-sm text-white/60 mb-5 leading-relaxed">
                                Ver, agendar y gestionar tus citas médicas con especialistas.
                            </p>
                            <div className="flex flex-col gap-2">
                                <Link
                                    href="/patient/appointments/request"
                                    className="text-center py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-[1.02]"
                                    style={{ background: '#06D6A0', color: '#020714', boxShadow: '0 4px 15px rgba(6,214,160,0.35)' }}
                                >
                                    + Solicitar Nueva Cita
                                </Link>
                                <Link
                                    href="/patient/appointments"
                                    className="text-center py-2 text-xs font-semibold text-white/50 hover:text-white transition-colors flex items-center justify-center gap-1"
                                >
                                    📂 Ver historial de citas
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Historial Clínico */}
                    <div
                        onClick={() => router.push('/patient/history')}
                        className="group relative bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1"
                        style={{ boxShadow: '0 4px 24px rgba(10,36,99,0.08)', border: '1px solid rgba(10,36,99,0.08)' }}
                    >
                        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #7c3aed, #06D6A0)' }} />
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                                style={{ background: 'linear-gradient(135deg, #ede9fe, #c4b5fd)' }}>
                                <span className="text-2xl">📋</span>
                            </div>
                            <h3 className="text-lg font-bold mb-1" style={{ color: '#0a2463' }}>Historial Clínico</h3>
                            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                                Accede a todos tus diagnósticos, tratamientos y recetas médicas.
                            </p>
                            <span className="inline-flex items-center gap-1 text-sm font-bold transition-colors duration-200"
                                style={{ color: '#7c3aed' }}>
                                Ver historial
                                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </span>
                        </div>
                    </div>

                    {/* Resultados de Laboratorio */}
                    <div
                        onClick={() => router.push('/patient/laboratory')}
                        className="group relative bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 md:col-span-1"
                        style={{ boxShadow: '0 4px 24px rgba(10,36,99,0.08)', border: '1px solid rgba(10,36,99,0.08)' }}
                    >
                        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #06D6A0, #3b82f6)' }} />
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                                    style={{ background: 'linear-gradient(135deg, #dcfce7, #86efac)' }}>
                                    <span className="text-2xl">🔬</span>
                                </div>
                                {labCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-bounce shadow-lg shadow-red-500/20">
                                        {labCount} NUEVOS
                                    </span>
                                )}
                            </div>
                            <h3 className="text-lg font-bold mb-1" style={{ color: '#0a2463' }}>Laboratorio</h3>
                            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                                Consulta tus resultados de exámenes de sangre, orina y heces.
                            </p>
                            <span className="inline-flex items-center gap-1 text-sm font-bold transition-colors duration-200"
                                style={{ color: '#059669' }}>
                                Ver resultados
                                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </span>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
