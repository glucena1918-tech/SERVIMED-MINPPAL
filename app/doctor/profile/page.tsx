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
        avatar_url: ''
    });

    const isBase64 = (str: string | null) => str?.startsWith('data:image/');
    const [hasBase64, setHasBase64] = useState(false);

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
                        avatar_url: doc.avatar_url || ''
                    });
                    if (isBase64(doc.avatar_url)) setHasBase64(true);
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
                updated_at: new Date().toISOString(),
                is_active: true,
                is_verified: false
            };

            const { error } = await supabase
                .from('doctors')
                .upsert(updates as any, { onConflict: 'user_id' });

            if (error) throw error;

            setMessage({ type: 'success', text: '¡Perfil profesional actualizado correctamente!' });
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error: any) {
            console.error('Error guardando perfil:', error);
            setMessage({ type: 'error', text: error.message || 'Error al guardar cambios' });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuario no encontrado');

            const fileName = `${user.id}/${Date.now()}.jpg`;
            const filePath = fileName;

            // Subir a Supabase
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, croppedImageBlob, {
                    contentType: 'image/jpeg',
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
            setHasBase64(false);
            setImageSrc(null); // Cerrar modal
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
