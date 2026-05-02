'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast, Toaster } from 'react-hot-toast';

export default function SecretaryLoginPage() {
    const router = useRouter();
    const [cedula, setCedula] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const cleanCedula = cedula.trim();
            const syntheticEmail = `${cleanCedula}@servimed.com`;

            // 1. Intentar el login con el correo sintético y el PIN
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: syntheticEmail,
                password: pin,
            });

            if (signInError) throw signInError;

            if (data.user) {
                // 2. VALIDACIÓN: ¿Está en la tabla de secretarías y activa?
                const { data: secData, error: secError } = await (supabase as any)
                    .from('secretaries')
                    .select('*')
                    .eq('cedula', cleanCedula)
                    .single();

                if (secError || !secData) {
                    await supabase.auth.signOut();
                    toast.error('ACCESO DENEGADO: No posee credenciales administrativas habilitadas.');
                    setLoading(false);
                    return;
                }

                if (secData.status !== 'active') {
                    await supabase.auth.signOut();
                    toast.error('ACCESO DENEGADO: Su cuenta se encuentra inactiva.');
                    setLoading(false);
                    return;
                }

                toast.success('Acceso Autorizado - Gestión Administrativa');
                setTimeout(() => {
                    window.location.replace('/secretary/dashboard');
                }, 1000);
            }
        } catch (err: any) {
            toast.error('Error de Autenticación: Verifique Cédula y PIN');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#050101]">
            <Toaster position="top-center" />
            
            {/* Background Estético */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-900/40 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-950/20 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-6">
                        <div className="w-16 h-16 overflow-hidden rounded-2xl border-2 border-red-500/30 shadow-2xl shadow-red-500/20">
                            <img src="/images/logo-minppal.png" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter">
                        PORTAL <span className="text-red-500">ADMINISTRATIVO</span>
                    </h1>
                    <p className="text-white/40 mt-2 text-xs font-bold uppercase tracking-[0.3em]">Acceso de Secretaría</p>
                </div>

                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Cédula Administrativa</label>
                            <input
                                type="text"
                                required
                                value={cedula}
                                onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                                placeholder="Ingrese su Cédula"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 focus:border-red-500 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">PIN de Seguridad (6 dígitos)</label>
                            <input
                                type="password"
                                required
                                maxLength={6}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                placeholder="••••••"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 focus:border-red-500 outline-none transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-red-900/20 transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
                        >
                            {loading ? 'AUTENTICANDO...' : 'INGRESAR AL SISTEMA'}
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-8 border-t border-white/5">
                        <Link href="/" className="text-[10px] font-black text-white/20 hover:text-white uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                            <span>←</span> Volver al Portal Principal
                        </Link>
                    </div>
                </div>
                
                <p className="mt-8 text-center text-[10px] font-bold text-white/10 uppercase tracking-[0.2em]">
                    SISTEMA DE SEGURIDAD INTEGRAL MINPPAL © 2026
                </p>
            </div>
        </div>
    );
}
