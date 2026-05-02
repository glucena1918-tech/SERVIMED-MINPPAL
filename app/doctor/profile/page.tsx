'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/utils/cropImage';

interface DoctorProfile {
    full_name: string | null;
    cedula: string | null;
    specialty: string | null;
    license_number: string | null;
    phone: string | null;
    email: string | null;
    bio: string | null;
    avatar_url: string | null;
    experience_years: number | null;
    education: string | null;
    user_id: string;
}

const ESPECIALIDADES = [
    'Medicina General',
    'Cardiología',
    'Pediatría',
    'Ginecología',
    'Dermatología',
    'Traumatología',
    'Oftalmología',
    'Odontología',
    'Psicología',
    'Nutrición',
    'Medicina Interna'
];

export default function DoctorProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estados para recorte de imagen
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const [formData, setFormData] = useState({
        full_name: '',
        cedula: '',
        specialty: '',
        license_number: '',
        phone: '',
        bio: '',
        avatar_url: '',
        experience_years: 0,
        education: ''
    });

    const isBase64 = (str: string | null) => str?.startsWith('data:image/');
    const [hasBase64, setHasBase64] = useState(false);

    // --- NUEVOS ESTADOS PARA DISPONIBILIDAD ---
    const [workingDays, setWorkingDays] = useState<Record<number, { morning: boolean, afternoon: boolean }>>({
        1: { morning: false, afternoon: false },
        2: { morning: false, afternoon: false },
        3: { morning: false, afternoon: false },
        4: { morning: false, afternoon: false },
        5: { morning: false, afternoon: false },
        6: { morning: false, afternoon: false },
        0: { morning: false, afternoon: false }
    });
    const [scheduleConfig, setScheduleConfig] = useState({
        morningStart: '07:00',
        morningEnd: '12:00',
        afternoonStart: '13:30',
        afternoonEnd: '17:30',
        slotDuration: 30,
        bufferTime: 15
    });
    // ------------------------------------------

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }

                const { data, error } = await supabase
                    .from('doctors')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;

                if (data) {
                    const doc = data as DoctorProfile;
                    setFormData({
                        full_name: doc.full_name || '',
                        cedula: doc.cedula || '',
                        specialty: doc.specialty || '',
                        license_number: doc.license_number || '',
                        phone: doc.phone || '',
                        bio: doc.bio || '',
                        avatar_url: doc.avatar_url || '',
                        experience_years: doc.experience_years || 0,
                        education: doc.education || ''
                    });
                    if (isBase64(doc.avatar_url)) setHasBase64(true);

                    // Cargar Disponibilidad
                    const { data: availData } = await supabase
                        .from('doctor_availability')
                        .select('*')
                        .eq('doctor_id', (data as any).id);

                    if (availData && availData.length > 0) {
                        const newWorkingDays: any = {};
                        [0,1,2,3,4,5,6].forEach(d => newWorkingDays[d] = { morning: false, afternoon: false });
                        
                        availData.forEach((item: any) => {
                            const day = item.day_of_week;
                            // Determinar si es mañana o tarde basado en la hora de inicio
                            const hour = parseInt(item.start_time.split(':')[0]);
                            if (hour < 12) {
                                newWorkingDays[day].morning = true;
                                setScheduleConfig(prev => ({ 
                                    ...prev, 
                                    morningStart: item.start_time.substring(0, 5),
                                    morningEnd: item.end_time.substring(0, 5)
                                }));
                            } else {
                                newWorkingDays[day].afternoon = true;
                                setScheduleConfig(prev => ({ 
                                    ...prev, 
                                    afternoonStart: item.start_time.substring(0, 5),
                                    afternoonEnd: item.end_time.substring(0, 5)
                                }));
                            }
                        });
                        setWorkingDays(newWorkingDays);
                    }
                } else {
                    setFormData(prev => ({
                        ...prev,
                        full_name: user.user_metadata?.full_name || ''
                    }));
                }
            } catch (error) {
                console.error('Error cargando perfil médico:', error);
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

            const updates = {
                user_id: user.id,
                full_name: formData.full_name,
                cedula: formData.cedula,
                specialty: formData.specialty,
                license_number: formData.license_number,
                phone: formData.phone,
                bio: formData.bio,
                avatar_url: formData.avatar_url,
                experience_years: formData.experience_years,
                education: formData.education,
                updated_at: new Date().toISOString(),
                is_active: true,
                is_verified: false
            };

            const { error: doctorUpdateError } = await (supabase as any)
                .from('doctors')
                .upsert(updates, { onConflict: 'user_id' });

            if (doctorUpdateError) throw doctorUpdateError;

            const { data: doctorData } = await (supabase as any)
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (doctorData) {
                // Actualizar Disponibilidad
                // 1. Borrar actual
                await (supabase as any).from('doctor_availability').delete().eq('doctor_id', doctorData.id);
                
                // 2. Insertar nuevos según selección
                const availToInsert = [];
                for (const dayStr in workingDays) {
                    const day = parseInt(dayStr);
                    const shifts = workingDays[day as keyof typeof workingDays];
                    
                    if (shifts.morning) {
                        availToInsert.push({
                            doctor_id: doctorData.id,
                            day_of_week: day,
                            start_time: scheduleConfig.morningStart,
                            end_time: scheduleConfig.morningEnd,
                            slot_duration: scheduleConfig.slotDuration
                        });
                    }
                    if (shifts.afternoon) {
                        availToInsert.push({
                            doctor_id: doctorData.id,
                            day_of_week: day,
                            start_time: scheduleConfig.afternoonStart,
                            end_time: scheduleConfig.afternoonEnd,
                            slot_duration: scheduleConfig.slotDuration
                        });
                    }
                }
                if (availToInsert.length > 0) {
                    await (supabase as any).from('doctor_availability').insert(availToInsert);
                }
            }

            setMessage({ type: 'success', text: '¡Perfil profesional y horario actualizados correctamente!' });
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error: any) {
            console.error('Error guardando perfil:', error);
            setMessage({ type: 'error', text: error.message || 'Error al guardar cambios' });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value 
        }));
    };

    // 1. Seleccionar archivo y abrir modal de recorte
    const onSelectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const reader = new FileReader();
            reader.readAsDataURL(event.target.files[0]);
            reader.addEventListener('load', () => {
                setImageSrc(reader.result as string);
            });
        }
    };

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    // 2. Ejecutar recorte y subir
    const uploadCroppedImage = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        try {
            setUploading(true);
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (!croppedImageBlob) throw new Error('Error al procesar el recorte de la imagen');

            // Crear una URL local para previsualización inmediata (sin esperar a Supabase)
            const localPreviewUrl = URL.createObjectURL(croppedImageBlob);
            setFormData(prev => ({ ...prev, avatar_url: localPreviewUrl }));

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuario no encontrado');

            // Simplificamos la ruta: un solo archivo por usuario para evitar acumular basura
            const filePath = `${user.id}/profile.jpg`;

            // Subir a Supabase
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, croppedImageBlob, {
                    contentType: 'image/jpeg',
                    cacheControl: '0', // Evitar caché para que se vea el cambio al instante
                    upsert: true
                });

            // Obtener la URL pública final
            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const publicUrl = data?.publicUrl;
            
            if (publicUrl) {
                // Añadir un timestamp para romper el caché del navegador
                const finalUrl = `${publicUrl}?t=${Date.now()}`;
                setFormData(prev => ({ ...prev, avatar_url: finalUrl }));
            }
            
            setHasBase64(false);
            setImageSrc(null);
            setMessage({ type: 'success', text: 'Imagen actualizada. No olvide guardar los cambios.' });

        } catch (e: any) {
            console.error('Error al recortar/subir imagen', e);
            setMessage({ type: 'error', text: 'Error procesando imagen: ' + e.message });
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Modal de Recorte */}
            {imageSrc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden flex flex-col h-[80vh] md:h-auto">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">Ajustar Foto</h3>
                            <button
                                onClick={() => setImageSrc(null)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="relative flex-1 bg-gray-900 min-h-[300px]">
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1} // Cuadrado 1:1
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Zoom</label>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setImageSrc(null)}
                                    className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={uploadCroppedImage}
                                    disabled={uploading}
                                    className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {uploading ? 'Subiendo...' : 'Aplicar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Navbar */}
            <nav className="bg-white shadow-sm border-b sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link href="/doctor/dashboard" className="flex items-center text-gray-500 hover:text-blue-600 transition-colors">
                                <span className="mr-2">←</span> Volver al Dashboard
                            </Link>
                            <div className="ml-6 h-6 w-px bg-gray-200"></div>
                            <h1 className="ml-6 text-xl font-bold text-gray-900">Mi Perfil Profesional</h1>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {message && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <span className="text-2xl mr-3">{message.type === 'success' ? '✅' : '⚠️'}</span>
                        <p className="font-medium">{message.text}</p>
                    </div>
                )}

                {hasBase64 && (
                    <div className="mb-6 p-4 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-start">
                        <span className="text-xl mr-3">🚀</span>
                        <div>
                            <p className="font-bold text-sm">Optimización de Imagen Pendiente</p>
                            <p className="text-xs mt-1">Su foto actual usa un formato antiguo que ralentiza la página. Por favor, <strong>vuelva a subir su foto</strong> para guardarla en nuestro nuevo sistema de almacenamiento de alta velocidad.</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">

                    <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                        <h2 className="text-2xl font-bold">Datos del Especialista</h2>
                        <p className="text-blue-100 text-sm mt-1">Esta información será visible para los pacientes y la administración.</p>
                    </div>

                    <div className="p-8 space-y-8">

                        {/* Foto de Perfil */}
                        <div className="flex items-center space-x-6 pb-6 border-b border-gray-100">
                            <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-gray-200 group">
                                {formData.avatar_url ? (
                                    <img
                                        src={formData.avatar_url}
                                        alt="Avatar"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-gray-400">
                                        <span className="text-3xl">📷</span>
                                    </div>
                                )}
                                {/* Overlay hover efecto */}
                                <div
                                    className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <span className="text-white text-xs font-bold">Cambiar</span>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-medium text-gray-900">Fotografía de Perfil</h3>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={onSelectFile}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100 transition disabled:opacity-50"
                                >
                                    {formData.avatar_url ? 'Cambiar Foto' : 'Subir Foto'}
                                </button>
                                <p className="text-xs text-gray-400 mt-1">Formatos permitidos: JPG, PNG. Máx 2MB.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Nombre Completo */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre y Apellidos <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="full_name"
                                    required
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    placeholder="Dr. Juan Pérez"
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border"
                                />
                            </div>

                            {/* Cédula de Identidad */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Cédula de Identidad <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="cedula"
                                    required
                                    value={formData.cedula}
                                    onChange={handleChange}
                                    placeholder="V-12345678"
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border bg-blue-50/30"
                                />
                                <p className="text-xs text-gray-500 mt-1">Su número de cédula aparecerá en los documentos médicos oficiales.</p>
                            </div>

                            {/* Especialidad */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Especialidad <span className="text-red-500">*</span></label>
                                <select
                                    name="specialty"
                                    required
                                    value={formData.specialty}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border"
                                >
                                    <option value="">Seleccione...</option>
                                    {ESPECIALIDADES.map(esp => (
                                        <option key={esp} value={esp}>{esp}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Número de Licencia */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Número de Licencia / Colegio <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="license_number"
                                    required
                                    value={formData.license_number}
                                    onChange={handleChange}
                                    placeholder="MPPS-12345"
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border bg-yellow-50/50"
                                />
                            </div>

                            {/* Teléfono Profesional */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono de Contacto Profesional <span className="text-red-500">*</span></label>
                                <input
                                    type="tel"
                                    name="phone"
                                    required
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="0414-1234567"
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border"
                                />
                                <p className="text-xs text-gray-500 mt-1">Este número será visible para coordinar citas.</p>
                            </div>

                            {/* Años de Experiencia */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Años de Experiencia <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    name="experience_years"
                                    required
                                    min="0"
                                    value={formData.experience_years}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border"
                                />
                            </div>

                            {/* Educación */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Educación y Títulos <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="education"
                                    required
                                    value={formData.education}
                                    onChange={handleChange}
                                    placeholder="Ej: Especialista en Medicina Interna - UCV"
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border"
                                />
                            </div>

                            {/* Biografía / Descripción */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Biografía Profesional (Opcional)</label>
                                <textarea
                                    name="bio"
                                    rows={4}
                                    value={formData.bio}
                                    onChange={handleChange}
                                    placeholder="Breve descripción de su experiencia y enfoque..."
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border"
                                />
                            </div>
                        </div>

                        {/* --- SECCIÓN DE HORARIO DE ATENCIÓN --- */}
                        <div className="pt-8 border-t border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                <span className="mr-2">📅</span> Configuración de Horario
                            </h3>
                            <p className="text-sm text-gray-600 mb-6">
                                Seleccione los días que atiende y defina sus bloques de horario. El sistema aplicará automáticamente un respiro de 15 min entre pacientes.
                            </p>

                            <div className="mb-8">
                                <label className="block text-sm font-semibold text-gray-700 mb-4">Seleccione sus días y turnos de atención</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { id: 1, label: 'Lunes' },
                                        { id: 2, label: 'Martes' },
                                        { id: 3, label: 'Miércoles' },
                                        { id: 4, label: 'Jueves' },
                                        { id: 5, label: 'Viernes' },
                                        { id: 6, label: 'Sábado' },
                                        { id: 0, label: 'Domingo' }
                                    ].map((day) => {
                                        const isActive = workingDays[day.id as keyof typeof workingDays].morning || workingDays[day.id as keyof typeof workingDays].afternoon;
                                        return (
                                            <div 
                                                key={day.id} 
                                                className={`p-4 rounded-xl border transition-all ${isActive ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-100 opacity-60'}`}
                                            >
                                                <p className={`font-bold mb-3 ${isActive ? 'text-blue-700' : 'text-gray-400'}`}>{day.label}</p>
                                                <div className="space-y-2">
                                                    <label className="flex items-center text-sm cursor-pointer group">
                                                        <input 
                                                            type="checkbox"
                                                            checked={workingDays[day.id as keyof typeof workingDays].morning}
                                                            onChange={(e) => setWorkingDays(prev => ({
                                                                ...prev,
                                                                [day.id]: { ...prev[day.id as keyof typeof workingDays], morning: e.target.checked }
                                                            }))}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                                                        />
                                                        <span className={workingDays[day.id as keyof typeof workingDays].morning ? 'text-blue-900 font-medium' : 'text-gray-400'}>☀️ Mañana</span>
                                                    </label>
                                                    <label className="flex items-center text-sm cursor-pointer group">
                                                        <input 
                                                            type="checkbox"
                                                            checked={workingDays[day.id as keyof typeof workingDays].afternoon}
                                                            onChange={(e) => setWorkingDays(prev => ({
                                                                ...prev,
                                                                [day.id]: { ...prev[day.id as keyof typeof workingDays], afternoon: e.target.checked }
                                                            }))}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                                                        />
                                                        <span className={workingDays[day.id as keyof typeof workingDays].afternoon ? 'text-blue-900 font-medium' : 'text-gray-400'}>🌇 Tarde</span>
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                                {/* Bloque Mañana */}
                                <div>
                                    <div className="flex items-center mb-4">
                                        <span className="text-lg mr-2">☀️</span>
                                        <h4 className="font-bold text-gray-900">Turno Mañana</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Inicio</label>
                                            <input
                                                type="time"
                                                value={scheduleConfig.morningStart}
                                                onChange={(e) => setScheduleConfig(prev => ({ ...prev, morningStart: e.target.value }))}
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fin</label>
                                            <input
                                                type="time"
                                                value={scheduleConfig.morningEnd}
                                                onChange={(e) => setScheduleConfig(prev => ({ ...prev, morningEnd: e.target.value }))}
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Bloque Tarde */}
                                <div>
                                    <div className="flex items-center mb-4">
                                        <span className="text-lg mr-2">🌇</span>
                                        <h4 className="font-bold text-gray-900">Turno Tarde</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Inicio</label>
                                            <input
                                                type="time"
                                                value={scheduleConfig.afternoonStart}
                                                onChange={(e) => setScheduleConfig(prev => ({ ...prev, afternoonStart: e.target.value }))}
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fin</label>
                                            <input
                                                type="time"
                                                value={scheduleConfig.afternoonEnd}
                                                onChange={(e) => setScheduleConfig(prev => ({ ...prev, afternoonEnd: e.target.value }))}
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 p-4 bg-white/60 rounded-lg border border-white flex items-center justify-between">
                                    <div className="flex items-center">
                                        <span className="text-xl mr-3">🕒</span>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">Regla de Atención</p>
                                            <p className="text-xs text-gray-500">Citas de 30 min + 15 min de respiro</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">Almuerzo bloqueado: 12:00 - 13:30</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end pt-6 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-lg disabled:opacity-50 flex items-center"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Guardando...
                                    </>
                                ) : (
                                    '💾 Guardar Perfil'
                                )}
                            </button>
                        </div>

                    </div>
                </form>
            </main>
        </div>
    );
}
