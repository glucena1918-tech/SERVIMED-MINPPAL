'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast, Toaster } from 'react-hot-toast';

export default function UnifiedAdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const checkExistingSession = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await handleStrictRoleValidation(user.email!);
            } else {
                setLoading(false);
            }
        };
        checkExistingSession();
    }, []);

    const handleStrictRoleValidation = async (userEmail: string) => {
        const cleanEmail = userEmail.trim().toLowerCase();
        
        // 1. Validar Administrador Maestro
        if (cleanEmail === 'goldengrovessoul@gmail.com') {
            router.replace('/admin/dashboard');
            return;
        }

        // 2. Validar Secretaria
        const { data: secData, error: secError } = await (supabase as any)
            .from('secretaries')
            .select('*')
            .ilike('email', cleanEmail)
            .single();

        if (!secError && secData && secData.status === 'active') {
            router.replace('/secretary/dashboard');
            return;
        }

        // 3. RECHAZO AGRESIVO Y EXPULSIÓN
        await supabase.auth.signOut();
        toast.error('¡USTED NO ESTÁ AUTORIZADO PARA INGRESAR A ESTA ÁREA RESTRINGIDA!', {
            duration: 4000,
            style: { 
                background: '#7f1d1d', 
                color: '#fff', 
                fontWeight: '900', 
                fontSize: '14px',
                border: '2px solid #ef4444',
                padding: '20px',
                textAlign: 'center'
            },
            icon: '🚫'
        });

        // Esperar y Sacar
        setTimeout(() => {
            router.replace('/');
        }, 3000);

        setLoading(false);
        setIsSubmitting(false);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const cleanEmail = email.trim().toLowerCase();
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password,
            });
            if (signInError) throw signInError;
            if (data.user) {
                await handleStrictRoleValidation(data.user.email!);
            }
        } catch (err: any) {
            toast.error('CREDENCIALES INVÁLIDAS');
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
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#050101]">
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
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4 block text-left">Identificación</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Correo Institucional"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-red-600 outline-none transition-all shadow-inner text-lg disabled:opacity-50"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4 block text-left">Seguridad</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-red-600 outline-none transition-all shadow-inner text-lg disabled:opacity-50"
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
