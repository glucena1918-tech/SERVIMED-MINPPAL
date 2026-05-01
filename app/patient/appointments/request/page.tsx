'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

// Tipos
interface Doctor {
    id: string; // ID interno de la tabla
    user_id: string; // ID de auth
    full_name: string;
    specialty: string;
    avatar_url: string | null;
}

export default function RequestAppointmentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
        }>
            <RequestAppointmentForm />
        </Suspense>
    );
}

function RequestAppointmentForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const doctorIdParam = searchParams.get('doctor_id');
    const [loading, setLoading] = useState(true);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);

    // Filtros
    const [selectedSpecialty, setSelectedSpecialty] = useState('');
    const specialties = Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean)));

    // Formulario
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>(''); // Usamos el ID interno de la tabla doctors
    const [consultationType, setConsultationType] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const consultationTypes = [
        "Preventiva / Chequeo anual.",
        "Nueva consulta / Primera vez.",
        "Consulta por problema nuevo.",
        "Control de enfermedad crónica.",
        "Seguimiento / Revisión de evolución.",
        "Revisión de resultados.",
        "Vacaciones (Control salida).",
        "Vacaciones (Control regreso).",
        "Consulta Nuevo Ingreso."
    ];

    // Horarios disponibles (Dinámicos)
    const [allTimes, setAllTimes] = useState<string[]>([]);

    // Horarios ocupados (dinámicos basados en BD)
    const [bookedTimes, setBookedTimes] = useState<string[]>([]);
    const [loadingTimes, setLoadingTimes] = useState(false);

    // Horarios realmente disponibles (filtrados)
    const availableTimes = allTimes.filter(t => !bookedTimes.includes(t));

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                // Obtenemos el ID interno también
                const { data, error } = await supabase
                    .from('doctors')
                    .select('id, user_id, full_name, specialty, avatar_url')
                    .eq('is_active', true); // Solo doctores activos

                if (error) throw error;
                setDoctors(data || []);
                setFilteredDoctors(data || []);
            } catch (error) {
                console.error('Error cargando doctores:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDoctors();
    }, []);

    // 🆕 Pre-seleccionar médico si viene por URL
    useEffect(() => {
        if (doctorIdParam && doctors.length > 0) {
            setSelectedDoctorId(doctorIdParam);
            // También establecer la especialidad para que el filtro coincida
            const doc = doctors.find(d => d.id === doctorIdParam);
            if (doc) setSelectedSpecialty(doc.specialty);
        }
    }, [doctorIdParam, doctors]);

    // Filtrar por especialidad
    useEffect(() => {
        if (!selectedSpecialty) {
            setFilteredDoctors(doctors);
        } else {
            setFilteredDoctors(doctors.filter(d => d.specialty === selectedSpecialty));
        }
    }, [selectedSpecialty, doctors]);

    // 🆕 CARGAR DISPONIBILIDAD Y HORARIOS OCUPADOS
    useEffect(() => {
        const fetchAvailabilityAndBooked = async () => {
            if (!selectedDoctorId || !date) {
                setAllTimes([]);
                setBookedTimes([]);
                return;
            }

            setLoadingTimes(true);
            try {
                // 1. Obtener día de la semana (0-6, donde 0 es Domingo)
                const selectedDay = new Date(date + 'T00:00:00').getDay();

                // 2. Cargar disponibilidad del doctor para ese día
                const { data: availData, error: availError } = await supabase
                    .from('doctor_availability')
                    .select('*')
                    .eq('doctor_id', selectedDoctorId)
                    .eq('day_of_week', selectedDay)
                    .eq('is_active', true);

                if (availError) throw availError;

                // 3. Cargar citas ya ocupadas
                const { data: bookedData, error: bookedError } = await supabase
                    .from('appointments')
                    .select('appointment_time')
                    .eq('doctor_id', selectedDoctorId)
                    .eq('appointment_date', date)
                    .in('status', ['pending', 'confirmed']);

                if (bookedError) throw bookedError;
                setBookedTimes(bookedData?.map(a => a.appointment_time.substring(0, 5)) || []);

                // 4. Generar slots basados en la disponibilidad (Regla 30 + 15)
                if (!availData || availData.length === 0) {
                    setAllTimes([]);
                } else {
                    const generatedSlots: string[] = [];
                    const buffer = 15; // minutos de respiro

                    availData.forEach(shift => {
                        let current = new Date(`2000-01-01T${shift.start_time}`);
                        const end = new Date(`2000-01-01T${shift.end_time}`);
                        const slotDuration = shift.slot_duration || 30;

                        while (current < end) {
                            const timeStr = current.toTimeString().substring(0, 5);
                            
                            // Bloqueo de almuerzo (12:00 - 13:30)
                            const currentHour = current.getHours();
                            const currentMin = current.getMinutes();
                            const totalMins = currentHour * 60 + currentMin;
                            const lunchStart = 12 * 60;
                            const lunchEnd = 13 * 60 + 30;

                            if (totalMins < lunchStart || totalMins >= lunchEnd) {
                                generatedSlots.push(timeStr);
                            }

                            // Avanzar (Atención + Respiro)
                            current = new Date(current.getTime() + (slotDuration + buffer) * 60000);
                        }
                    });

                    // Ordenar horarios
                    setAllTimes(generatedSlots.sort());
                }

            } catch (error) {
                console.error('Error cargando disponibilidad:', error);
                setAllTimes([]);
                setBookedTimes([]);
            } finally {
                setLoadingTimes(false);
            }
        };

        fetchAvailabilityAndBooked();
    }, [selectedDoctorId, date]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            // 1. Obtener el ID interno del PACIENTE (basado en su user_id)
            const { data: patientData, error: patientError } = await supabase
                .from('patients')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (patientError || !patientData) {
                console.error('Error buscando paciente:', patientError);
                throw new Error('No se encontró su perfil de paciente. Por favor complete su ficha médica primero.');
            }

            // Validar que la fecha sea futura
            const selectedDate = new Date(`${date}T${time}`);
            if (selectedDate < new Date()) {
                throw new Error('La fecha y hora deben ser futuras.');
            }

            // Insertar usando los IDs internos
            const { error: insertError } = await supabase
                .from('appointments')
                .insert({
                    patient_id: patientData.id, // ID interno
                    doctor_id: selectedDoctorId, // ID interno (seleccionado en el form)
                    appointment_date: date,
                    appointment_time: time,
                    consultation_type: consultationType,
                    reason: reason,
                    status: 'pending'
                });

            if (insertError) throw insertError;

            setMessage({ type: 'success', text: '¡Solicitud de cita enviada con éxito!' });
            // Limpiar formulario o redirigir
            setTimeout(() => {
                router.push('/patient/dashboard');
            }, 2000);

        } catch (error: any) {
            console.error('Error solicitando cita:', error);
            setMessage({ type: 'error', text: error.message || 'Error al solicitar la cita.' });
        } finally {
            setSubmitting(false);
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
        <div className="min-h-screen pb-12" style={{ background: '#f0f4f8' }}>

            {/* ── HERO BANNER ── */}
            <div className="relative h-52 overflow-hidden">
                <img
                    src="/images/bg-appointment-request.jpeg"
                    alt="Solicitar Cita"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(135deg, rgba(10,36,99,0.55) 0%, rgba(2,7,20,0.40) 100%)' }} />

                {/* Navbar flotante */}
                <div className="absolute top-0 left-0 right-0 z-20">
                    <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                        <Link href="/patient/dashboard"
                            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-semibold"
                            style={{ backdropFilter: 'blur(8px)' }}>
                            <span className="text-lg">←</span> Cancelar
                        </Link>
                    </div>
                </div>

                {/* Título centrado */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10" style={{ paddingTop: '48px' }}>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] mb-2" style={{ color: '#06D6A0' }}>● Sistema de Salud Institucional MINPPAL</p>
                    <h1 className="text-3xl font-black text-white drop-shadow-lg">📅 Solicitar Nueva Cita</h1>
                    <p className="text-white/60 text-sm mt-1">Completa los datos para agendar tu consulta médica</p>
                </div>

                {/* Ola inferior */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-10">
                        <path d="M0,60 C360,0 1080,0 1440,60 L1440,60 L0,60 Z" fill="#f0f4f8" />
                    </svg>
                </div>
            </div>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {message && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <span className="text-2xl mr-3">{message.type === 'success' ? '✅' : '⚠️'}</span>
                        <p className="font-medium">{message.text}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
                    <div className="p-8 space-y-8">

                        {/* Paso 1: Seleccionar Médico */}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                                Seleccionar Especialista
                            </h2>

                            {/* Filtro de Especialidad */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Especialidad</label>
                                <select
                                    value={selectedSpecialty}
                                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                >
                                    <option value="">Todas las especialidades</option>
                                    {specialties.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-60 overflow-y-auto p-2 border rounded-lg bg-gray-50 custom-scrollbar">
                                {filteredDoctors.length > 0 ? filteredDoctors.map(doc => (
                                    <div
                                        key={doc.id}
                                        onClick={() => setSelectedDoctorId(doc.id)} // Usamos ID interno
                                        className={`p-3 rounded-lg border cursor-pointer transition flex items-center space-x-3 ${selectedDoctorId === doc.id ? 'border-accent bg-accent/5 ring-2 ring-accent/20' : 'border-gray-200 bg-white hover:border-accent/50'}`}
                                    >
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold flex-shrink-0">
                                            {doc.full_name?.charAt(0) || 'D'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">{doc.full_name}</p>
                                            <p className="text-xs text-gray-500">{doc.specialty}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-2 text-center py-4 text-gray-500 italic">No hay médicos registrados activos.</div>
                                )}
                            </div>
                            {!selectedDoctorId && <p className="text-xs text-red-500 mt-2 ml-1">* Seleccione un médico para continuar</p>}
                        </div>

                        {/* Paso 2: Tipo de Consulta */}
                        <div className={!selectedDoctorId ? 'opacity-50 pointer-events-none grayscale' : ''}>
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
                                Tipo de Consulta
                            </h2>
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Seleccione el motivo principal</label>
                                <select
                                    required
                                    value={consultationType}
                                    onChange={(e) => setConsultationType(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2.5 px-3 border appearance-none bg-white transition-all hover:border-accent/50"
                                >
                                    <option value="">Seleccione tipo de consulta...</option>
                                    {consultationTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 top-6 flex items-center px-2 pointer-events-none text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Paso 3: Fecha y Hora */}
                        <div className={!selectedDoctorId || !consultationType ? 'opacity-50 pointer-events-none grayscale' : ''}>
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">3</span>
                                Fecha y Hora Preferida
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Hora
                                        {loadingTimes && <span className="ml-2 text-xs text-gray-400 italic">(Cargando disponibilidad...)</span>}
                                        {!loadingTimes && selectedDoctorId && date && (
                                            <span className="ml-2 text-xs text-green-600 font-semibold">
                                                ({availableTimes.length} horarios disponibles)
                                            </span>
                                        )}
                                    </label>
                                    <select
                                        required
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        disabled={loadingTimes}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        <option value="">Seleccione hora...</option>
                                        {availableTimes.length > 0 ? (
                                            availableTimes.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))
                                        ) : (
                                            !loadingTimes && selectedDoctorId && date && (
                                                <option disabled>No hay horarios disponibles para esta fecha</option>
                                            )
                                        )}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Paso 4: Motivo */}
                        <div className={!selectedDoctorId || !consultationType || !date || !time ? 'opacity-50 pointer-events-none grayscale' : ''}>
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">4</span>
                                Motivo de la Consulta
                            </h2>
                            <textarea
                                required
                                rows={3}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Describa brevemente sus síntomas o razón de la visita..."
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                            />
                        </div>

                        {/* Botón Final */}
                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting || !selectedDoctorId || !consultationType || !date || !time || !reason}
                                className="px-8 py-3 bg-accent text-white font-bold rounded-lg hover:bg-accent-600 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {submitting ? 'Enviando...' : 'Confirmar Solicitud'}
                            </button>
                        </div>

                    </div>
                </form>
            </main>
        </div>
    );
}
