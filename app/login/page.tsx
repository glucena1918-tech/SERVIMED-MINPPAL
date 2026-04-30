'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            console.log('🔐 Intentando login con:', email);

            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                console.error('❌ Error en signIn:', signInError);
                throw signInError;
            }

            if (data.user) {
                console.log('✅ Login exitoso. Usuario:', data.user.email);
                console.log('📋 Metadatos:', {
                    app_metadata: data.user.app_metadata,
                    user_metadata: data.user.user_metadata
                });

                // Obtener el rol del usuario
                const userRole = data.user.app_metadata?.role || data.user.user_metadata?.role;
                console.log('👤 Rol detectado:', userRole);

                // Redirigir según el rol
                let redirectPath = '/patient/dashboard'; // Default

                switch (userRole) {
                    case 'admin':
                        redirectPath = '/admin/dashboard';
                        break;
                    case 'doctor':
                        redirectPath = '/doctor/dashboard';
                        break;
                    case 'patient':
                    default:
                        redirectPath = '/patient/dashboard';
                        break;
                }

                console.log('🚀 Redirigiendo a:', redirectPath);

                // Usar location.replace para navegación sin historial
                // Esto evita problemas de CSP y asegura navegación limpia
                window.location.replace(redirectPath);

                // No ejecutar setLoading(false) - la página va a recargar de todos modos
                return;
            }
        } catch (err: any) {
            console.error('💥 Error en handleLogin:', err);
            setError(err.message || 'Error al iniciar sesión');
            setLoading(false); // Solo set loading false si hay error
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
            style={{ backgroundColor: '#020714' }}
        >
            {/* Background Image */}
            <img
                src="https://images.pexels.com/photos/9062165/pexels-photo-9062165.jpeg"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: 0.75 }}
            />
            {/* Overlay */}
            <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(135deg, rgba(2,7,20,0.45) 0%, rgba(10,36,99,0.35) 100%)' }}
            />

            <div className="relative z-10 w-full max-w-md">
                {/* Logo y Título */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 overflow-hidden rounded-2xl border-2 border-accent/40 shadow-xl shadow-accent/20">
                            <img
                                src="https://images.pexels.com/photos/37340896/pexels-photo-37340896.png"
                                alt="Logo"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                    <h1 className="text-2xl font-black text-white mb-1 tracking-tight leading-tight">
                        Sistema de Salud <br /> Institucional <span className="text-white/70">MINPPAL</span>
                    </h1>
                    <p className="text-white/60 mt-3 text-sm">Inicia sesión en tu cuenta</p>
                </div>

                {/* Formulario con Glasmorfismo */}
                <div
                    className="rounded-3xl p-8 border border-white/10 shadow-2xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}
                >
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/20 border border-red-400/30 text-red-300 px-4 py-3 rounded-xl text-sm backdrop-blur-sm">
                                {error}
                            </div>
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
                                className="w-full px-4 py-3 rounded-xl border border-white/15 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:border-transparent transition"
                                style={{ backgroundColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)' }}
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
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-white/15 text-white placeholder-white/30 focus:outline-none transition"
                                style={{ backgroundColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)' }}
                                onFocus={e => (e.target.style.boxShadow = '0 0 0 2px #06D6A0')}
                                onBlur={e => (e.target.style.boxShadow = 'none')}
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full text-white font-black py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm hover:-translate-y-0.5"
                            style={{ backgroundColor: '#06D6A0', boxShadow: '0 8px 30px rgba(6,214,160,0.35)' }}
                        >
                            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                        </button>
                    </form>

                    <div className="mt-6 text-center space-y-3">
                        <p className="text-sm text-white/50">
                            ¿No tienes cuenta?{' '}
                            <Link href="/register?role=patient" className="font-bold hover:underline" style={{ color: '#06D6A0' }}>
                                Regístrate como Paciente
                            </Link>
                        </p>
                        <p className="text-sm text-white/50">
                            ¿Eres médico?{' '}
                            <Link href="/register?role=doctor" className="font-bold hover:underline" style={{ color: '#06D6A0' }}>
                                Regístrate como Médico
                            </Link>
                        </p>
                        <Link href="/" className="block text-sm text-white/30 hover:text-white/60 transition-colors mt-2">
                            ← Volver al inicio
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
