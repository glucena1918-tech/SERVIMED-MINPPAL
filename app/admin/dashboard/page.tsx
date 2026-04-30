'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [adminData, setAdminData] = useState<any>(null);

    useEffect(() => {
        const loadAdminData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    router.push('/login');
                    return;
                }

                setAdminData(user);
            } catch (error) {
                console.error('Error al cargar datos:', error);
            } finally {
                setLoading(false);
            }
        };

        loadAdminData();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">A</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Panel de Administración</h1>
                            <p className="text-sm text-gray-500">
                                {adminData?.user_metadata?.full_name || adminData?.email}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Métricas */}
                    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
                        <div className="bg-primary-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                            <span className="text-2xl">📊</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Métricas y KPIs</h3>
                        <p className="text-gray-600 text-sm mb-4">
                            Demanda, patologías, estadísticas
                        </p>
                        <button className="text-accent hover:text-accent/80 font-medium text-sm">
                            Ver métricas →
                        </button>
                    </div>

                    {/* Usuarios */}
                    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
                        <div className="bg-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                            <span className="text-2xl">👥</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestión de Usuarios</h3>
                        <p className="text-gray-600 text-sm mb-4">
                            Administrar pacientes y médicos
                        </p>
                        <button className="text-accent hover:text-accent/80 font-medium text-sm">
                            Gestionar →
                        </button>
                    </div>

                    {/* Médicos */}
                    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
                        <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                            <span className="text-2xl">👨‍⚕️</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Verificación de Médicos</h3>
                        <p className="text-gray-600 text-sm mb-4">
                            Aprobar y verificar perfiles médicos
                        </p>
                        <button className="text-accent hover:text-accent/80 font-medium text-sm">
                            Revisar →
                        </button>
                    </div>

                    {/* Reportes */}
                    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
                        <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                            <span className="text-2xl">📈</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Reportes</h3>
                        <p className="text-gray-600 text-sm mb-4">
                            Generar reportes y analíticas
                        </p>
                        <button className="text-accent hover:text-accent/80 font-medium text-sm">
                            Generar →
                        </button>
                    </div>
                </div>

                {/* Info Card */}
                <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-6">
                    <h4 className="font-semibold text-red-900 mb-2">🔒 Panel de Administración - Fase 2</h4>
                    <p className="text-red-700 text-sm">
                        Las funcionalidades administrativas completas (métricas, gestión de usuarios, reportes) se implementarán en las siguientes fases.
                    </p>
                </div>
            </main>
        </div>
    );
}
