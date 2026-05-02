'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast, Toaster } from 'react-hot-toast';

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.user) {
                // El fallback que pusimos en el login general también funcionará aquí
                // Pero lo forzamos por seguridad
                window.location.replace('/admin/dashboard');
            }
        } catch (err: any) {
            console.error('Error:', err);
            toast.error(err.message === 'Invalid login credentials' 
                ? 'Credenciales no encontradas. Asegúrate de haber registrado este correo primero.' 
                : err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#020714]">
            <Toaster position="top-right" />
            
            {/* Background Image - La que elegiste */}
            <div className="absolute inset-0 z-0">
                <img 
                    src="/images/bg-admin.jpeg" 
                    alt="Admin Background" 
                    className="w-full h-full object-cover opacity-50"
                    style={{ filter: 'brightness(30%) contrast(110%)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#020714] via-transparent to-[#020714]/40" />
            </div>

            <div className="relative z-10 w-full max-w-lg">
                {/* Logo y Encabezado */}
                <div className="text-center mb-12 animate-fade-in">
                    <div className="inline-flex items-center gap-4 mb-6">
                        <div className="w-20 h-20 overflow-hidden rounded-[2rem] border-4 border-accent/40 shadow-2xl shadow-accent/20 bg-white/10 backdrop-blur-md p-1">
                            <img
                                src="/images/logo-minppal.png"
                                alt="Logo"
                                className="w-full h-full object-cover rounded-[1.5rem]"
                            />
                        </div>
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                        Acceso Restringido - Personal Autorizado
                    </div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">
                        Panel de <span className="text-accent">Administración</span>
                    </h1>
                    <p className="text-white/40 font-medium">Control Central de Servicios Médicos MINPPAL</p>
                </div>

                {/* Formulario Glassmorphism */}
                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-12 rounded-[3rem] shadow-2xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <form onSubmit={handleLogin} className="space-y-8">
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-4">
                                Identificador de Usuario
                            </label>
                            <input 
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="usuario@admin.com"
                                className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-4">
                                Código de Seguridad
                            </label>
                            <input 
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-accent text-white font-black rounded-2xl shadow-xl shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? 'AUTENTICANDO...' : 'INICIAR SESIÓN ADM'}
                            <span className="text-lg">→</span>
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-white/5 text-center">
                        <Link href="/" className="text-white/30 hover:text-white text-xs font-bold transition-colors">
                            ← Volver al Portal Público
                        </Link>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
}
