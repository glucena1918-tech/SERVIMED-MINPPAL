'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

// Definición de tipos para calmar a TypeScript
interface PatientProfile {
    full_name: string | null;
    cedula: string | null;
    date_of_birth: string | null;
    gender: string | null;
    weight: number | null;
    height: number | null;
    blood_type: string | null;
    agency: string | null;
    department: string | null;
    work_location: string | null;
    contact_phone: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    allergies_food: string | null;
    allergies_medicine: string | null;
    medical_devices: string | null;
    chronic_conditions: string | null;
    previous_surgeries: string | null;
    family_diseases: string | null;
    vaccines: string | null;
    user_id: string;
}

// Opciones predefinidas según requerimientos
const ENTES = ['Minppal', 'Cuspal', 'Red Venezuela', 'Fudaproal', 'Familiar', 'Invitado', 'Otro'];
const OFICINAS = ['Gerencia General', 'Dirección General', 'Viceministerio'];
const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENEROS = [
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Femenino' }
];

export default function PatientProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Estado del formulario
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        cedula: '',
        date_of_birth: '',
        gender: '',
        weight: '',
        height: '',
        blood_type: '',
        agency: '',
        department: '',
        work_location: '',
        contact_phone: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        allergies_food: '',
        allergies_medicine: '',
        medical_devices: '',
        chronic_conditions: '',
        previous_surgeries: '',
        family_diseases: '',
        vaccines: ''
    });

    // Calcular edad en tiempo real
    const calculateAge = (dob: string) => {
        if (!dob) return '';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }

                // Usamos any temporalmente en el query para evitar conflictos de tipado estricto con Supabase
                const { data, error } = await supabase
                    .from('patients')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (error) throw error;

                if (data) {
                    const patient = data as PatientProfile; // Casteo explícito

                    // Separar nombre completo si es necesario
                    const names = (patient.full_name || '').split(' ');
                    const lastName = names.length > 1 ? names.slice(Math.ceil(names.length / 2)).join(' ') : '';
                    const firstName = names.length > 1 ? names.slice(0, Math.ceil(names.length / 2)).join(' ') : patient.full_name;

                    setFormData({
                        first_name: firstName || '',
                        last_name: lastName || '',
                        cedula: patient.cedula || '',
                        date_of_birth: patient.date_of_birth || '',
                        gender: patient.gender === 'other' ? '' : patient.gender || '',
                        weight: patient.weight?.toString() || '',
                        height: patient.height?.toString() || '',
                        blood_type: patient.blood_type || '',
                        agency: patient.agency || '',
                        department: patient.department || '',
                        work_location: patient.work_location || '',
                        contact_phone: patient.contact_phone || '',
                        emergency_contact_name: patient.emergency_contact_name || '',
                        emergency_contact_phone: patient.emergency_contact_phone || '',
                        allergies_food: patient.allergies_food || '',
                        allergies_medicine: patient.allergies_medicine || '',
                        medical_devices: patient.medical_devices || '',
                        chronic_conditions: patient.chronic_conditions || '',
                        previous_surgeries: patient.previous_surgeries || '',
                        family_diseases: patient.family_diseases || '',
                        vaccines: patient.vaccines || ''
                    });
                }
            } catch (error) {
                console.error('Error cargando perfil:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No usuario autenticado');

            // Preparar datos para update
            const fullName = `${formData.first_name} ${formData.last_name}`.trim();

            const updates = {
                full_name: fullName,
                cedula: formData.cedula,
                date_of_birth: formData.date_of_birth || null,
                gender: formData.gender,
                weight: formData.weight ? parseFloat(formData.weight) : null,
                height: formData.height ? parseFloat(formData.height) : null,
                blood_type: formData.blood_type,
                agency: formData.agency,
                department: formData.department,
                work_location: formData.work_location,
                contact_phone: formData.contact_phone,
                emergency_contact_name: formData.emergency_contact_name,
                emergency_contact_phone: formData.emergency_contact_phone,
                allergies_food: formData.allergies_food,
                allergies_medicine: formData.allergies_medicine,
                medical_devices: formData.medical_devices,
                chronic_conditions: formData.chronic_conditions,
                previous_surgeries: formData.previous_surgeries,
                family_diseases: formData.family_diseases,
                vaccines: formData.vaccines,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('patients')
                .update(updates)
                .eq('user_id', user.id);

            if (error) throw error;

            setMessage({ type: 'success', text: '¡Ficha médica actualizada correctamente!' });

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error: any) {
            console.error('Error guardando perfil:', error);
            setMessage({ type: 'error', text: error.message || 'Error al guardar los cambios' });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
                    src="https://images.pexels.com/photos/12599544/pexels-photo-12599544.jpeg"
                    alt="Ficha Médica"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(135deg, rgba(10,36,99,0.55) 0%, rgba(2,7,20,0.40) 100%)' }} />

                {/* Navbar flotante */}
                <div className="absolute top-0 left-0 right-0 z-20">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <Link href="/patient/dashboard"
                            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-semibold"
                            style={{ backdropFilter: 'blur(8px)' }}>
                            <span className="text-lg">←</span> Volver al Dashboard
                        </Link>
                    </div>
                </div>

                {/* Título centrado */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10" style={{ paddingTop: '48px' }}>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] mb-2" style={{ color: '#06D6A0' }}>● Sistema de Salud Institucional MINPPAL</p>
                    <h1 className="text-3xl font-black text-white drop-shadow-lg">👤 Mi Ficha Médica</h1>
                    <p className="text-white/60 text-sm mt-1">Actualiza tus datos personales y clínicos</p>
                </div>

                {/* Ola inferior */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-10">
                        <path d="M0,60 C360,0 1080,0 1440,60 L1440,60 L0,60 Z" fill="#f0f4f8" />
                    </svg>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {message && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <span className="text-2xl mr-3">{message.type === 'success' ? '✅' : '⚠️'}</span>
                        <p className="font-medium">{message.text}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* ── AVISO INSTITUCIONAL ── */}
                    <div className="relative overflow-hidden rounded-2xl shadow-lg border border-amber-200"
                        style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)' }}>
                        {/* Franja lateral de color */}
                        <div className="absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl"
                            style={{ background: 'linear-gradient(to bottom, #f59e0b, #d97706)' }} />

                        {/* Icono decorativo de fondo */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-200 select-none pointer-events-none"
                            style={{ fontSize: '4.5rem', lineHeight: 1 }}>
                            📋
                        </div>

                        <div className="relative pl-8 pr-20 py-6">
                            {/* Título del aviso */}
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-2xl">⚠️</span>
                                <h3 className="text-lg font-black text-amber-900 uppercase tracking-wider">
                                    Aviso Importante — Lea antes de continuar
                                </h3>
                            </div>

                            {/* Separador */}
                            <div className="h-px bg-amber-300 mb-4" />

                            {/* Texto principal */}
                            <p className="text-amber-900 font-semibold text-base leading-relaxed mb-3">
                                <span className="text-amber-700 font-black text-lg">Estimado Compañero(a):</span>{' '}
                                Le pedimos llenar este formulario con <span className="underline decoration-amber-500 decoration-2">total cuidado y precisión</span>.
                                Los datos <strong>personales, familiares y médicos</strong> que usted comparte permiten a nuestro equipo
                                brindar una atención más <strong>segura, completa y efectiva</strong>.
                            </p>
                            <p className="text-amber-800 font-medium text-sm leading-relaxed mb-4">
                                🔍 <em>Cada detalle cuenta para proteger su salud.</em>
                            </p>

                            {/* Chips de recordatorio */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {[
                                    '✅ Datos personales exactos',
                                    '✅ Información médica completa',
                                    '✅ Antecedentes familiares',
                                    '✅ Contacto de emergencia vigente',
                                ].map(item => (
                                    <span key={item}
                                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-amber-800 border border-amber-400"
                                        style={{ backgroundColor: 'rgba(251,191,36,0.25)' }}>
                                        {item}
                                    </span>
                                ))}
                            </div>

                            {/* Firma */}
                            <div className="flex items-center gap-2 pt-2 border-t border-amber-300">
                                <span className="text-amber-600 text-lg">🙏</span>
                                <p className="text-amber-700 text-sm font-bold italic">
                                    Gracias por su colaboración — <span style={{ color: '#0F75C1' }}>Sistema de Salud Institucional</span> <span style={{ color: '#292358' }}>MINPPAL</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 1: DATOS PERSONALES */}
                    <div className="bg-white shadow rounded-lg overflow-hidden border-l-4 border-accent">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                    👤 Datos Personales
                                </h2>
                                <span className="text-xs font-bold text-red-600 bg-red-100 px-3 py-1 rounded-full uppercase tracking-wider">Obligatorio</span>
                            </div>
                            <p className="text-sm text-gray-500">
                                ⚠️ Estos datos son <strong>indispensables</strong> para poder solicitar citas médicas.
                            </p>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                            {/* Nombres */}
                            <div className="lg:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombres <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="first_name"
                                    required
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                />
                            </div>

                            {/* Apellidos */}
                            <div className="lg:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="last_name"
                                    required
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                />
                            </div>

                            {/* Cédula */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cédula <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="cedula"
                                    required
                                    placeholder="V-12.345.678"
                                    value={formData.cedula}
                                    onChange={handleChange}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border bg-yellow-50 font-medium"
                                />
                            </div>

                            {/* Sexo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sexo <span className="text-red-500">*</span></label>
                                <select
                                    name="gender"
                                    required
                                    value={formData.gender}
                                    onChange={handleChange}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                >
                                    <option value="">Seleccione...</option>
                                    {GENEROS.map(g => (
                                        <option key={g.value} value={g.value}>{g.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Fecha Nacimiento */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Nacimiento <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    name="date_of_birth"
                                    required
                                    value={formData.date_of_birth}
                                    onChange={handleChange}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                />
                            </div>

                            {/* Edad (Auto) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Edad</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={formData.date_of_birth ? `${calculateAge(formData.date_of_birth)} años` : '-'}
                                    className="w-full rounded-md border-gray-200 bg-gray-100 text-gray-500 py-2 px-3 cursor-not-allowed font-medium text-center"
                                />
                            </div>

                            {/* Teléfono Personal */}
                            <div className="lg:col-span-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de Contacto <span className="text-red-500">*</span></label>
                                <input
                                    type="tel"
                                    name="contact_phone"
                                    required
                                    value={formData.contact_phone}
                                    onChange={handleChange}
                                    placeholder="0414-1234567"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 2: DATOS LABORALES / UBICACIÓN */}
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900">🏢 Datos Laborales y Ubicación</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Ente */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ente / Institución</label>
                                <select
                                    name="agency"
                                    value={formData.agency}
                                    onChange={handleChange}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                >
                                    <option value="">Seleccione...</option>
                                    {ENTES.map(e => (
                                        <option key={e} value={e}>{e}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Oficina */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Oficina / Departamento</label>
                                <select
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                >
                                    <option value="">Seleccione...</option>
                                    {OFICINAS.map(o => (
                                        <option key={o} value={o}>{o}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Ubicación Física */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación Física (Piso, Oficina, etc)</label>
                                <input
                                    type="text"
                                    name="work_location"
                                    maxLength={50}
                                    value={formData.work_location}
                                    onChange={handleChange}
                                    placeholder="Ej: Torre A, Piso 5, Oficina 502"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                />
                                <p className="mt-1 text-xs text-gray-500 text-right">{formData.work_location.length}/50 caracteres</p>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 3: DATOS FÍSICOS Y MÉDICOS */}
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900">🩺 Datos Médicos Básicos</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-6 gap-6">

                            {/* Fila 1: Peso, Talla, Sangre */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Peso (Kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    name="weight"
                                    value={formData.weight}
                                    onChange={handleChange}
                                    placeholder="70.5"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Talla (cm)</label>
                                <input
                                    type="number"
                                    name="height"
                                    value={formData.height}
                                    onChange={handleChange}
                                    placeholder="175"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Sangre</label>
                                <select
                                    name="blood_type"
                                    value={formData.blood_type}
                                    onChange={handleChange}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                >
                                    <option value="">Seleccione...</option>
                                    {TIPOS_SANGRE.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Fila 2: Alergias */}
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Alergias a Comidas</label>
                                <textarea
                                    name="allergies_food"
                                    rows={2}
                                    value={formData.allergies_food}
                                    onChange={handleChange}
                                    placeholder="Ej: Maní, Mariscos..."
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                />
                            </div>

                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Alergias a Medicamentos</label>
                                <textarea
                                    name="allergies_medicine"
                                    rows={2}
                                    value={formData.allergies_medicine}
                                    onChange={handleChange}
                                    placeholder="Ej: Penicilina, Ibuprofeno..."
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                />
                            </div>

                            {/* Fila 3: Intervenciones Físicas (Dispositivos + Cirugías) */}
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">🦴 Dispositivos Médicos</label>
                                <textarea
                                    name="medical_devices"
                                    rows={3}
                                    value={formData.medical_devices}
                                    onChange={handleChange}
                                    placeholder="Ej: Marcapasos, Malla..."
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border bg-blue-50/30"
                                />
                            </div>

                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">🔪 Cirugías Previas</label>
                                <textarea
                                    name="previous_surgeries"
                                    rows={3}
                                    value={formData.previous_surgeries}
                                    onChange={handleChange}
                                    placeholder="Ej: Apendicectomía (2015)..."
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border bg-purple-50/30"
                                />
                            </div>

                            {/* Fila 4: Enfermedades (Crónicas + Familiares) */}
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">🯠 Enfermedades Crónicas</label>
                                <textarea
                                    name="chronic_conditions"
                                    rows={3}
                                    value={formData.chronic_conditions}
                                    onChange={handleChange}
                                    placeholder="Ej: Hipertensión, Diabetes..."
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                />
                            </div>

                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">👨‍👩‍👧 Antecedentes Familiares</label>
                                <textarea
                                    name="family_diseases"
                                    rows={3}
                                    value={formData.family_diseases}
                                    onChange={handleChange}
                                    placeholder="Ej: Diabetes (Padre)..."
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border bg-orange-50/30"
                                />
                            </div>

                            {/* Fila 5: Vacunas (Full Width) */}
                            <div className="md:col-span-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">💉 Vacunas Aplicadas</label>
                                <textarea
                                    name="vaccines"
                                    rows={2}
                                    value={formData.vaccines}
                                    onChange={handleChange}
                                    placeholder="Ej: COVID-19, Anti-Gripal, Tétanos..."
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border bg-green-50/30"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 4: CONTACTO DE EMERGENCIA */}
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-medium text-gray-900">🆘 Contacto de Emergencia</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Nombre Contacto */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Persona Contacto</label>
                                <input
                                    type="text"
                                    name="emergency_contact_name"
                                    value={formData.emergency_contact_name}
                                    onChange={handleChange}
                                    placeholder="Nombre completo"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                />
                            </div>

                            {/* Teléfono Contacto */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de Emergencia</label>
                                <input
                                    type="tel"
                                    name="emergency_contact_phone"
                                    value={formData.emergency_contact_phone}
                                    onChange={handleChange}
                                    placeholder="0414-0000000"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                />
                            </div>
                        </div>
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="flex justify-end gap-4 pt-4">
                        <Link
                            href="/patient/dashboard"
                            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-8 py-3 bg-accent text-white font-bold rounded-lg hover:bg-accent-600 transition shadow-lg disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : '💾 Guardar Ficha Médica'}
                        </button>
                    </div>

                </form>
            </main>
        </div>
    );
}
