'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { toast, Toaster } from 'react-hot-toast';

interface AdminStats {
    totalAppointments: number;
    appointmentsToday: number;
    totalPatients: number;
    totalGuests: number;
    patientsByDoctor: { name: string; count: number }[];
    topMedicines: { name: string; count: number }[];
    topPathologies: { name: string; count: number }[];
    appointmentsByPeriod: { day: string; count: number }[];
    specialtyDemand: { specialty: string; count: number }[];
    patientsByAgency: { agency: string; count: number }[];
}

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [adminData, setAdminData] = useState<any>(null);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [activeTab, setActiveTab] = useState<'kpis' | 'users' | 'doctors'>('kpis');
    
    // Estados de Filtros
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterDoctor, setFilterDoctor] = useState('all');
    const [filterSpecialty, setFilterSpecialty] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [doctors, setDoctors] = useState<any[]>([]);
    const [specialties, setSpecialties] = useState<string[]>([]);

    // Formulario para crear secretaria
    const [secEmail, setSecEmail] = useState('');
    const [secName, setSecName] = useState('');
    const [secPass, setSecPass] = useState('');
    const [creatingSec, setCreatingSec] = useState(false);
    const [secretariesList, setSecretariesList] = useState<any[]>([]);
    const [fetchingSec, setFetchingSec] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }
                setAdminData(user);
                await fetchStats();
                await fetchSecretaries();
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [router]);

    const fetchSecretaries = async () => {
        setFetchingSec(true);
        try {
            const { data } = await (supabase as any).from('secretaries').select('*').order('created_at', { ascending: false });
            setSecretariesList(data || []);
        } catch (error) {
            console.error('Error fetch sec:', error);
        } finally {
            setFetchingSec(false);
        }
    };

    const handleCreateSecretary = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingSec(true);
        const cleanEmail = secEmail.trim().toLowerCase();
        try {
            const { error } = await (supabase as any).from('secretaries').insert({
                full_name: secName,
                email: cleanEmail,
                status: 'active'
            });

            if (error) throw error;

            toast.success('Cuenta de Secretaria registrada en el sistema');
            setSecEmail('');
            setSecName('');
            setSecPass('');
            fetchSecretaries();
        } catch (error: any) {
            toast.error(error.message || 'Error al crear la cuenta');
        } finally {
            setCreatingSec(false);
        }
    };

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            // 1. Cargar datos base
            const [
                { data: appData },
                { data: docData },
                { data: recData },
                { data: medData },
                { data: patData }
            ] = await Promise.all([
                supabase.from('appointments').select('id, appointment_date, doctor_id, status, medical_record_id'),
                supabase.from('doctors').select('id, full_name, specialty').eq('is_active', true),
                supabase.from('medical_records').select('id, diagnosis, doctor_id, created_at'),
                supabase.from('prescription_items').select('medicine_name, medical_record_id'),
                supabase.from('patients').select('id, agency')
            ]);

            const allDoctors = (docData || []) as any[];
            setDoctors(allDoctors);
            const allSpecs = Array.from(new Set(allDoctors.map(d => d.specialty)));
            setSpecialties(allSpecs);

            let filteredApps = (appData || []) as any[];
            const allRecords = (recData || []) as any[];
            const allMeds = (medData || []) as any[];
            const allPatients = (patData || []) as any[];

            // 2. Aplicar Filtros a Citas
            if (dateFrom) filteredApps = filteredApps.filter(a => a.appointment_date >= dateFrom);
            if (dateTo) filteredApps = filteredApps.filter(a => a.appointment_date <= dateTo);
            if (filterDoctor !== 'all') filteredApps = filteredApps.filter(a => a.doctor_id === filterDoctor);
            if (filterStatus !== 'all') filteredApps = filteredApps.filter(a => a.status === filterStatus);
            if (filterSpecialty !== 'all') {
                const docIdsInSpec = allDoctors.filter(d => d.specialty === filterSpecialty).map(d => d.id);
                filteredApps = filteredApps.filter(a => docIdsInSpec.includes(a.doctor_id));
            }

            // 3. Procesar Totales
            const totalApps = filteredApps.length;
            const tzOffset = (new Date()).getTimezoneOffset() * 60000;
            const todayStr = new Date(Date.now() - tzOffset).toISOString().split('T')[0];
            const appsToday = filteredApps.filter(a => a.appointment_date === todayStr).length;

            // 4. Filtrar Registros y Medicinas según citas filtradas
            const filteredRecIds = filteredApps.map(a => (a as any).medical_record_id).filter(Boolean);
            const filteredRecords = allRecords.filter(r => filteredRecIds.includes(r.id));
            const filteredMeds = allMeds.filter(m => filteredRecIds.includes(m.medical_record_id));

            // 5. KPIs Recalculados
            const patientsByDoc = allDoctors.map(doc => ({
                name: doc.full_name,
                count: filteredApps.filter(a => a.doctor_id === doc.id).length
            })).sort((a,b) => b.count - a.count);

            const medCounts: Record<string, number> = {};
            filteredMeds.forEach(m => {
                const name = m.medicine_name?.trim().toUpperCase();
                if (name) medCounts[name] = (medCounts[name] || 0) + 1;
            });

            const diagCounts: Record<string, number> = {};
            filteredRecords.forEach(r => {
                const diag = r.diagnosis?.trim().toUpperCase();
                if (diag) diagCounts[diag] = (diagCounts[diag] || 0) + 1;
            });

            const specCounts: Record<string, number> = {};
            allDoctors.forEach(doc => {
                const count = filteredApps.filter(a => a.doctor_id === doc.id).length;
                specCounts[doc.specialty] = (specCounts[doc.specialty] || 0) + count;
            });

            // Conteo por Agencia (Ente)
            const agencyCounts: Record<string, number> = {};
            allPatients.forEach(p => {
                const agency = p.agency || 'Otro';
                agencyCounts[agency] = (agencyCounts[agency] || 0) + 1;
            });

            const patientsByAgency = Object.entries(agencyCounts).map(([agency, count]) => ({ agency, count })).sort((a,b) => b.count - a.count);
            const totalGuests = agencyCounts['Invitado'] || 0;

            setStats({
                totalAppointments: totalApps,
                appointmentsToday: appsToday,
                totalPatients: allPatients.length,
                totalGuests: totalGuests,
                patientsByDoctor: patientsByDoc,
                topMedicines: Object.entries(medCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 15),
                topPathologies: Object.entries(diagCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 10),
                appointmentsByPeriod: [],
                specialtyDemand: Object.entries(specCounts).map(([specialty, count]) => ({ specialty, count })).sort((a,b) => b.count - a.count),
                patientsByAgency: patientsByAgency
            });

        } catch (error) {
            console.error('Error stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [dateFrom, dateTo, filterDoctor, filterSpecialty, filterStatus]);

    const [editingSec, setEditingSec] = useState<any>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [deletingSecId, setDeletingSecId] = useState<string | null>(null);

    const toggleSecretaryStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        try {
            const { error } = await (supabase as any).from('secretaries').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
            toast.success(`Secretaria ${newStatus === 'active' ? 'activada' : 'suspendida'} exitosamente`);
            fetchSecretaries();
        } catch (error) {
            toast.error('Error al cambiar el estado');
        }
    };

    const handleUpdateSecretary = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSec) return;
        
        try {
            const { error } = await (supabase as any)
                .from('secretaries')
                .update({ 
                    full_name: editName,
                    email: editEmail
                })
                .eq('id', editingSec.id);

            if (error) throw error;

            toast.success('Datos actualizados correctamente');
            setEditingSec(null);
            fetchSecretaries();
        } catch (error: any) {
            toast.error(error.message || 'Error al actualizar');
        }
    };

    const confirmDeleteSecretary = async () => {
        if (!deletingSecId) return;
        try {
            const { error } = await (supabase as any).from('secretaries').delete().eq('id', deletingSecId);
            if (error) throw error;
            toast.success('Cuenta eliminada del sistema');
            setDeletingSecId(null);
            fetchSecretaries();
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-[#020714] text-white selection:bg-accent/30">
            <Toaster position="top-right" />
            
            {/* Background */}
            <div className="fixed inset-0 z-0">
                <img 
                    src="/images/bg-admin.jpeg" 
                    alt="" 
                    className="w-full h-full object-cover opacity-[0.82]"
                    style={{ filter: 'brightness(65%) contrast(105%)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020714]/40 to-[#020714]" />
            </div>

            <Header />

            <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
                {/* Dashboard Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 animate-fade-in">
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            Control Central - Administrador
                        </div>
                        <h1 className="text-5xl font-black tracking-tight mb-2">Panel de <span className="text-accent">Inteligencia</span></h1>
                        <p className="text-white/60 font-medium italic">Bienvenido, {adminData?.user_metadata?.full_name || 'Gonzalo Lucena'}. Gestionando el futuro de SSIMINPPAL.</p>
                    </div>

                    <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
                        <button 
                            onClick={() => setActiveTab('kpis')}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'kpis' ? 'bg-accent text-white' : 'hover:bg-white/5 text-white/50'}`}
                        >
                            📊 Métricas KPI
                        </button>
                        <button 
                            onClick={() => setActiveTab('users')}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-accent text-white' : 'hover:bg-white/5 text-white/50'}`}
                        >
                            👥 Secretarías
                        </button>
                        <button 
                            onClick={() => setActiveTab('doctors')}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'doctors' ? 'bg-accent text-white' : 'hover:bg-white/5 text-white/50'}`}
                        >
                            👨‍⚕️ Médicos
                        </button>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2rem] mb-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Desde</label>
                            <input 
                                type="date" 
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full bg-[#020714]/50 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-accent outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Hasta</label>
                            <input 
                                type="date" 
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full bg-[#020714]/50 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-accent outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Médico</label>
                            <select 
                                value={filterDoctor}
                                onChange={(e) => setFilterDoctor(e.target.value)}
                                className="w-full bg-[#020714]/50 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-accent outline-none transition-all"
                            >
                                <option value="all">Todos los Médicos</option>
                                {doctors.map(doc => (
                                    <option key={doc.id} value={doc.id}>{doc.full_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Especialidad</label>
                            <select 
                                value={filterSpecialty}
                                onChange={(e) => setFilterSpecialty(e.target.value)}
                                className="w-full bg-[#020714]/50 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-accent outline-none transition-all"
                            >
                                <option value="all">Todas las Especialidades</option>
                                {specialties.map(spec => (
                                    <option key={spec} value={spec}>{spec}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <div className="space-y-2 flex-grow">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Estado</label>
                                <select 
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full bg-[#020714]/50 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-accent outline-none transition-all"
                                >
                                    <option value="all">Todos los Estados</option>
                                    <option value="pending">Pendientes</option>
                                    <option value="confirmed">Confirmadas</option>
                                    <option value="completed">Completadas</option>
                                    <option value="cancelled">Canceladas</option>
                                </select>
                            </div>
                            <button 
                                onClick={() => {
                                    setDateFrom('');
                                    setDateTo('');
                                    setFilterDoctor('all');
                                    setFilterSpecialty('all');
                                    setFilterStatus('all');
                                }}
                                className="h-10 w-10 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                                title="Limpiar Filtros"
                            >
                                🔄
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tab: KPIs */}
                {activeTab === 'kpis' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                            {[
                                { label: 'Total Pacientes', val: stats?.totalPatients || 0, icon: '👥', color: 'blue' },
                                { label: 'Impacto Social (Invitados)', val: stats?.totalGuests || 0, icon: '🤝', color: 'accent' },
                                { label: 'Atendidos Hoy', val: stats?.appointmentsToday || 0, icon: '📅', color: 'accent' },
                                { label: 'Médicos Activos', val: stats?.patientsByDoctor.length || 0, icon: '🩺', color: 'purple' },
                                { label: 'Especialidades', val: stats?.specialtyDemand.length || 0, icon: '🏥', color: 'orange' },
                            ].map((card, i) => (
                                <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] hover:border-accent/40 transition-all group">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-3xl">{card.icon}</span>
                                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{card.label}</span>
                                    </div>
                                    <div className="text-4xl font-black group-hover:text-accent transition-colors">{card.val}</div>
                                </div>
                            ))}
                        </div>

                        {/* Analysis Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Top Medicines */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem]">
                                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                    <span className="p-2 bg-accent/20 rounded-lg text-accent text-sm">💊</span>
                                    Top 15 Medicamentos Recetados
                                </h3>
                                <div className="space-y-4">
                                    {stats?.topMedicines.map((med, i) => (
                                        <div key={i} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-black text-white/20 w-4">{i+1}</span>
                                                <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">{med.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-accent" 
                                                        style={{ width: `${(med.count / (stats?.topMedicines[0]?.count || 1)) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-black text-accent">{med.count}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {stats?.topMedicines.length === 0 && <p className="text-white/20 italic text-center py-10">Sin datos de recetas aún.</p>}
                                </div>
                            </div>

                            {/* Patients by Doctor */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem]">
                                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                    <span className="p-2 bg-blue-500/20 rounded-lg text-blue-400 text-sm">👨‍⚕️</span>
                                    Pacientes por Médico
                                </h3>
                                <div className="space-y-4">
                                    {stats?.patientsByDoctor.map((doc, i) => (
                                        <div key={i} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-black border border-white/10">
                                                    {doc.name.charAt(0)}
                                                </div>
                                                <span className="text-sm font-bold text-white/70">{doc.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
                                                    {doc.count} pacientes
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Frequent Pathologies */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem]">
                                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                    <span className="p-2 bg-red-500/20 rounded-lg text-red-400 text-sm">🦠</span>
                                    Patologías más Frecuentes
                                </h3>
                                <div className="space-y-3">
                                    {stats?.topPathologies.map((path, i) => (
                                        <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors">
                                            <span className="text-sm font-medium text-white/80">{path.name}</span>
                                            <span className="text-xs font-black text-red-400">{path.count} casos</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Specialty Demand */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem]">
                                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                    <span className="p-2 bg-orange-500/20 rounded-lg text-orange-400 text-sm">🏥</span>
                                    Demanda por Servicio Médico
                                </h3>
                                <div className="space-y-4">
                                    {stats?.specialtyDemand.map((spec, i) => (
                                        <div key={i} className="flex flex-col gap-2">
                                            <div className="flex justify-between text-xs font-black uppercase tracking-widest text-white/40">
                                                <span>{spec.specialty}</span>
                                                <span className="text-orange-400">{spec.count}</span>
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" 
                                                    style={{ width: `${(spec.count / (stats?.specialtyDemand[0]?.count || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Patients by Agency (Institution) */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] lg:col-span-2">
                                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                    <span className="p-2 bg-accent/20 rounded-lg text-accent text-sm">🏢</span>
                                    Distribución de Pacientes por Ente / Institución
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        {stats?.patientsByAgency.map((item, i) => {
                                            const colors: any = {
                                                'Minppal': '#0066FF',
                                                'Cuspal': '#FF9900',
                                                'Red Venezuela': '#CC0000',
                                                'Fudaproal': '#009933',
                                                'Familiar': '#9900CC',
                                                'Invitado': '#666666',
                                                'Otro': '#444444'
                                            };
                                            const color = colors[item.agency] || '#444444';
                                            
                                            return (
                                                <div key={i} className="flex flex-col gap-2">
                                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                        <span style={{ color }}>{item.agency}</span>
                                                        <span className="text-white">{item.count}</span>
                                                    </div>
                                                    <div className="h-3 bg-white/5 rounded-full overflow-hidden flex">
                                                        <div 
                                                            className="h-full transition-all duration-1000" 
                                                            style={{ 
                                                                width: `${(item.count / (stats?.totalPatients || 1)) * 100}%`,
                                                                backgroundColor: color,
                                                                boxShadow: `0 0 15px ${color}44`
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex flex-col justify-center items-center p-8 bg-white/5 rounded-[2rem] border border-white/5">
                                        <div className="text-sm font-black text-white/30 uppercase tracking-[0.2em] mb-4 text-center">Resumen de Cobertura</div>
                                        <div className="text-6xl font-black text-accent mb-2">{Math.round(((stats?.totalGuests || 0) / (stats?.totalPatients || 1)) * 100)}%</div>
                                        <div className="text-xs font-bold text-white/50 text-center">De la atención médica total corresponde a <span className="text-white">Invitados (Impacto Social)</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Users (Secretaries) */}
                {activeTab === 'users' && (
                    <div className="space-y-12 animate-fade-in">
                        {/* Formulario de Creación */}
                        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden max-w-4xl mx-auto">
                            <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl">👤</div>
                            
                            <h2 className="text-3xl font-black mb-2">Nueva <span className="text-accent">Secretaría</span></h2>
                            <p className="text-white/40 mb-10 text-lg">Crea una cuenta oficial para el personal administrativo.</p>
                            
                            <form onSubmit={handleCreateSecretary} className="space-y-8 relative z-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Nombre Completo</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={secName}
                                            onChange={e => setSecName(e.target.value)}
                                            placeholder="Ej: María Rodríguez"
                                            className="w-full px-6 py-4 rounded-2xl bg-[#020714]/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-white placeholder:text-white/20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Correo Institucional</label>
                                        <input 
                                            type="email" 
                                            required
                                            value={secEmail}
                                            onChange={e => setSecEmail(e.target.value)}
                                            placeholder="secretaria@minppal.gob.ve"
                                            className="w-full px-6 py-4 rounded-2xl bg-[#020714]/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-white placeholder:text-white/20"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Contraseña Inicial</label>
                                    <input 
                                        type="password" 
                                        required
                                        value={secPass}
                                        onChange={e => setSecPass(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-6 py-4 rounded-2xl bg-[#020714]/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-white placeholder:text-white/20"
                                    />
                                </div>
                                
                                <button 
                                    type="submit"
                                    disabled={creatingSec}
                                    className="w-full py-5 bg-accent text-white font-black rounded-2xl shadow-xl shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {creatingSec ? 'Procesando...' : 'REGISTRAR SECRETARÍA'}
                                    <span>→</span>
                                </button>
                            </form>
                        </div>

                        {/* Lista de Secretarías Existentes */}
                        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black">Cuentas <span className="text-accent">Activas</span></h3>
                                <button onClick={fetchSecretaries} className="text-white/40 hover:text-white text-xs font-black flex items-center gap-2">
                                    {fetchingSec ? 'Actualizando...' : '🔄 Actualizar Lista'}
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-white/30 px-4">Nombre</th>
                                            <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-white/30 px-4">Email</th>
                                            <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-white/30 px-4 text-center">Estado</th>
                                            <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-white/30 px-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {secretariesList.map((sec) => (
                                            <tr key={sec.id} className="border-b border-white/5 group hover:bg-white/[0.02] transition-colors">
                                                <td className="py-6 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-black text-sm">
                                                            {sec.full_name.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-white/80">{sec.full_name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-6 px-4 text-sm text-white/40">{sec.email}</td>
                                                <td className="py-6 px-4 text-center">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${sec.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                        {sec.status === 'active' ? 'En Servicio' : 'Suspendida'}
                                                    </span>
                                                </td>
                                                <td className="py-6 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => toggleSecretaryStatus(sec.id, sec.status)}
                                                            className={`p-2 rounded-lg border transition-all ${sec.status === 'active' ? 'border-orange-500/20 text-orange-400 hover:bg-orange-500/10' : 'border-green-500/20 text-green-400 hover:bg-green-500/10'}`}
                                                            title={sec.status === 'active' ? 'Suspender Acceso' : 'Activar Acceso'}
                                                        >
                                                            {sec.status === 'active' ? '⏸️' : '▶️'}
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                setEditingSec(sec);
                                                                setEditName(sec.full_name);
                                                                setEditEmail(sec.email);
                                                            }}
                                                            className="p-2 rounded-lg border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 transition-all"
                                                            title="Editar Datos"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button 
                                                            onClick={() => setDeletingSecId(sec.id)}
                                                            className="p-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
                                                            title="Eliminar Permanente"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {secretariesList.length === 0 && !fetchingSec && (
                                            <tr>
                                                <td colSpan={4} className="py-20 text-center text-white/20 italic">No hay secretarías registradas.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Doctors (Verification) */}
                {activeTab === 'doctors' && (
                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-12 text-center animate-fade-in">
                        <div className="text-6xl mb-6">🔍</div>
                        <h2 className="text-2xl font-black mb-4">Verificación de Especialistas</h2>
                        <p className="text-white/30 max-w-md mx-auto mb-8 leading-relaxed">
                            Aquí aparecerán los médicos que se registren por primera vez. Deberás verificar sus credenciales antes de que puedan atender pacientes.
                        </p>
                        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-black uppercase tracking-widest">
                            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                            0 Solicitudes Pendientes
                        </div>
                    </div>
                )}
                {/* Edit Modal */}
                {editingSec && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020714]/80 backdrop-blur-xl animate-fade-in">
                        <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] w-full max-w-lg shadow-2xl relative">
                            <button 
                                onClick={() => setEditingSec(null)}
                                className="absolute top-8 right-8 text-white/30 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                            
                            <h2 className="text-3xl font-black mb-2">Editar <span className="text-accent">Secretaría</span></h2>
                            <p className="text-white/40 mb-8">Modifica los datos institucionales de la cuenta.</p>
                            
                            <form onSubmit={handleUpdateSecretary} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Nombre Completo</label>
                                    <input 
                                        type="text"
                                        required
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className="w-full px-6 py-4 rounded-2xl bg-[#020714]/50 border border-white/10 text-white outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Correo Institucional</label>
                                    <input 
                                        type="email"
                                        required
                                        value={editEmail}
                                        onChange={e => setEditEmail(e.target.value)}
                                        className="w-full px-6 py-4 rounded-2xl bg-[#020714]/50 border border-white/10 text-white outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                                    />
                                </div>
                                
                                <div className="pt-4 flex gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setEditingSec(null)}
                                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-[2] py-4 bg-accent text-white font-black rounded-2xl shadow-xl shadow-accent/20 hover:shadow-accent/40 transition-all"
                                    >
                                        GUARDAR CAMBIOS
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {/* Delete Confirmation Modal */}
                {deletingSecId && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[#020714]/90 backdrop-blur-2xl animate-fade-in">
                        <div className="bg-white/5 border border-red-500/20 p-12 rounded-[3rem] w-full max-w-md shadow-2xl relative text-center">
                            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 animate-pulse">
                                ⚠️
                            </div>
                            
                            <h2 className="text-2xl font-black mb-4">¿Eliminar <span className="text-red-400">Permanentemente</span>?</h2>
                            <p className="text-white/40 mb-10 text-sm leading-relaxed">
                                Esta acción es irreversible. Se eliminará el acceso y todo el historial asociado a esta cuenta del sistema.
                            </p>
                            
                            <div className="flex flex-col gap-4">
                                <button 
                                    onClick={confirmDeleteSecretary}
                                    className="w-full py-4 bg-red-500 text-white font-black rounded-2xl shadow-xl shadow-red-500/20 hover:shadow-red-500/40 hover:-translate-y-1 transition-all"
                                >
                                    SÍ, ELIMINAR CUENTA
                                </button>
                                <button 
                                    onClick={() => setDeletingSecId(null)}
                                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <Footer />

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
}
