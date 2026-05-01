'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

export default function PatientAppointmentsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<any[]>([]);

    useEffect(() => {
        const loadAppointments = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    router.push('/login');
                    return;
                }

                // Obtener ID del paciente
                const { data: patient, error: patientError } = await supabase
                    .from('patients')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                if (patient) {
                    // Cargar citas
                    const { data: apps, error } = await supabase
                        .from('appointments')
                        .select(`
                            id,
                            appointment_date,
                            appointment_time,
                            reason,
                            status,
                            created_at,
                            doctor:doctor_id (full_name, specialty, avatar_url)
                        `)
                        .eq('patient_id', patient.id)
                        .order('appointment_date', { ascending: false })
                        .order('appointment_time', { ascending: false }); // Las más recientes arriba

                    if (error) console.error('Error cargando citas:', error);
                    setAppointments(apps || []);
                }

            } catch (error) {
                console.error('Error inesperado:', error);
            } finally {
                setLoading(false);
            }
        };

        loadAppointments();
    }, [router]);

    // Función para obtener badge según status
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">✅ Aprobada</span>;
            case 'rejected':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">🔴 Rechazada</span>;
            case 'pending':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">⏳ En Trámite</span>;
            case 'completed':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">🏁 Finalizada</span>;
            case 'cancelled':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">🚫 Cancelada</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    const handleCancelAppointment = async (appointmentId: string) => {
        if (!confirm('¿Está seguro que desea retirar esta solicitud?')) return;

        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', appointmentId);

            if (error) throw error;

            // Actualizar estado local
            setAppointments(prev => prev.map(app =>
                app.id === appointmentId ? { ...app, status: 'cancelled' } : app
            ));

        } catch (error) {
            console.error('Error cancelando cita:', error);
            alert('No se pudo cancelar la solicitud.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: '#f0f4f8' }}>

            {/* ── HERO BANNER ── */}
            <div className="relative h-52 overflow-hidden">
                <img
                    src="/images/bg-patient-appointments.jpeg"
                    alt="Mis Citas"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(135deg, rgba(10,36,99,0.55) 0%, rgba(2,7,20,0.40) 100%)' }} />

                {/* Navbar flotante */}
                <div className="absolute top-0 left-0 right-0 z-20">
                    <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                        <Link href="/patient/dashboard"
                            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-semibold">
                            <span className="text-lg">←</span> Volver al Dashboard
                        </Link>
                        <Link href="/patient/appointments/request"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 hover:-translate-y-0.5"
                            style={{ background: '#06D6A0', color: '#020714', boxShadow: '0 4px 15px rgba(6,214,160,0.35)' }}>
                            + Nueva Solicitud
                        </Link>
                    </div>
                </div>

                {/* Título centrado */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10" style={{ paddingTop: '48px' }}>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] mb-2" style={{ color: '#06D6A0' }}>● Sistema de Salud Institucional MINPPAL</p>
                    <h1 className="text-3xl font-black text-white drop-shadow-lg">📅 Mis Citas Médicas</h1>
                    <p className="text-white/60 text-sm mt-1">Gestiona y da seguimiento a tus consultas</p>
                </div>

                {/* Ola inferior */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-10">
                        <path d="M0,60 C360,0 1080,0 1440,60 L1440,60 L0,60 Z" fill="#f0f4f8" />
                    </svg>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {appointments.length > 0 ? (
                    <div className="space-y-4">
                        {appointments.map((app) => (
                            <div key={app.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
                                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">

                                    {/* Info Principal */}
                                    <div className="flex items-start md:items-center gap-4">
                                        {/* Fecha Calendario */}
                                        <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded-lg w-16 h-16 flex-shrink-0">
                                            <span className="text-xs text-gray-500 uppercase font-bold">
                                                {new Date(app.appointment_date).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}
                                            </span>
                                            <span className="text-2xl font-black text-gray-800 leading-none">
                                                {new Date(app.appointment_date).getDate()}
                                            </span>
                                        </div>

                                        <div>
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className="text-lg font-bold text-gray-900">
                                                    Dr. {app.doctor?.full_name || 'Desconocido'}
                                                </h3>
                                                {getStatusBadge(app.status)}
                                            </div>
                                            <p className="text-sm text-gray-500 font-medium">
                                                {app.doctor?.specialty}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                                <span className="flex items-center">
                                                    ⏰ <strong className="ml-1 text-gray-900">{app.appointment_time?.slice(0, 5)}</strong>
                                                </span>
                                                <span className="text-gray-300">|</span>
                                                <span className="truncate max-w-[200px] italic">
                                                    "{app.reason}"
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Acciones (Placeholder por ahora) */}
                                    <div className="flex flex-row md:flex-col gap-2 justify-end">
                                        {/* Botón 'Ver Detalles' eliminado por redundancia */}

                                        {app.status === 'pending' && (
                                            <button
                                                className="text-xs text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition font-medium bg-white"
                                                onClick={() => handleCancelAppointment(app.id)}
                                            >
                                                Cancelar Solicitud
                                            </button>
                                        )}
                                    </div>

                                </div>
                                {/* Footer de estado (opcional, para dar feedback extra) */}
                                {app.status === 'rejected' && (
                                    <div className="bg-red-50 px-6 py-2 text-xs text-red-700 border-t border-red-100 flex items-center">
                                        ℹ️ Su solicitud no pudo ser procesada en este horario. Por favor intente otro turno.
                                    </div>
                                )}
                                {app.status === 'confirmed' && (
                                    <div className="bg-green-50 px-6 py-2 text-xs text-green-700 border-t border-green-100 flex items-center">
                                        ℹ️ Recuerde llegar 15 minutos antes de su hora programada.
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                        <div className="text-6xl mb-4 grayscale opacity-20">📅</div>
                        <h3 className="text-lg font-medium text-gray-900">Aún no tienes citas</h3>
                        <p className="max-w-sm mx-auto text-gray-500 mt-2 mb-6">
                            Comienza a cuidar tu salud agendando una cita con nuestros especialistas.
                        </p>
                        <Link href="/patient/appointments/request" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent">
                            + Solicitar Mi Primera Cita
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
