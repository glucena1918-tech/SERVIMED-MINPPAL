'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';

export default function DoctorDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [doctorData, setDoctorData] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState<'cedula' | 'name' | 'diagnosis'>('cedula');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Estado para citas
    const [pendingAppointments, setPendingAppointments] = useState<any[]>([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);

    // 🆕 Vista de Agenda (filtro temporal)
    type AgendaView = 'today' | 'week' | 'month';
    const [agendaView, setAgendaView] = useState<AgendaView>('week'); 

    // 🆕 Toggle para mostrar citas completadas
    const [showCompleted, setShowCompleted] = useState(false);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    router.push('/login');
                    return;
                }

                const { data: doctor, error: doctorError } = await supabase
                    .from('doctors')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (doctorError) {
                    console.error('Error cargando perfil de doctor:', doctorError);
                }

                setDoctorData(doctor);

                if (doctor && (doctor as any).id) {
                    const { data: pending } = await supabase
                        .from('appointments')
                        .select(`
                            id, 
                            appointment_date, 
                            appointment_time, 
                            reason, 
                            consultation_type,
                            patient:patient_id (full_name, cedula)
                        `)
                        .eq('doctor_id', (doctor as any).id)
                        .eq('status', 'pending')
                        .order('appointment_date', { ascending: false })
                        .order('appointment_time', { ascending: false });

                    if (pending) setPendingAppointments(pending as any[]);

                    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
                    const today = new Date(Date.now() - tzOffset).toISOString().split('T')[0];
                    const { data: upcoming } = await supabase
                        .from('appointments')
                        .select(`
                            id, 
                            appointment_date, 
                            appointment_time, 
                            reason,
                            consultation_type,
                            status,
                            patient:patient_id (full_name, cedula)
                        `)
                        .eq('doctor_id', (doctor as any).id)
                        .in('status', ['confirmed', 'completed'])
                        .gte('appointment_date', today)
                        .order('appointment_date', { ascending: true })
                        .order('appointment_time', { ascending: true });

                    if (upcoming) setUpcomingAppointments(upcoming as any[]);
                }

            } catch (error) {
                console.error('Error general al cargar datos:', error);
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

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const term = searchTerm.trim();
        if (!term) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            if (searchType === 'cedula') {
                if (/^[VvEepP]-\d+$/.test(term) || /^\d+$/.test(term)) {
                    router.push(`/doctor/patients/${encodeURIComponent(term)}`);
                    return;
                }
            }

            let query = supabase.from('patients').select('id, full_name, cedula, contact_phone');

            if (searchType === 'name') {
                query = query.ilike('full_name', `%${term}%`);
            } else if (searchType === 'cedula') {
                query = query.ilike('cedula', `%${term}%`);
            } else if (searchType === 'diagnosis') {
                const { data: records, error: recError } = await supabase
                    .from('medical_records')
                    .select('patient_id, diagnosis, patient:patient_id(id, full_name, cedula)')
                    .ilike('diagnosis', `%${term}%`);

                if (recError) throw recError;
                
                const uniquePatients = Array.from(new Set((records as any[])?.map(r => r.patient?.id)))
                    .map(id => (records as any[])?.find(r => r.patient?.id === id)?.patient)
                    .filter(p => !!p);
                
                setSearchResults(uniquePatients);
                setIsSearching(false);
                return;
            }

            const { data, error } = await query.limit(10);
            if (error) throw error;
            setSearchResults(data || []);

        } catch (error) {
            console.error('Error en búsqueda:', error);
            toast.error('Error al realizar la búsqueda.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleAppointmentAction = async (id: string, action: 'confirmed' | 'rejected') => {
        try {
            const { error } = await (supabase as any)
                .from('appointments')
                .update({ status: action })
                .eq('id', id);

            if (error) throw error;

            const appointment = pendingAppointments.find(a => a.id === id);
            setPendingAppointments(prev => prev.filter(app => app.id !== id));

            if (action === 'confirmed' && appointment) {
                toast.success('Cita aceptada correctamente.');
                setUpcomingAppointments(prev => [...prev, appointment].sort((a, b) => {
                    const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
                    const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
                    return dateA.getTime() - dateB.getTime();
                }));
            }

        } catch (error: any) {
            console.error('Error actualizando cita:', error);
            toast.error('Error al procesar la solicitud.');
        }
    };

    const formatDateGroup = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return 'Hoy';
        if (date.toDateString() === tomorrow.toDateString()) return 'Mañana';
        return date.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020714] flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
                <p className="mt-6 text-white/40 font-black uppercase tracking-[0.3em] text-[10px]">Iniciando SSIMINPPAL...</p>
            </div>
        );
    }

    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localTodayStr = new Date(Date.now() - tzOffset).toISOString().split('T')[0];

    return (
        <div className="min-h-screen relative overflow-hidden bg-[#020714]">
            {/* 🏥 Fondo Institucional - Alta Nitidez */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <Image
                    src="/images/dashboard-bg.jpeg"
                    alt="Fondo institucional médico"
                    fill
                    priority
                    quality={85}
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgIBAwQDAAAAAAAAAAAAAQIDBAAFESEGEjFBUWFx/8QAFQEBAQAAAAAAAAAAAAAAAAAABAX/xAAZEQACAwEAAAAAAAAAAAAAAAABAgADEUH/2gAMAwEAAhEDEEAPAMZvdU6jYnkki1KzCjuVVWlYAAnYDn4x7/pmiSASAeT5OGYZhVYk2IWcp//Z"
                    className="object-cover scale-105"
                    style={{ 
                        opacity: 0.80,
                        filter: 'contrast(1.1) brightness(0.85) saturate(1.05)'
                    }}
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#020714_85%)] opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#020714]/20 via-transparent to-[#020714]/80" />
            </div>

            {/* Luces Ambientales */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent/15 blur-[140px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[140px]" />
            </div>

            {/* Premium Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5"
                style={{ backgroundColor: 'rgba(2,7,20,0.40)' }}>
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                        <div className="relative group cursor-pointer" onClick={() => router.push('/doctor/profile')}>
                            <div className="absolute -inset-1 bg-gradient-to-r from-accent to-blue-400 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
                            {doctorData?.avatar_url ? (
                                <img
                                    src={doctorData.avatar_url}
                                    alt="Perfil"
                                    className="relative w-14 h-14 rounded-full object-cover border-2 border-white/20 shadow-2xl"
                                />
                            ) : (
                                <div className="relative w-14 h-14 bg-gradient-to-br from-accent to-green-600 rounded-full flex items-center justify-center shadow-2xl border-2 border-white/20">
                                    <span className="text-white font-black text-xl">👨‍⚕️</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-black text-white tracking-tight leading-none drop-shadow-md">
                                    Panel Médico <span className="text-white/50 font-medium">|</span>
                                </h1>
                                <span className="text-accent font-black text-sm uppercase tracking-widest">{doctorData?.specialty}</span>
                            </div>
                            <p className="text-white/60 text-sm font-medium mt-1">
                                {doctorData?.full_name || 'Bienvenido, Doctor'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => router.push('/doctor/profile')}
                            className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-all duration-300"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        <button 
                            onClick={handleLogout} 
                            className="group flex items-center space-x-2 px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all duration-500 shadow-lg shadow-red-500/10 active:scale-95"
                        >
                            <span>Salir</span>
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
                {/* 1. Alerta de Perfil Incompleto (Premium) */}
                {doctorData && (
                    !doctorData.license_number || 
                    !doctorData.phone || 
                    !doctorData.experience_years || 
                    !doctorData.education
                ) && (
                    <div className="relative overflow-hidden rounded-3xl p-4 flex justify-between items-center border border-yellow-500/20 shadow-2xl animate-fade-in"
                        style={{ backgroundColor: 'rgba(234,179,8,0.1)', backdropFilter: 'blur(12px)' }}>
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-xl mr-4 shadow-inner">⚠️</div>
                            <div>
                                <p className="text-yellow-200 font-bold text-sm">Perfil Profesional Incompleto</p>
                                <p className="text-yellow-200/60 text-xs mt-0.5">
                                    Para ser visible y atender pacientes, completa tu experiencia, educación y tarifas.
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => router.push('/doctor/profile')} 
                            className="bg-yellow-500 text-black px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                        >
                            Completar ahora
                        </button>
                    </div>
                )}

                {/* 2. Métricas de Impacto (Analytics) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Pacientes Hoy', value: upcomingAppointments.filter(a => a.appointment_date === localTodayStr && a.status === 'confirmed').length, icon: '📅', color: 'accent' },
                        { label: 'Nuevas Solicitudes', value: pendingAppointments.length, icon: '📩', color: 'blue-400' },
                        { label: 'Total Semana', value: upcomingAppointments.length + pendingAppointments.length, icon: '📈', color: 'purple-400' }
                    ].map((stat, i) => (
                        <div key={i} className="group relative overflow-hidden rounded-3xl p-6 border-2 border-white/15 shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:border-accent/50 hover:shadow-[0_0_30px_rgba(6,214,160,0.15)]"
                            style={{ backgroundColor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)' }}>
                            <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:opacity-60 transition-opacity text-5xl drop-shadow-lg">
                                {stat.icon}
                            </div>
                            <p className="text-white/50 text-xs font-black uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                            <div className="flex items-end gap-3">
                                <h3 className="text-4xl font-black text-white leading-none">{stat.value}</h3>
                                <div className={`h-1.5 w-1.5 rounded-full mb-2 bg-${stat.color}`} />
                            </div>
                            <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full bg-${stat.color} opacity-50 w-2/3`} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* 3. Buscador Spotlight */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-blue-500/20 rounded-[2.5rem] blur opacity-25 group-focus-within:opacity-100 transition duration-1000"></div>
                    <div className="relative bg-white/5 backdrop-blur-2xl rounded-[2rem] p-8 border border-white/10 shadow-2xl">
                        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                            <div className="flex-1 w-full">
                                <h2 className="text-lg font-black text-white mb-6 flex items-center uppercase tracking-widest gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-sm">🔍</span>
                                    Buscador de Pacientes
                                </h2>
                                <form onSubmit={handleSearch} className="space-y-6">
                                    <div className="flex flex-wrap gap-3">
                                        {(['cedula', 'name', 'diagnosis'] as const).map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setSearchType(type)}
                                                className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all border uppercase tracking-widest ${
                                                    searchType === type 
                                                    ? 'bg-accent text-white border-accent shadow-[0_0_20px_rgba(6,214,160,0.4)]' 
                                                    : 'bg-white/5 text-white/40 border-white/10 hover:border-white/30'
                                                }`}
                                            >
                                                {type === 'cedula' ? 'Cédula' : type === 'name' ? 'Nombre' : 'Diagnóstico'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="relative flex-1 group/input">
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder={
                                                    searchType === 'cedula' ? "Ej: V-12345678" :
                                                    searchType === 'name' ? "Nombre completo..." :
                                                    "Síntomas o diagnóstico..."
                                                }
                                                className="w-full bg-white/5 rounded-2xl border border-white/10 focus:border-accent/50 focus:ring-4 focus:ring-accent/10 text-white text-lg px-6 py-4 shadow-inner transition-all placeholder:text-white/20"
                                            />
                                            {isSearching && (
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            type="submit" 
                                            disabled={isSearching}
                                            className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-accent hover:text-white transition-all duration-500 shadow-xl disabled:opacity-50 active:scale-95"
                                        >
                                            {isSearching ? '...' : 'Buscar'}
                                        </button>
                                    </div>

                                    {/* Resultados Flotantes */}
                                    {searchResults.length > 0 && (
                                        <div className="mt-4 bg-[#0a1020]/90 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                                            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                                                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Resultados Encontrados ({searchResults.length})</span>
                                                <button onClick={() => setSearchResults([])} className="text-white/20 hover:text-white transition-colors">✕</button>
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                {searchResults.map(p => (
                                                    <div 
                                                        key={p.id}
                                                        onClick={() => router.push(`/doctor/patients/${p.cedula}`)}
                                                        className="px-6 py-4 hover:bg-white/5 cursor-pointer flex items-center justify-between transition group"
                                                    >
                                                        <div className="flex items-center">
                                                            <div className="w-12 h-12 bg-accent/20 text-accent rounded-2xl flex items-center justify-center font-black mr-4 group-hover:scale-110 transition-transform">
                                                                {p.full_name?.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-white group-hover:text-accent transition-colors">{p.full_name}</p>
                                                                <p className="text-xs text-white/40 font-mono tracking-tighter">C.I. {p.cedula}</p>
                                                            </div>
                                                        </div>
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-accent text-[10px] font-black uppercase tracking-widest border border-accent/30 px-3 py-1 rounded-lg">Ver Ficha</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 4. Columna Izquierda: Solicitudes Pendientes (Premium) */}
                    <div>
                        <h2 className="text-xl font-black text-white mb-6 flex items-center uppercase tracking-widest gap-3">
                            <span className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-lg">📬</span>
                            Solicitudes Pendientes
                            {pendingAppointments.length > 0 && (
                                <span className="bg-accent/20 text-accent text-[10px] px-3 py-1 rounded-full font-black animate-pulse border border-accent/30">
                                    {pendingAppointments.length} NUEVAS
                                </span>
                            )}
                        </h2>

                        {pendingAppointments.length > 0 ? (
                            <div className="space-y-6">
                                {pendingAppointments.map((app) => (
                                    <div key={app.id} className="group relative overflow-hidden rounded-[2rem] p-6 border border-white/10 shadow-2xl transition-all duration-500 hover:-translate-y-1 hover:bg-white/[0.05]"
                                        style={{ backgroundColor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)' }}>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                                                    {app.patient?.full_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-white text-lg tracking-tight leading-none">{app.patient?.full_name}</h3>
                                                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                                                        C.I. {app.patient?.cedula || '--'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase tracking-widest">
                                                Pendiente
                                            </div>
                                        </div>

                                        <div className="mb-6 bg-white/5 p-5 rounded-2xl border border-white/5">
                                            <div className="flex flex-wrap gap-4 mb-4">
                                                <div className="flex items-center gap-2 text-white/80 text-sm font-bold">
                                                    <span className="opacity-50 text-base">📅</span>
                                                    {new Date(app.appointment_date + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'long' })}
                                                </div>
                                                <div className="flex items-center gap-2 text-white/80 text-sm font-bold">
                                                    <span className="opacity-50 text-base">⏰</span>
                                                    {app.appointment_time?.slice(0, 5)}
                                                </div>
                                                {app.consultation_type && (
                                                    <div className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-tighter">
                                                        🩺 {app.consultation_type}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-white/60 text-sm italic leading-relaxed border-l-2 border-accent/40 pl-4">
                                                "{app.reason}"
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => handleAppointmentAction(app.id, 'confirmed')}
                                                className="bg-accent text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-accent/80 transition-all shadow-lg shadow-accent/20 active:scale-95"
                                            >
                                                Aceptar
                                            </button>
                                            <button
                                                onClick={() => handleAppointmentAction(app.id, 'rejected')}
                                                className="bg-white/5 text-red-400 border border-red-400/20 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-400 hover:text-white transition-all active:scale-95"
                                            >
                                                Rechazar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white/5 rounded-[2rem] border border-dashed border-white/10 p-16 text-center backdrop-blur-md">
                                <span className="text-6xl block mb-6 filter grayscale opacity-20">📬</span>
                                <h3 className="font-black text-white/30 text-lg uppercase tracking-widest">Bandeja Vacía</h3>
                                <p className="text-white/20 mt-2 text-sm">No tienes solicitudes pendientes por ahora.</p>
                            </div>
                        )}
                    </div>

                    {/* 5. Columna Derecha: Agenda Programada (Premium) */}
                    <div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <h2 className="text-xl font-black text-white flex items-center uppercase tracking-widest gap-3">
                                <span className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center text-lg">📅</span>
                                Agenda Programada
                            </h2>
                            <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
                                {(['today', 'week', 'month'] as const).map((view) => (
                                    <button
                                        key={view}
                                        onClick={() => setAgendaView(view)}
                                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                            agendaView === view 
                                            ? 'bg-accent text-white shadow-lg' 
                                            : 'text-white/40 hover:text-white'
                                        }`}
                                    >
                                        {view === 'today' ? 'Hoy' : view === 'week' ? 'Semana' : 'Mes'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Toggle de Mostrar Completadas (Estilizado) */}
                        <div className="mb-6 flex justify-end">
                            <label className="group flex items-center gap-3 cursor-pointer select-none">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={showCompleted}
                                        onChange={(e) => setShowCompleted(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-5 bg-white/10 rounded-full peer peer-checked:bg-accent transition-all duration-300 border border-white/10 shadow-inner"></div>
                                    <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-all duration-300 shadow-md"></div>
                                </div>
                                <span className="text-[10px] font-black text-white/40 group-hover:text-white transition-colors uppercase tracking-widest">Ver Completadas</span>
                            </label>
                        </div>

                        {(() => {
                            let filtered = upcomingAppointments;
                            if (!showCompleted) {
                                filtered = filtered.filter(app => app.status !== 'completed');
                            }

                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            const filteredAppointments = filtered.filter(app => {
                                const appDate = new Date(app.appointment_date + 'T12:00:00');
                                appDate.setHours(0, 0, 0, 0);

                                if (agendaView === 'today') {
                                    return appDate.getTime() === today.getTime();
                                } else if (agendaView === 'week') {
                                    const weekLimit = new Date(today);
                                    weekLimit.setDate(weekLimit.getDate() + 7);
                                    return appDate >= today && appDate < weekLimit;
                                } else if (agendaView === 'month') {
                                    const monthLimit = new Date(today);
                                    monthLimit.setDate(monthLimit.getDate() + 30);
                                    return appDate >= today && appDate < monthLimit;
                                }
                                return false;
                            });

                            return filteredAppointments.length > 0 ? (
                                <div className="space-y-4">
                                    {filteredAppointments.map((app, index) => {
                                        const dateGroup = formatDateGroup(app.appointment_date);
                                        const prevApp = filteredAppointments[index - 1];
                                        const showHeader = !prevApp || formatDateGroup(prevApp.appointment_date) !== dateGroup;

                                        return (
                                            <div key={app.id}>
                                                {showHeader && (
                                                    <div className="flex items-center gap-4 mb-4 mt-6 first:mt-0">
                                                        <div className="h-px flex-1 bg-white/10" />
                                                        <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">{dateGroup}</span>
                                                        <div className="h-px flex-1 bg-white/10" />
                                                    </div>
                                                )}
                                                <div
                                                    onClick={() => router.push(`/doctor/patients/${app.patient?.cedula}?appointmentId=${app.id}`)}
                                                    className="group relative overflow-hidden bg-white/[0.02] hover:bg-white/[0.06] backdrop-blur-xl rounded-[1.5rem] p-5 border border-white/5 transition-all duration-500 cursor-pointer flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-center min-w-[80px] bg-[#020714]/60 rounded-2xl p-3 border border-white/10 shadow-xl">
                                                            <p className="font-black text-2xl text-white leading-none">{app.appointment_time?.slice(0, 5)}</p>
                                                            <p className="text-[8px] text-white/30 font-black uppercase tracking-widest mt-2">HORA</p>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-3">
                                                                <h4 className="font-black text-white text-lg tracking-tight">{app.patient?.full_name}</h4>
                                                                {app.status === 'completed' ? (
                                                                    <span className="px-2 py-0.5 rounded-lg bg-accent/20 text-accent text-[8px] font-black uppercase tracking-widest border border-accent/20">Finalizada</span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest border border-blue-500/20">Agendada</span>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col gap-1 mt-2">
                                                                <p className="text-white/40 text-[10px] font-mono tracking-tighter uppercase">C.I. {app.patient?.cedula}</p>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />
                                                                    <span className="text-red-500 font-black text-[11px] uppercase tracking-wider drop-shadow-md">
                                                                        {app.consultation_type || 'CONSULTA POR DEFINIR'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/30 group-hover:bg-accent group-hover:text-white transition-all duration-500 shadow-inner">
                                                            →
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white/5 rounded-[2rem] border border-dashed border-white/10 p-16 text-center opacity-50 backdrop-blur-sm">
                                    <span className="text-6xl block mb-6 opacity-20">📆</span>
                                    <h3 className="font-black text-white/30 text-lg uppercase tracking-widest">Agenda Libre</h3>
                                    <p className="text-white/20 mt-2 text-sm">No hay citas confirmadas para este período.</p>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </main>
        </div>
    );
}
