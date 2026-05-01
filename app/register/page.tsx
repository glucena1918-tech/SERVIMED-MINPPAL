'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roleParam = searchParams.get('role') || 'patient';

    const [role, setRole] = useState<'patient' | 'doctor'>(roleParam as 'patient' | 'doctor');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const newRole = searchParams.get('role') as 'patient' | 'doctor';
        if (newRole) setRole(newRole);
    }, [searchParams]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Registrar usuario en Supabase Auth
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        role,
                        full_name: fullName,
                    },
                },
            });

            if (signUpError) {
                // Mejorar mensajes de error
                if (signUpError.message.includes('already registered')) {
                    throw new Error('Este correo electrónico ya está registrado. Por favor, inicia sesión.');
                }
                throw signUpError;
            }

            if (authData.user) {
                // Crear perfil en la tabla correspondiente
                if (role === 'doctor') {
                    const { error: doctorError } = await supabase
                        .from('doctors')
                        .insert({
                            user_id: authData.user.id,
                            full_name: fullName,
                            specialty,
                            license_number: licenseNumber,
                            is_verified: false,
                            is_active: true,
                        });

                    if (doctorError) {
                        console.error('Error creating doctor profile:', doctorError);
                        throw new Error('Error al crear el perfil del médico. Por favor, contacta al administrador.');
                    }
                } else {
                    const { error: patientError } = await supabase
                        .from('patients')
                        .insert({
                            user_id: authData.user.id,
                            full_name: fullName,
                            date_of_birth: '1990-01-01', // Placeholder
                            gender: 'other',
                        });

                    if (patientError) {
                        console.error('Error creating patient profile:', patientError);
                        throw new Error('Error al crear el perfil del paciente. Por favor, contacta al administrador.');
                    }
                }

                // Redirigir a login con mensaje de éxito
                alert('¡Cuenta creada exitosamente! Por favor, inicia sesión.');
                window.location.href = '/login';
            }
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'Error al registrarse. Por favor, intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
            style={{ backgroundColor: '#020714' }}
        >
            {/* Background Image */}
            <img
                src="/images/bg-login.jpeg"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: 0.75 }}
            />
            {/* Overlay */}
            <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(135deg, rgba(2,7,20,0.45) 0%, rgba(10,36,99,0.35) 100%)' }}
            />

            <div className="relative z-10 w-full max-w-md py-8">
                {/* Logo y Título */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 overflow-hidden rounded-2xl border-2 border-accent/40 shadow-xl shadow-accent/20">
                            <img
                                src="/images/logo-minppal.png"
                                alt="Logo"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                    <h1 className="text-xl font-black text-white mb-1 tracking-tight leading-tight">
                        Sistema de Salud Institucional <br />
                        <span className="text-white/70">MINPPAL</span>
                    </h1>
                    <p className="text-white/60 mt-2 text-sm">
                        Crear cuenta como {role === 'patient' ? 'Paciente' : 'Médico'}
                    </p>
                </div>

                {/* Selector de Rol */}
                <div className="flex gap-3 mb-5">
                    <button
                        type="button"
                        onClick={() => router.push('/register?role=patient')}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300"
                        style={{
                            backgroundColor: role === 'patient' ? '#06D6A0' : 'rgba(255,255,255,0.08)',
                            color: role === 'patient' ? '#020714' : 'rgba(255,255,255,0.7)',
                            border: '1px solid',
                            borderColor: role === 'patient' ? '#06D6A0' : 'rgba(255,255,255,0.12)',
                        }}
                    >
                        👤 Paciente
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/register?role=doctor')}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300"
                        style={{
                            backgroundColor: role === 'doctor' ? '#06D6A0' : 'rgba(255,255,255,0.08)',
                            color: role === 'doctor' ? '#020714' : 'rgba(255,255,255,0.7)',
                            border: '1px solid',
                            borderColor: role === 'doctor' ? '#06D6A0' : 'rgba(255,255,255,0.12)',
                        }}
                    >
                        👨‍⚕️ Médico
                    </button>
                </div>

                {/* Formulario con Glasmorfismo */}
                <div
                    className="rounded-3xl p-8 border border-white/10 shadow-2xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}
                >
                    <form onSubmit={handleRegister} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/20 border border-red-400/30 text-red-300 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="fullName" className="block text-sm font-semibold text-white/70 mb-2 uppercase tracking-wider">
                                Nombre Completo
                            </label>
                            <input
                                id="fullName"
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-white/15 text-white placeholder-white/30 focus:outline-none transition"
                                style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                                onFocus={e => (e.target.style.boxShadow = '0 0 0 2px #06D6A0')}
                                onBlur={e => (e.target.style.boxShadow = 'none')}
                                placeholder={role === 'patient' ? 'Juan Pérez' : 'Dr. Juan Pérez'}
                            />
                        </div>

                        {role === 'doctor' && (
                            <>
                                <div>
                                    <label htmlFor="specialty" className="block text-sm font-semibold text-white/70 mb-2 uppercase tracking-wider">
                                        Especialidad
                                    </label>
                                    <input
                                        id="specialty"
                                        type="text"
                                        required
                                        value={specialty}
                                        onChange={(e) => setSpecialty(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-white/15 text-white placeholder-white/30 focus:outline-none transition"
                                        style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                                        onFocus={e => (e.target.style.boxShadow = '0 0 0 2px #06D6A0')}
                                        onBlur={e => (e.target.style.boxShadow = 'none')}
                                        placeholder="Cardiología"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="license" className="block text-sm font-semibold text-white/70 mb-2 uppercase tracking-wider">
                                        Número de Licencia
                                    </label>
                                    <input
                                        id="license"
                                        type="text"
                                        required
                                        value={licenseNumber}
                                        onChange={(e) => setLicenseNumber(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-white/15 text-white placeholder-white/30 focus:outline-none transition"
                                        style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                                        onFocus={e => (e.target.style.boxShadow = '0 0 0 2px #06D6A0')}
                                        onBlur={e => (e.target.style.boxShadow = 'none')}
                                        placeholder="MED-VE-123456"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-white/70 mb-2 uppercase tracking-wider">
                                Correo Electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-white/15 text-white placeholder-white/30 focus:outline-none transition"
                                style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                                onFocus={e => (e.target.style.boxShadow = '0 0 0 2px #06D6A0')}
                                onBlur={e => (e.target.style.boxShadow = 'none')}
                                placeholder="tu@email.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-white/70 mb-2 uppercase tracking-wider">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-white/15 text-white placeholder-white/30 focus:outline-none transition"
                                style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                                onFocus={e => (e.target.style.boxShadow = '0 0 0 2px #06D6A0')}
                                onBlur={e => (e.target.style.boxShadow = 'none')}
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full text-white font-black py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm hover:-translate-y-0.5 mt-2"
                            style={{ backgroundColor: '#06D6A0', boxShadow: '0 8px 30px rgba(6,214,160,0.35)' }}
                        >
                            {loading ? 'Registrando...' : 'Crear Cuenta'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-white/50">
                            ¿Ya tienes cuenta?{' '}
                            <Link href="/login" className="font-bold hover:underline" style={{ color: '#06D6A0' }}>
                                Inicia Sesión
                            </Link>
                        </p>
                        <Link href="/" className="block mt-4 text-sm text-white/30 hover:text-white/60 transition-colors">
                            ← Volver al inicio
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
