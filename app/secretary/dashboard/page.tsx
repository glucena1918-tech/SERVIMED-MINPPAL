'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function SecretaryDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [stats, setStats] = useState({
        today: 0,
        pending: 0,
        completed: 0,
        totalPatients: 0
    });

    const [filterDoctor, setFilterDoctor] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [timeFilter, setTimeFilter] = useState('today'); // DEFAULT TO TODAY
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Modal States
    const [isAppModalOpen, setIsAppModalOpen] = useState(false);
    const [isRegPatientModalOpen, setIsRegPatientModalOpen] = useState(false);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    
    // Reschedule Form
    const [rescheduleData, setRescheduleData] = useState({
        appointment_date: '',
        appointment_time: ''
    });

    // New Patient Form
    const [patientForm, setPatientForm] = useState({
        full_name: '',
        cedula: '',
        contact_phone: '',
        date_of_birth: '',
        gender: 'male',
        agency: 'Invitado'
    });

    // New Appointment Form
    const [formData, setFormData] = useState({
        patient_id: '',
        doctor_id: '',
        appointment_date: '',
        appointment_time: '',
        reason: ''
    });

    // Patient Search State
    const [patientSearch, setPatientSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login/secretary');
                    return;
                }

                // VALIDACIÓN DE SEGURIDAD: ¿Es una secretaria autorizada o el Admin?
                const isAdmin = user.email === 'goldengrovessoul@gmail.com';
                
                if (!isAdmin) {
                    const { data: secData, error: secError } = await (supabase as any)
                        .from('secretaries')
                        .select('id, status')
                        .ilike('email', user.email)
                        .single();

                    if (secError || !secData || secData.status !== 'active') {
                        console.error('Acceso no autorizado a Dashboard de Secretaría');
                        await supabase.auth.signOut();
                        router.push('/login/secretary');
                        return;
                    }
                }

                await loadData();
            } catch (error) {
                console.error('Auth error:', error);
                router.push('/login/secretary');
            }
        };
        checkAuth();
    }, [router]);

    // Search patients in real-time
    useEffect(() => {
        const searchPatients = async () => {
            if (patientSearch.length < 3) {
                setSearchResults([]);
                return;
            }
            const { data } = await (supabase as any)
                .from('patients')
                .select('id, full_name, cedula')
                .or(`full_name.ilike.%${patientSearch}%,cedula.ilike.%${patientSearch}%`)
                .limit(5);
            setSearchResults(data || []);
        };
        const timer = setTimeout(searchPatients, 300);
        return () => clearTimeout(timer);
    }, [patientSearch]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [
                { data: appData, error: appError },
                { data: docData },
                { count: patCount }
            ] = await Promise.all([
                (supabase as any).from('appointments').select(`
                    *,
                    patients (
                        id,
                        full_name,
                        cedula,
                        contact_phone,
                        agency
                    ),
                    doctors (
                        id,
                        full_name,
                        specialty
                    )
                `).order('appointment_date', { ascending: true }),
                (supabase as any).from('doctors').select('id, full_name, specialty').eq('is_active', true),
                (supabase as any).from('patients').select('*', { count: 'exact', head: true })
            ]);

            if (appError) console.error('App Error:', appError);

            setAppointments(appData || []);
            setDoctors(docData || []);
            
            // Initial stats (global)
            updateStats(appData || [], patCount || 0);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReschedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedApp || !rescheduleData.appointment_date || !rescheduleData.appointment_time) return;

        setIsSubmitting(true);
        try {
            const { error } = await (supabase as any)
                .from('appointments')
                .update({
                    appointment_date: rescheduleData.appointment_date,
                    appointment_time: rescheduleData.appointment_time,
                    status: 'pending' // Reset to pending when rescheduled
                })
                .eq('id', selectedApp.id);

            if (error) throw error;
            toast.success('Cita reagendada con éxito');
            setIsRescheduleModalOpen(false);
            loadData();
        } catch (error) {
            toast.error('Error al reagendar');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelAppointment = async (id: string) => {
        if (!confirm('¿Estás seguro de cancelar esta cita?')) return;
        try {
            const { error } = await (supabase as any)
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', id);

            if (error) throw error;
            toast.success('Cita cancelada');
            loadData();
        } catch (error) {
            toast.error('Error al cancelar');
        }
    };

    const handleRegisterPatient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientForm.full_name || !patientForm.cedula || !patientForm.contact_phone) {
            toast.error('Por favor completa los campos obligatorios');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await (supabase as any)
                .from('patients')
                .insert([patientForm]);

            if (error) {
                if (error.code === '23505') throw new Error('Esta cédula ya está registrada');
                throw error;
            }

            toast.success('Paciente registrado exitosamente');
            setIsRegPatientModalOpen(false);
            setPatientForm({
                full_name: '',
                cedula: '',
                contact_phone: '',
                date_of_birth: '',
                gender: 'male',
                agency: 'Invitado'
            });
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Error al registrar paciente');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getVenezuelaToday = () => {
        return new Intl.DateTimeFormat('sv-SE', { 
            timeZone: 'America/Caracas', 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        }).format(new Date());
    };

    const formatDateVE = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    const updateStats = (data: any[], totalPats: number) => {
        const todayStr = getVenezuelaToday();
        
        setStats({
            today: data.filter((a: any) => a.appointment_date === todayStr).length,
            pending: data.filter((a: any) => a.status === 'pending').length,
            completed: data.filter((a: any) => a.status === 'completed').length,
            totalPatients: totalPats
        });
    };

    const filteredAppointments = useMemo(() => {
        let matches = [...appointments];
        const todayStr = getVenezuelaToday();
        const today = new Date(todayStr + 'T12:00:00');

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            matches = matches.filter(app => 
                (app.patients?.full_name || '').toLowerCase().includes(term) || 
                (app.patients?.cedula || '').includes(term)
            );
        }

        if (filterDoctor !== 'all') {
            matches = matches.filter(app => app.doctor_id === filterDoctor);
        }

        if (filterStatus !== 'all') {
            matches = matches.filter(app => app.status === filterStatus);
        }

        // Time Filter
        if (timeFilter === 'today') {
            matches = matches.filter(app => app.appointment_date === todayStr);
        } else if (timeFilter === 'week') {
            const weekEnd = new Date(today);
            weekEnd.setDate(today.getDate() + 7);
            const weekEndStr = weekEnd.toISOString().split('T')[0];
            matches = matches.filter(app => app.appointment_date >= todayStr && app.appointment_date <= weekEndStr);
        } else if (timeFilter === 'month') {
            const monthStr = todayStr.substring(0, 7); // YYYY-MM
            matches = matches.filter(app => app.appointment_date.startsWith(monthStr));
        }

        // Date Range
        if (dateFrom) {
            matches = matches.filter(app => app.appointment_date >= dateFrom);
        }
        if (dateTo) {
            matches = matches.filter(app => app.appointment_date <= dateTo);
        }

        return matches;
    }, [appointments, searchTerm, filterDoctor, filterStatus, timeFilter, dateFrom, dateTo]);

    // Update dynamic stats whenever filters change
    useEffect(() => {
        if (!loading) {
            updateStats(filteredAppointments, stats.totalPatients);
        }
    }, [filteredAppointments, loading]);

    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.patient_id || !formData.doctor_id || !formData.appointment_date || !formData.appointment_time) {
            toast.error('Por favor completa los campos obligatorios');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await (supabase as any)
                .from('appointments')
                .insert([{
                    ...formData,
                    status: 'pending'
                }]);

            if (error) throw error;

            toast.success('Cita programada exitosamente');
            setIsAppModalOpen(false);
            setFormData({ patient_id: '', doctor_id: '', appointment_date: '', appointment_time: '', reason: '' });
            setPatientSearch('');
            loadData();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al programar la cita');
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateAppointmentStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await (supabase as any)
                .from('appointments')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            toast.success(`Cita ${newStatus === 'confirmed' ? 'confirmada' : 'cancelada'}`);
            loadData();
        } catch (error) {
            toast.error('Error al actualizar el estado');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020714] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020714] text-white selection:bg-accent/30 font-sans">
            <Toaster position="top-right" />
            <Header />

            {/* Background Decor */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <img 
                    src="/images/bg-secretary.jpeg"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: 0.82 }}
                />
                <div className="absolute inset-0 bg-[#020714]/40 backdrop-blur-[2px]"></div>
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full"></div>
            </div>

            <main className="relative z-10 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="mb-12">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest mb-4">
                                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></span>
                                Control Administrativo • Gestión de Citas
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">
                                Calendario <span className="text-accent italic">Maestro</span>
                            </h1>
                            <p className="text-white/40 text-lg">Centralización y seguimiento de la atención médica del Sistema de Salud Institucional MINPPAL.</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setIsAppModalOpen(true)}
                                className="px-6 py-4 bg-accent text-white font-black rounded-2xl shadow-xl shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-1 transition-all flex items-center gap-2 group"
                            >
                                <span className="text-xl">📅</span>
                                NUEVA CITA
                            </button>
                            <button 
                                onClick={() => setIsRegPatientModalOpen(true)}
                                className="flex items-center gap-3 px-8 py-5 bg-white/5 backdrop-blur-xl border border-white/10 text-white font-black rounded-3xl hover:bg-white/10 hover:-translate-y-1 transition-all group"
                            >
                                <span className="text-xl">👤</span>
                                REGISTRAR PACIENTE
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] group hover:border-accent/30 transition-all">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center text-2xl">
                                📅
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Citas de Hoy</div>
                                <div className="text-3xl font-black">{stats.today}</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] group hover:border-yellow-500/30 transition-all">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-2xl">
                                ⏳
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Pendientes</div>
                                <div className="text-3xl font-black">{stats.pending}</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] group hover:border-green-500/30 transition-all">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center text-2xl">
                                ✅
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Completadas</div>
                                <div className="text-3xl font-black">{stats.completed}</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] group hover:border-blue-500/30 transition-all">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-2xl">
                                👥
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Pacientes Totales</div>
                                <div className="text-3xl font-black">{stats.totalPatients}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 mb-8 space-y-6">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        {/* Search */}
                        <div className="relative flex-[2] w-full">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20">🔍</span>
                            <input 
                                type="text" 
                                placeholder="Buscar por paciente o cédula..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-14 pr-6 py-4 bg-[#020714]/50 border border-white/5 rounded-2xl outline-none focus:border-accent/40 transition-all placeholder:text-white/20"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-2 px-4 py-4 bg-[#020714]/50 border border-white/5 rounded-2xl w-full md:flex-1">
                            <span className="text-accent text-sm">🚦</span>
                            <select 
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="bg-transparent outline-none text-sm font-bold w-full appearance-none cursor-pointer"
                            >
                                <option value="all" className="bg-[#020714]">Todos los Estados</option>
                                <option value="pending" className="bg-[#020714]">⏳ Pendientes</option>
                                <option value="confirmed" className="bg-[#020714]">✅ Confirmadas</option>
                                <option value="completed" className="bg-[#020714]">🏁 Finalizadas</option>
                                <option value="cancelled" className="bg-[#020714]">❌ Canceladas</option>
                            </select>
                        </div>

                        {/* Doctor Filter */}
                        <div className="flex items-center gap-2 px-4 py-4 bg-[#020714]/50 border border-white/5 rounded-2xl w-full md:flex-1">
                            <span className="text-accent text-sm">👨‍⚕️</span>
                            <select 
                                value={filterDoctor}
                                onChange={(e) => setFilterDoctor(e.target.value)}
                                className="bg-transparent outline-none text-sm font-bold w-full appearance-none cursor-pointer"
                            >
                                <option value="all" className="bg-[#020714]">Todos los Médicos</option>
                                {doctors.map(doc => (
                                    <option key={doc.id} value={doc.id} className="bg-[#020714]">{doc.full_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* CLEAR ALL BUTTON */}
                        {(searchTerm || filterStatus !== 'all' || filterDoctor !== 'all' || timeFilter !== 'all' || dateFrom || dateTo) && (
                            <button 
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterStatus('all');
                                    setFilterDoctor('all');
                                    setTimeFilter('all');
                                    setDateFrom('');
                                    setDateTo('');
                                }}
                                className="px-6 py-4 bg-red-500/10 text-red-400 font-black rounded-2xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all whitespace-nowrap"
                            >
                                LIMPIAR
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pt-4 border-t border-white/5">
                        {/* Time Presets */}
                        <div className="flex items-center gap-2 p-1 bg-[#020714]/50 border border-white/5 rounded-2xl w-full lg:w-auto overflow-x-auto">
                            {[
                                { id: 'all', label: 'Todo', icon: '📋', special: true },
                                { id: 'today', label: 'Hoy', icon: '📅' },
                                { id: 'week', label: 'Semana', icon: '🗓️' },
                                { id: 'month', label: 'Mes', icon: '📊' }
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setTimeFilter(filter.id)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap
                                        ${timeFilter === filter.id 
                                            ? (filter.special ? 'bg-white/20 text-white' : 'bg-accent text-white shadow-lg shadow-accent/20') 
                                            : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                >
                                    <span>{filter.icon}</span>
                                    {filter.label}
                                </button>
                            ))}
                        </div>

                        {/* Date Range */}
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <div className="flex items-center gap-3 px-4 py-3 bg-[#020714]/50 border border-white/5 rounded-2xl flex-1 lg:flex-none">
                                <span className="text-[10px] font-black text-white/30 uppercase">Desde</span>
                                <input 
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="bg-transparent outline-none text-sm font-bold text-accent scheme-dark"
                                />
                            </div>
                            <div className="flex items-center gap-3 px-4 py-3 bg-[#020714]/50 border border-white/5 rounded-2xl flex-1 lg:flex-none">
                                <span className="text-[10px] font-black text-white/30 uppercase">Hasta</span>
                                <input 
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="bg-transparent outline-none text-sm font-bold text-accent scheme-dark"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Appointments List */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem]">
                    <div className="p-8 border-b border-white/10 flex items-center justify-between">
                        <h3 className="text-xl font-black">
                            {timeFilter === 'all' ? 'Agenda' : 'Próximas'} <span className="text-accent">Consultas</span>
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-accent rounded-full"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Sincronizado en tiempo real</span>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto pb-32">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Paciente</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Especialista</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Fecha y Hora</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-center">Estado</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredAppointments
                                    .map((app: any) => (
                                    <tr key={app.id} className="group hover:bg-white/[0.02] transition-all">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                                                    {(app.patients?.full_name || 'P').charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-bold text-white group-hover:text-accent transition-colors">{app.patients?.full_name || 'Desconocido'}</div>
                                                        {app.patients?.agency === 'Invitado' && (
                                                            <span className="text-[8px] font-black bg-white/10 text-white/50 px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-widest">Invitado</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-white/30">C.I. {app.patients?.cedula || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-sm font-bold text-white/80">{app.doctors?.full_name}</div>
                                            <div className="text-[10px] text-accent font-black uppercase">{app.doctors?.specialty}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-sm font-bold">{formatDateVE(app.appointment_date)}</div>
                                            <div className="text-xs text-white/30">{app.appointment_time}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm
                                                    ${app.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 
                                                      app.status === 'confirmed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                                                      app.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                                                      'bg-red-500/10 text-red-400 border border-red-500/20'}`}
                                                >
                                                    {app.status === 'pending' ? 'Pendiente' : 
                                                     app.status === 'confirmed' ? 'Confirmada' : 
                                                     app.status === 'completed' ? 'Finalizada' : 'Cancelada'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2 relative">
                                                {app.status === 'pending' && (
                                                    <button 
                                                        onClick={() => updateAppointmentStatus(app.id, 'confirmed')}
                                                        className="p-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20"
                                                        title="Confirmar Cita"
                                                    >
                                                        ✅
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => setActiveMenuId(activeMenuId === app.id ? null : app.id)}
                                                    className={`p-2 rounded-xl border transition-all ${activeMenuId === app.id ? 'bg-accent text-white border-accent' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10 border-white/5'}`}
                                                >
                                                    ⋮
                                                </button>

                                                {/* Action Dropdown */}
                                                {activeMenuId === app.id && (
                                                    <div className="absolute right-0 top-full mt-2 w-56 bg-[#0a1224] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 text-left backdrop-blur-3xl">
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedApp(app);
                                                                setRescheduleData({ appointment_date: app.appointment_date, appointment_time: app.appointment_time });
                                                                setIsRescheduleModalOpen(true);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-white/5 flex items-center gap-3 transition-colors"
                                                        >
                                                            <span>📅</span> Reagendar Cita
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedApp(app);
                                                                setIsContactModalOpen(true);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-white/5 flex items-center gap-3 transition-colors"
                                                        >
                                                            <span>📞</span> Ver Contacto
                                                        </button>
                                                        <div className="border-t border-white/5"></div>
                                                        <button 
                                                            onClick={() => {
                                                                handleCancelAppointment(app.id);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full px-4 py-3 text-left text-xs font-bold text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                                                        >
                                                            <span>❌</span> Cancelar Cita
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {appointments.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <p className="text-white/20 font-bold text-4xl mb-4">📅</p>
                                            <p className="text-white/20 font-bold">No hay citas programadas para mostrar.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* ── NEW APPOINTMENT MODAL ── */}
            {isAppModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-[#020714]/80 backdrop-blur-sm"
                        onClick={() => setIsAppModalOpen(false)}
                    />
                    <div className="relative w-full max-w-2xl bg-white/10 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black tracking-tighter">Programar <span className="text-accent italic">Nueva Cita</span></h2>
                                <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Gestión de Agenda Institucional</p>
                            </div>
                            <button 
                                onClick={() => setIsAppModalOpen(false)}
                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateAppointment} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Patient Search */}
                                <div className="md:col-span-2 relative">
                                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Buscar Paciente (Nombre o Cédula)</label>
                                    <input 
                                        type="text"
                                        placeholder="Escribe al menos 3 caracteres..."
                                        value={patientSearch}
                                        onChange={(e) => setPatientSearch(e.target.value)}
                                        className="w-full px-6 py-4 bg-[#020714]/50 border border-white/10 rounded-2xl outline-none focus:border-accent/40 transition-all placeholder:text-white/20"
                                    />
                                    {searchResults.length > 0 && (
                                        <div className="absolute z-50 w-full mt-2 bg-[#020714] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                                            {searchResults.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({...formData, patient_id: p.id});
                                                        setPatientSearch(`${p.full_name} (${p.cedula})`);
                                                        setSearchResults([]);
                                                    }}
                                                    className="w-full px-6 py-3 text-left hover:bg-accent/10 hover:text-accent transition-all border-b border-white/5 last:border-0"
                                                >
                                                    <div className="font-bold">{p.full_name}</div>
                                                    <div className="text-xs opacity-40">C.I. {p.cedula}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {patientSearch.length >= 3 && searchResults.length === 0 && !formData.patient_id && (
                                        <div className="mt-2 text-xs text-yellow-500 font-bold px-2 flex items-center gap-2">
                                            ⚠️ Paciente no encontrado. Por favor regístrelo primero.
                                        </div>
                                    )}
                                </div>

                                {/* Specialist Selection */}
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Especialista / Médico</label>
                                    <select 
                                        value={formData.doctor_id}
                                        onChange={(e) => setFormData({...formData, doctor_id: e.target.value})}
                                        className="w-full px-6 py-4 bg-[#020714]/50 border border-white/10 rounded-2xl outline-none focus:border-accent/40 transition-all appearance-none"
                                    >
                                        <option value="">Seleccione un especialista...</option>
                                        {doctors.map(doc => (
                                            <option key={doc.id} value={doc.id} className="bg-[#020714]">
                                                {doc.full_name} — {doc.specialty}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date */}
                                <div>
                                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Fecha</label>
                                    <input 
                                        type="date"
                                        value={formData.appointment_date}
                                        onChange={(e) => setFormData({...formData, appointment_date: e.target.value})}
                                        className="w-full px-6 py-4 bg-[#020714]/50 border border-white/10 rounded-2xl outline-none focus:border-accent/40 transition-all text-white scheme-dark"
                                    />
                                </div>

                                {/* Time */}
                                <div>
                                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Hora</label>
                                    <input 
                                        type="time"
                                        value={formData.appointment_time}
                                        onChange={(e) => setFormData({...formData, appointment_time: e.target.value})}
                                        className="w-full px-6 py-4 bg-[#020714]/50 border border-white/10 rounded-2xl outline-none focus:border-accent/40 transition-all text-white scheme-dark"
                                    />
                                </div>

                                {/* Reason */}
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Motivo / Síntomas</label>
                                    <textarea 
                                        rows={3}
                                        placeholder="Describe brevemente el motivo de la consulta..."
                                        value={formData.reason}
                                        onChange={(e) => setFormData({...formData, reason: e.target.value})}
                                        className="w-full px-6 py-4 bg-[#020714]/50 border border-white/10 rounded-2xl outline-none focus:border-accent/40 transition-all placeholder:text-white/20 resize-none"
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-5 bg-accent hover:bg-accent/80 text-white font-black rounded-2xl shadow-xl shadow-accent/20 transition-all active:scale-[0.98] disabled:opacity-50 text-lg uppercase tracking-widest"
                            >
                                {isSubmitting ? 'PROCESANDO...' : 'PROGRAMAR CITA'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── REGISTER PATIENT MODAL ── */}
            {isRegPatientModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-[#020714]/80 backdrop-blur-sm"
                        onClick={() => setIsRegPatientModalOpen(false)}
                    />
                    <div className="relative w-full max-w-2xl bg-[#0a1224] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-accent/10 to-transparent">
                            <div>
                                <h2 className="text-2xl font-black tracking-tighter">Registrar <span className="text-accent italic">Nuevo Paciente</span></h2>
                                <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Identificación y Datos de Contacto</p>
                            </div>
                            <button 
                                onClick={() => setIsRegPatientModalOpen(false)}
                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleRegisterPatient} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Full Name */}
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Nombre Completo</label>
                                    <input 
                                        type="text"
                                        required
                                        value={patientForm.full_name}
                                        onChange={(e) => setPatientForm({...patientForm, full_name: e.target.value})}
                                        className="w-full px-6 py-4 bg-[#020714]/50 border border-white/10 rounded-2xl outline-none focus:border-accent/40 transition-all text-white placeholder:text-white/10"
                                        placeholder="Ej: Juan Pérez"
                                    />
                                </div>

                                {/* Cedula */}
                                <div>
                                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Cédula de Identidad</label>
                                    <input 
                                        type="text"
                                        required
                                        value={patientForm.cedula}
                                        onChange={(e) => setPatientForm({...patientForm, cedula: e.target.value})}
                                        className="w-full px-6 py-4 bg-[#020714]/50 border border-white/10 rounded-2xl outline-none focus:border-accent/40 transition-all text-white"
                                        placeholder="V-12345678"
                                    />
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Teléfono de Contacto</label>
                                    <input 
                                        type="text"
                                        required
                                        value={patientForm.contact_phone}
                                        onChange={(e) => setPatientForm({...patientForm, contact_phone: e.target.value})}
                                        className="w-full px-6 py-4 bg-[#020714]/50 border border-white/10 rounded-2xl outline-none focus:border-accent/40 transition-all text-white"
                                        placeholder="0412-1234567"
                                    />
                                </div>

                                {/* Birth Date */}
                                <div>
                                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Fecha de Nacimiento</label>
                                    <input 
                                        type="date"
                                        value={patientForm.date_of_birth}
                                        onChange={(e) => setPatientForm({...patientForm, date_of_birth: e.target.value})}
                                        className="w-full px-6 py-4 bg-[#020714]/50 border border-white/10 rounded-2xl outline-none focus:border-accent/40 transition-all text-white scheme-dark"
                                        required
                                    />
                                </div>

                                {/* Gender */}
                                <div>
                                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Género</label>
                                    <select 
                                        value={patientForm.gender}
                                        onChange={(e) => setPatientForm({...patientForm, gender: e.target.value})}
                                        className="w-full px-6 py-4 bg-[#020714]/50 border border-white/10 rounded-2xl outline-none focus:border-accent/40 transition-all appearance-none text-white"
                                    >
                                        <option value="male" className="bg-[#020714]">Masculino</option>
                                        <option value="female" className="bg-[#020714]">Femenino</option>
                                        <option value="other" className="bg-[#020714]">Otro</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsRegPatientModalOpen(false)}
                                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] py-4 bg-accent hover:bg-accent/80 text-white font-black rounded-2xl shadow-xl shadow-accent/20 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest"
                                >
                                    {isSubmitting ? 'GUARDANDO...' : 'Finalizar Registro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── RESCHEDULE MODAL ── */}
            {isRescheduleModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-[#020714]/80 backdrop-blur-sm"
                        onClick={() => setIsRescheduleModalOpen(false)}
                    />
                    <div className="relative w-full max-w-md bg-[#0a1224] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-white/10 bg-gradient-to-r from-accent/10 to-transparent">
                            <h2 className="text-xl font-black tracking-tighter">Reagendar <span className="text-accent italic">Cita</span></h2>
                            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Cambio de Horario y Fecha</p>
                        </div>
                        <form onSubmit={handleReschedule} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 ml-2">Nueva Fecha</label>
                                <input 
                                    type="date"
                                    required
                                    value={rescheduleData.appointment_date}
                                    onChange={(e) => setRescheduleData({...rescheduleData, appointment_date: e.target.value})}
                                    className="w-full px-6 py-4 bg-[#020714]/50 border border-white/10 rounded-2xl outline-none focus:border-accent/40 transition-all text-white scheme-dark"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 ml-2">Nueva Hora</label>
                                <input 
                                    type="time"
                                    required
                                    value={rescheduleData.appointment_time}
                                    onChange={(e) => setRescheduleData({...rescheduleData, appointment_time: e.target.value})}
                                    className="w-full px-6 py-4 bg-[#020714]/50 border border-white/10 rounded-2xl outline-none focus:border-accent/40 transition-all text-white scheme-dark"
                                />
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setIsRescheduleModalOpen(false)} className="flex-1 py-4 bg-white/5 rounded-2xl font-bold">Cancelar</button>
                                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-accent rounded-2xl font-black text-white">REAGENDAR</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── CONTACT MODAL ── */}
            {isContactModalOpen && selectedApp && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-[#020714]/80 backdrop-blur-sm"
                        onClick={() => setIsContactModalOpen(false)}
                    />
                    <div className="relative w-full max-w-sm bg-[#0a1224] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 bg-gradient-to-br from-accent/20 to-transparent text-center">
                            <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">👤</div>
                            <h3 className="text-xl font-black">{selectedApp.patients?.full_name}</h3>
                            <p className="text-accent text-[10px] font-black uppercase tracking-widest">C.I. {selectedApp.patients?.cedula}</p>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="bg-white/5 p-4 rounded-2xl flex items-center gap-4">
                                <span className="text-2xl">📞</span>
                                <div>
                                    <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Teléfono Principal</div>
                                    <div className="font-bold text-lg">{selectedApp.patients?.contact_phone || 'No registrado'}</div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsContactModalOpen(false)}
                                className="w-full py-4 bg-accent font-black rounded-2xl shadow-xl shadow-accent/20"
                            >
                                CERRAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
