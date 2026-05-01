'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    const [agendaView, setAgendaView] = useState<AgendaView>('week'); // Default: semana

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

                // 1. Cargar Perfil Médico (Necesitamos el ID interno)
                const { data: doctor, error: doctorError } = await supabase
                    .from('doctors')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (doctorError) {
                    console.error('Error cargando perfil de doctor:', doctorError);
                }

                setDoctorData(doctor);

                // Si tenemos el perfil del doctor (y su ID interno), cargamos las citas
                if (doctor && doctor.id) {
                    console.log('Buscando citas para doctor ID:', doctor.id);

                    // 2. Cargar Citas Pendientes
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
                        .eq('doctor_id', doctor.id)
                        .eq('status', 'pending')
                        .order('appointment_date', { ascending: false }) // Solicitudes recientes arriba
                        .order('appointment_time', { ascending: false });

                    if (pending) setPendingAppointments(pending as any[]);

                    // 3. Cargar citas confirmadas Y completadas FUTURAS (Desde hoy)
                    const today = new Date().toISOString().split('T')[0];
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
                        .eq('doctor_id', doctor.id)
                        .in('status', ['confirmed', 'completed'])
                        .gte('appointment_date', today) // Mayor o igual a hoy
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
                // Comportamiento anterior: Redirigir directo si es cédula exacta
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
                // Búsqueda por diagnóstico requiere unir con medical_records
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

    // Funciones para aceptar/rechazar citas
    const handleAppointmentAction = async (id: string, action: 'confirmed' | 'rejected') => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: action } as any)
                .eq('id', id);

            if (error) throw error;

            // Mover de pendiente a confirmada (o eliminar de la vista si es rechazada)
            const appointment = pendingAppointments.find(a => a.id === id);
            setPendingAppointments(prev => prev.filter(app => app.id !== id));

            if (action === 'confirmed' && appointment) {
                alert('¡Cita aceptada! Se ha añadido a su Agenda Programada.');
                // Añadir a la lista de próximas citas y reordenar visualmente
                setUpcomingAppointments(prev => [...prev, appointment].sort((a, b) => {
                    const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
                    const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
                    return dateA.getTime() - dateB.getTime();
                }));
            }

        } catch (error: any) {
            console.error('Error actualizando cita:', error);
            // Mostrar el error detallado para debug
            const errorMsg = error?.message || error?.toString() || 'Error desconocido';
            alert(`Error al procesar la solicitud:\n\n${errorMsg}\n\nRevisa la consola para más detalles.`);
        }
    };

    // Helper para agrupar fechas visualmente
    const formatDateGroup = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00'); // Forzar zona horaria local (truco simple)
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return 'Hoy';
        if (date.toDateString() === tomorrow.toDateString()) return 'Mañana';
        return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        {doctorData?.avatar_url ? (
                            <img
                                src={doctorData.avatar_url}
                                alt="Perfil"
                                className="w-16 h-16 rounded-full object-cover shadow-lg border-2 border-white"
                            />
                        ) : (
                            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-2xl">👨‍⚕️</span>
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Portal del Médico</h1>
                            <p className="text-sm text-gray-500 font-medium">
                                {doctorData?.full_name || 'Bienvenido, Doctor'} <span className="text-gray-300">|</span> {doctorData?.specialty}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-200 transition">
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* 1. Alerta de Perfil Incompleto */}
                {doctorData && (!doctorData.license_number || !doctorData.phone) && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 flex justify-between items-center shadow-sm animate-fade-in">
                        <div className="flex">
                            <div className="flex-shrink-0">⚠️</div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    Complete su perfil (Licencia y Teléfono) para validar su cuenta.
                                </p>
                            </div>
                        </div>
                        <button onClick={() => router.push('/doctor/profile')} className="text-yellow-700 hover:text-yellow-600 font-bold text-sm underline">
                            Completar perfil
                        </button>
                    </div>
                )}

                {/* 2. Buscador de Pacientes */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col md:flex-row gap-6 items-center bg-gradient-to-r from-blue-50 to-white">
                    <div className="flex-1 w-full">
                        <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
                            <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">🔍</span>
                            Buscar Historia Clínica
                        </h2>
                        <form onSubmit={handleSearch} className="space-y-3">
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(['cedula', 'name', 'diagnosis'] as const).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setSearchType(type)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                                            searchType === type 
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
                                        }`}
                                    >
                                        {type === 'cedula' ? '🆔 Cédula' : type === 'name' ? '👤 Nombre' : '🩺 Diagnóstico'}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder={
                                            searchType === 'cedula' ? "Cédula (ej: V-12345678)" :
                                            searchType === 'name' ? "Nombre del paciente..." :
                                            "Búsqueda por diagnóstico..."
                                        }
                                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-lg px-4 py-2 shadow-sm pr-10"
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        </div>
                                    )}
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={isSearching}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-md whitespace-nowrap disabled:opacity-50"
                                >
                                    {isSearching ? 'Buscando...' : 'Buscar'}
                                </button>
                            </div>

                            {/* Resultados de búsqueda rápidos */}
                            {searchResults.length > 0 && (
                                <div className="mt-4 bg-white border border-blue-100 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 border-l-4 border-l-blue-500">
                                    <div className="bg-blue-50 px-4 py-2 text-xs font-bold text-blue-800 border-b border-blue-100 flex justify-between items-center">
                                        <span>PACIENTES ENCONTRADOS ({searchResults.length})</span>
                                        <button onClick={() => setSearchResults([])} className="text-blue-400 hover:text-blue-800">✕</button>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {searchResults.map(p => (
                                            <div 
                                                key={p.id}
                                                onClick={() => router.push(`/doctor/patients/${p.cedula}`)}
                                                className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between transition group"
                                            >
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                        {p.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{p.full_name}</p>
                                                        <p className="text-xs text-gray-500 font-mono">C.I. {p.cedula}</p>
                                                    </div>
                                                </div>
                                                <span className="text-blue-500 text-xs font-bold group-hover:underline">Ver ficha →</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {searchTerm.trim() !== '' && !isSearching && searchResults.length === 0 && (
                                <p className="text-xs text-center text-gray-400 mt-2 italic">Presione buscar para obtener resultados.</p>
                            )}
                        </form>
                    </div>
                    <div className="hidden md:block w-px h-16 bg-gray-200"></div>
                    <div className="w-full md:w-1/3">
                        <div
                            onClick={() => router.push('/doctor/profile')}
                            className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition flex items-center justify-between group"
                        >
                            <div>
                                <h3 className="font-bold text-gray-800 text-sm">Mi Perfil</h3>
                                <p className="text-xs text-gray-500">Gestión de datos profesionales</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 text-blue-600 transition">⚙️</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* 3. Columna Izquierda: Solicitudes Pendientes */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            📬 Solicitudes Pendientes
                            {pendingAppointments.length > 0 && (
                                <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                                    {pendingAppointments.length} nuevas
                                </span>
                            )}
                        </h2>

                        {pendingAppointments.length > 0 ? (
                            <div className="space-y-4">
                                {pendingAppointments.map((app) => (
                                    <div key={app.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg">{app.patient?.full_name || 'Paciente Desconocido'}</h3>
                                                <p className="text-sm text-gray-500 font-mono flex items-center mt-1">
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs mr-2">C.I.</span>
                                                    {app.patient?.cedula || '--'}
                                                </p>
                                            </div>
                                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold uppercase tracking-wide border border-yellow-200">Pendiente</span>
                                        </div>

                                        <div className="mb-4 bg-blue-50/50 p-4 rounded-lg text-sm border border-blue-100">
                                            <div className="flex gap-4 mb-2 text-blue-900">
                                                <span className="font-bold flex items-center">
                                                    📅 {new Date(app.appointment_date + 'T00:00:00').toLocaleDateString()}
                                                </span>
                                                <span className="font-bold flex items-center">
                                                    ⏰ {app.appointment_time?.slice(0, 5)}
                                                </span>
                                                {app.consultation_type && (
                                                    <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-200">
                                                        🩺 {app.consultation_type}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-700 italic border-l-2 border-blue-300 pl-3">
                                                "{app.reason}"
                                            </p>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleAppointmentAction(app.id, 'confirmed')}
                                                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 transition shadow-sm flex items-center justify-center"
                                            >
                                                ✅ Aceptar
                                            </button>
                                            <button
                                                onClick={() => handleAppointmentAction(app.id, 'rejected')}
                                                className="flex-1 bg-white text-red-600 border border-red-200 py-2.5 rounded-lg font-bold hover:bg-red-50 transition flex items-center justify-center"
                                            >
                                                ❌ Rechazar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white p-12 rounded-xl border border-dashed border-gray-200 text-center">
                                <span className="text-5xl grayscale opacity-20 block mb-4">📭</span>
                                <h3 className="font-bold text-gray-500 text-lg">Sin solicitudes</h3>
                                <p className="text-gray-400 mt-1 text-sm">No tienes citas pendientes de revisión.</p>
                            </div>
                        )}
                    </div>

                    {/* 4. Columna Derecha: Agenda Programada (Futura) */}
                    <div>
                        {/* Botones de Filtro Temporal */}
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">📅 Agenda Programada</h2>
                            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
                                <button
                                    onClick={() => setAgendaView('today')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${agendaView === 'today' ? 'bg-white text-accent shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Hoy
                                </button>
                                <button
                                    onClick={() => setAgendaView('week')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${agendaView === 'week' ? 'bg-white text-accent shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Semana
                                </button>
                                <button
                                    onClick={() => setAgendaView('month')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${agendaView === 'month' ? 'bg-white text-accent shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Mes
                                </button>
                            </div>
                        </div>

                        {/* Toggle de Mostrar Completadas */}
                        <div className="mb-4">
                            <label className="flex items-center gap-2 cursor-pointer w-fit">
                                <input
                                    type="checkbox"
                                    checked={showCompleted}
                                    onChange={(e) => setShowCompleted(e.target.checked)}
                                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Mostrar citas completadas</span>
                            </label>
                        </div>

                        {(() => {
                            // Filtrar citas según la vista seleccionada Y el toggle de completadas
                            let filtered = upcomingAppointments;

                            // 🆕 Filtrar por estado (ocultar completadas si showCompleted es false)
                            if (!showCompleted) {
                                filtered = filtered.filter(app => app.status !== 'completed');
                            }

                            // Filtrar por fecha
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            const filteredAppointments = filtered.filter(app => {
                                const appDate = new Date(app.appointment_date + 'T00:00:00');
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
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                                    {filteredAppointments.map((app, index) => {
                                        // Agrupación visual simple por fechas
                                        const dateGroup = formatDateGroup(app.appointment_date);
                                        const prevApp = filteredAppointments[index - 1];
                                        const showHeader = !prevApp || formatDateGroup(prevApp.appointment_date) !== dateGroup;

                                        return (
                                            <div key={app.id}>
                                                {showHeader && (
                                                    <div className="bg-gray-50 px-4 py-2 font-bold text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100 flex items-center">
                                                        📅 {dateGroup}
                                                    </div>
                                                )}
                                                <div
                                                    className="p-4 flex items-center justify-between hover:bg-blue-50/30 transition group cursor-pointer border-l-4 border-transparent hover:border-accent"
                                                    onClick={() => router.push(`/doctor/patients/${app.patient?.cedula}`)}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-center min-w-[70px] bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
                                                            <p className="font-black text-xl text-gray-800">{app.appointment_time?.slice(0, 5)}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Hora</p>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-gray-900 text-lg">{app.patient?.full_name}</h4>
                                                                {/* Badge de estado */}
                                                                {app.status === 'completed' && (
                                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                                                                        ✓ Completada
                                                                    </span>
                                                                )}
                                                                {app.status === 'confirmed' && (
                                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                                                                        Confirmada
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center text-xs text-gray-500 font-mono mt-1">
                                                                <span className="bg-blue-50 text-blue-600 px-1.5 rounded mr-2">CI</span>
                                                                {app.patient?.cedula}
                                                                {app.consultation_type && (
                                                                    <span className="ml-3 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-100">
                                                                        🩺 {app.consultation_type}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-600 mt-2 truncate max-w-[220px] flex items-center">
                                                                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-2"></span>
                                                                {app.reason}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right pl-4">
                                                        <button
                                                            onClick={() => router.push(`/doctor/patients/${app.patient?.cedula}`)}
                                                            className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:border-accent hover:text-accent font-bold transition flex items-center shadow-sm"
                                                        >
                                                            Ver Ficha
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white p-12 rounded-xl border border-dashed border-gray-200 text-center opacity-70">
                                    <span className="text-5xl mb-4 block opacity-50">📆</span>
                                    <h3 className="font-bold text-gray-600 text-lg">Agenda Libre</h3>
                                    <p className="text-sm text-gray-400 mt-1">No hay citas confirmadas para este período.</p>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </main>
        </div>
    );
}
