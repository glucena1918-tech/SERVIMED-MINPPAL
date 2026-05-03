'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast, Toaster } from 'react-hot-toast';

export default function UnifiedAdminLoginPage() {
    const router = useRouter();
    const [cedula, setCedula] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const checkExistingSession = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const userRole = user.app_metadata?.role || user.user_metadata?.role;
                if (userRole === 'admin') router.replace('/admin/dashboard');
                else if (userRole === 'secretary') router.replace('/secretary/dashboard');
                else {
                    await supabase.auth.signOut();
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };
        checkExistingSession();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // GENERACIÓN DE IDENTIDAD SINTÉTICA ADMIN
            const syntheticEmail = `${cedula.trim()}@servimed.com`;

            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: syntheticEmail,
                password: pin,
            });

            if (signInError) throw signInError;

            if (data.user) {
                const userRole = data.user.app_metadata?.role || data.user.user_metadata?.role;
                
                if (userRole === 'admin') {
                    router.replace('/admin/dashboard');
                } else if (userRole === 'secretary') {
                    router.replace('/secretary/dashboard');
                } else {
                    // Si no es admin ni secretaria, lo expulsamos de este portal
                    await supabase.auth.signOut();
                    toast.error('¡ACCESO DENEGADO: NO TIENE ROL ADMINISTRATIVO!');
                    setIsSubmitting(false);
                }
            }
        } catch (err: any) {
            toast.error('CÉDULA O PIN INVÁLIDOS');
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050101] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative bg-[#050101]">
            <Toaster position="top-center" />
            
            <div className="absolute inset-0 opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-red-900/20 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-red-950/10 blur-[150px] rounded-full" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="text-center mb-12">
                    <div className="inline-block p-5 bg-white/5 rounded-3xl border border-white/10 mb-8 shadow-2xl backdrop-blur-2xl">
                        <img src="/images/logo-minppal.png" alt="Logo" className="w-28 h-28 object-cover rounded-2xl" />
                    </div>
                    <h1 className="text-4xl font-black text-red-600 tracking-tighter uppercase leading-none drop-shadow-[0_5px_15px_rgba(220,38,38,0.4)]">
                        SOLO PERSONAL <br /> ADMINISTRATIVO
                    </h1>
                </div>

                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4 block text-left">Cédula Administrativa</label>
                            <input
                                type="text"
                                required
                                value={cedula}
                                onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                                placeholder="Ej: 12345678"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-red-600 outline-none transition-all shadow-inner text-lg disabled:opacity-50"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4 block text-left">PIN de Seguridad</label>
                            <input
                                type="password"
                                required
                                maxLength={6}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                placeholder="••••••"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-red-600 outline-none transition-all shadow-inner text-lg disabled:opacity-50 tracking-[0.5em]"
                                disabled={isSubmitting}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-2xl shadow-2xl shadow-red-900/20 transition-all active:scale-95 disabled:bg-red-900 disabled:opacity-80 text-xl uppercase tracking-[0.2em]"
                        >
                            {isSubmitting ? 'VERIFICANDO...' : 'Entrar'}
                        </button>
                    </form>


                    <div className="mt-8 text-center pt-8 border-t border-white/5">
                        <Link href="/" className="text-[10px] font-black text-white/20 hover:text-white uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                            ← Volver al Inicio Público
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
