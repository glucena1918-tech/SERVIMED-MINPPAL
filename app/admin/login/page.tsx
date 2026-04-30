'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

export default function AdminLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Lógica de "Usuario Maestro"
            // Solo permitimos el usuario exacto 'Talento_Humano'
            if (username !== 'Talento_Humano') {
                throw new Error('Credenciales inválidas');
            }

            // Internamente usamos un email oculto para la autenticación real en Supabase
            // Esto mantiene la seguridad de cifrado de Supabase pero permite el login con "Usuario"
            const hiddenEmail = 'admin.maestro@servimed.com';

            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: hiddenEmail,
                password: password,
            });

            if (signInError) throw signInError;

            if (data.user) {
                // Verificar que tenga el rol de admin
                const userRole = data.user.app_metadata?.role || data.user.user_metadata?.role;

                if (userRole !== 'admin') {
                    throw new Error('Acceso denegado: No tiene permisos de administrador');
                }

                // Éxito: Navegar al dashboard
                window.location.replace('/admin/dashboard');
            }
        } catch (err: any) {
            console.error('Error de login admin:', err);
            setError('Credenciales inválidas o acceso denegado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Logo y Título */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600 rounded-lg mb-6 shadow-lg shadow-red-500/20">
                        <span className="text-white font-bold text-3xl">🛡️</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Acceso Restringido</h1>
                    <p className="text-gray-400 text-sm tracking-widest uppercase">Solo Personal Autorizado</p>
                </div>

                {/* Formulario */}
                <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm flex items-center">
                                <span className="mr-2">⚠️</span> {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                                Usuario Maestro
                            </label>
                            <input
                                id="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition placeholder-gray-600"
                                placeholder="Ingrese usuario maestro"
                                autoComplete="off"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                Contraseña de Seguridad
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition placeholder-gray-600"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
                        >
                            {loading ? 'Verificando...' : 'Acceder al Sistema'}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-gray-700">
                        <Link href="/" className="text-sm text-gray-500 hover:text-white transition-colors flex items-center justify-center">
                            ← Volver al inicio
                        </Link>
                    </div>
                </div>

                <p className="mt-6 text-center text-xs text-gray-600">
                    Sistema de Seguridad Servimed Minppal v2.0
                </p>
            </div>
        </div>
    );
}
