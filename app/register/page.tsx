'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#020714] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06D6A0]"></div>
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roleParam = searchParams.get('role') || 'patient';

    const [role, setRole] = useState<'patient' | 'doctor'>(roleParam as 'patient' | 'doctor');
    const [fullName, setFullName] = useState('');
    const [cedula, setCedula] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
            // REGISTRO ORIGINAL: Cédula + PIN
            console.log('📝 Registrando con Cédula:', cedula);

            // Registrar usuario en Supabase Auth usando la cédula como email/identificador
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: cedula.trim(),
                password,
                options: {
                    data: {
                        role,
                        full_name: fullName,
                        real_email: email, // Guardamos el correo real para notificaciones opcionales
                    },
                },
            });

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    throw new Error('Esta cédula ya se encuentra registrada en el sistema.');
                }
                throw signUpError;
            }

            if (authData.user) {
                // Crear perfil en la tabla correspondiente
                if (role === 'doctor') {
                    const { error: dbError } = await (supabase as any)
                        .from('doctors')
                        .insert({
                            user_id: authData.user?.id,
                            full_name: fullName,
                            cedula: cedula.trim(),
                            email: email.trim(), 
                            specialty: specialty,
                            license_number: licenseNumber,
                            is_verified: false,
                            is_active: true,
                        });

                    if (dbError) throw dbError;
                } else {
                    const { error: dbError } = await (supabase as any)
                        .from('patients')
                        .insert({
                            user_id: authData.user?.id,
                            full_name: fullName,
                            cedula: cedula.trim(),
                            email: email.trim(), 
                            date_of_birth: '1990-01-01', 
                            gender: 'other',
                        });

                    if (dbError) throw dbError;
                }

                alert('¡Registro exitoso! Ya puede ingresar con su Cédula y PIN.');
                window.location.href = '/login';
            }
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'Error al registrarse.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-6 relative"
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
                        onClick={() => {
                            setRole('patient');
                            router.push('/register?role=patient', { scroll: false });
                        }}
                        className="flex-1 py-4 px-4 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95"
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
                        onClick={() => {
                            setRole('doctor');
                            router.push('/register?role=doctor', { scroll: false });
                        }}
                        className="flex-1 py-4 px-4 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95"
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
                            <label htmlFor="cedula" className="block text-sm font-semibold text-white/70 mb-2 uppercase tracking-wider">
                                Cédula de Identidad
                            </label>
                            <input
                                id="cedula"
                                type="text"
                                required
                                value={cedula}
                                onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                                className="w-full px-4 py-3 rounded-xl border border-white/15 text-white placeholder-white/30 focus:outline-none transition"
                                style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                                onFocus={e => (e.target.style.boxShadow = '0 0 0 2px #06D6A0')}
                                onBlur={e => (e.target.style.boxShadow = 'none')}
                                placeholder="Solo números (Ej: 12345678)"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-white/70 mb-2 uppercase tracking-wider">
                                Correo Electrónico (Para Control)
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
                                PIN de Acceso (6 dígitos)
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                minLength={6}
                                maxLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
                                className="w-full px-4 py-3 rounded-xl border border-white/15 text-white placeholder-white/30 focus:outline-none transition tracking-[0.3em]"
                                style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                                onFocus={e => (e.target.style.boxShadow = '0 0 0 2px #06D6A0')}
                                onBlur={e => (e.target.style.boxShadow = 'none')}
                                placeholder="••••••"
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
