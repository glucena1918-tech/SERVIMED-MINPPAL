'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
    const router = useRouter();
    const [cedula, setCedula] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // AUTO-REDIRECCIÓN: Si ya hay sesión, validar ROL
    useEffect(() => {
        const checkActiveSession = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const userRole = user.app_metadata?.role || user.user_metadata?.role;
                    if (userRole === 'doctor') router.replace('/doctor/dashboard');
                    else if (userRole === 'admin') router.replace('/login/admin');
                    else router.replace('/patient/dashboard');
                } else {
                    setIsChecking(false);
                }
            } catch (err) {
                console.error('Error in session check:', err);
                setIsChecking(false);
            }
        };
        checkActiveSession();
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // GENERACIÓN DE IDENTIDAD SINTÉTICA
            // Convertimos la cédula en un correo técnico para Supabase Auth
            const syntheticEmail = `${cedula.trim()}@servimed.com`;

            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: syntheticEmail,
                password: pin,
            });

            if (signInError) {
                // Manejo de errores amigable
                if (signInError.message.includes('Invalid login credentials')) {
                    throw new Error('Cédula o PIN incorrectos. Verifique sus datos.');
                }
                throw signInError;
            }

            if (data.user) {
                const userRole = data.user.app_metadata?.role || data.user.user_metadata?.role;
                if (userRole === 'doctor') {
                    router.replace('/doctor/dashboard');
                } else {
                    router.replace('/patient/dashboard');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Error de acceso');
            setLoading(false);
        }
    };

    if (isChecking) {
        return (
            <div className="min-h-screen bg-[#020714] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020714] flex items-center justify-center p-4 relative overflow-hidden">
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

            <div className="relative z-10 w-full max-w-md animate-fade-in">
                <div className="text-center mb-10">
                    <div className="inline-block p-4 rounded-3xl bg-white/5 border border-white/10 mb-6 shadow-2xl backdrop-blur-xl">
                        <img src="/images/logo-minppal.png" alt="Logo" className="w-16 h-16 object-cover rounded-2xl" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">SERVIMED <span className="text-accent">MINPPAL</span></h1>
                    <p className="text-white/40 text-sm font-medium uppercase tracking-[0.3em]">Gestión de Salud Institucional</p>
                </div>

                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-sm font-bold text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4 text-left block">Cédula de Identidad</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={cedula}
                                    onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 focus:border-accent outline-none transition-all"
                                    placeholder="Ej: 12345678"
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/10 font-bold">V-</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4 text-left block">PIN de Acceso (6 dígitos)</label>
                            <input
                                type="password"
                                required
                                maxLength={6}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 focus:border-accent outline-none transition-all tracking-[0.5em]"
                                placeholder="••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-accent hover:bg-[#05c492] text-[#020714] font-black py-5 rounded-2xl shadow-xl shadow-accent/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {loading ? 'Validando...' : 'Iniciar Sesión'}
                        </button>
                    </form>


                    <div className="mt-8 pt-8 border-t border-white/5 flex flex-col gap-4">
                        <Link href="/register" className="w-full py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest text-center hover:bg-white/10 hover:border-accent/40 transition-all">
                            ¿No tienes cuenta? <span className="text-accent">Regístrate</span>
                        </Link>
                        <Link href="/" className="text-white/20 hover:text-white text-[10px] font-black uppercase tracking-widest text-center transition-colors">
                            ← Volver al inicio
                        </Link>
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
                .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
                .animate-shake { animation: shake 0.4s ease-in-out; }
            ` }} />
        </div>
    );
}
