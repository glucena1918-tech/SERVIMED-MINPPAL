'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';

export default function LaboratoryDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<'all' | 'sangre' | 'heces' | 'orina'>('all');

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    router.push('/login');
                    return;
                }

                // Cargar datos del especialista de laboratorio
                const { data: labStaff, error: labError } = await supabase
                    .from('laboratories')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                setUserData(labStaff || { full_name: user.user_metadata?.full_name || 'Especialista' });

                // Cargar órdenes pendientes y recientes
                await fetchOrders();

                // Suscripción Realtime para nuevas órdenes
                const channel = supabase
                    .channel('lab_orders_changes')
                    .on('postgres_changes', { 
                        event: '*', 
                        schema: 'public', 
                        table: 'laboratory_orders' 
                    }, () => {
                        fetchOrders();
                    })
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };

            } catch (error) {
                console.error('Error al cargar datos del laboratorio:', error);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, [router]);

    const fetchOrders = async () => {
        const { data, error } = await supabase
            .from('laboratory_orders')
            .select(`
                *,
                patient:patient_id (full_name, cedula),
                doctor:doctor_id (full_name, specialty)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error cargando órdenes:', error);
        } else {
            console.log('Órdenes cargadas:', data);
            setOrders(data || []);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        try {
            const { error } = await (supabase
                .from('lab_orders') as any)
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;
            toast.success(`Estado actualizado a ${newStatus}`);
            fetchOrders();
        } catch (error) {
            toast.error('Error al actualizar estado');
        }
    };

    const filteredOrders = orders.filter(order => {
        const patientName = order.patient?.full_name || '';
        const patientCedula = order.patient?.cedula || '';
        
        const matchesSearch = patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             patientCedula.includes(searchTerm);
        const matchesCategory = filterCategory === 'all' || order.category === filterCategory;
        return matchesSearch && matchesCategory;
    });


    if (loading) {
        return (
            <div className="min-h-screen bg-[#020714] flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
                <p className="mt-6 text-white/40 font-black uppercase tracking-[0.3em] text-[10px]">Cargando Laboratorio...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden bg-[#020714]">
            {/* Fondo Institucional */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <Image
                    src="/images/dashboard-bg.jpeg"
                    alt="Fondo institucional"
                    fill
                    priority
                    quality={85}
                    className="object-cover opacity-60 brightness-50"
                />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5 bg-black/20">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                        <div className="relative group">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center shadow-2xl border-2 border-white/20">
                                <span className="text-white font-black text-xl">🔬</span>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-black text-white tracking-tight leading-none">
                                    Panel de Laboratorio <span className="text-white/50 font-medium">|</span>
                                </h1>
                                <span className="text-accent font-black text-sm uppercase tracking-widest">Bioanálisis</span>
                            </div>
                            <p className="text-white/60 text-sm font-medium mt-1">
                                {userData?.full_name}
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleLogout} 
                        className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all duration-500"
                    >
                        Salir
                    </button>
                </div>
            </header>

            <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 space-y-8">
                {/* Métricas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                        { label: 'Pendientes', value: filteredOrders.filter(o => o.status === 'pendiente').length, icon: '📋', color: 'yellow-400' },
                        { label: 'En Proceso', value: filteredOrders.filter(o => o.status === 'en_proceso' || o.status === 'muestra_tomada').length, icon: '🧪', color: 'blue-400' },
                        { label: 'Completados', value: filteredOrders.filter(o => o.status === 'completado').length, icon: '✅', color: 'accent' },
                        { label: 'Total Hoy', value: filteredOrders.length, icon: '📊', color: 'purple-400' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10">
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
                            <div className="flex items-center justify-between">
                                <h3 className="text-3xl font-black text-white">{stat.value}</h3>
                                <span className="text-2xl">{stat.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filtros y Búsqueda */}
                <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="relative flex-1 w-full">
                            <input
                                type="text"
                                placeholder="Buscar por paciente o cédula..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-accent/50 transition-all"
                            />
                        </div>
                        <div className="flex gap-2">
                            {(['all', 'sangre', 'heces', 'orina'] as const).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setFilterCategory(cat)}
                                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                        filterCategory === cat ? 'bg-accent text-black border-accent' : 'bg-white/5 text-white/40 border-white/10 hover:border-white/30'
                                    }`}
                                >
                                    {cat === 'all' ? 'Todos' : cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Lista de Órdenes */}
                <div className="space-y-4">
                    <h2 className="text-xl font-black text-white flex items-center uppercase tracking-widest gap-3">
                        <span className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center text-lg">📥</span>
                        Órdenes Recibidas
                    </h2>

                    <div className="grid grid-cols-1 gap-4">
                        {filteredOrders.length > 0 ? (
                            filteredOrders.map(order => (
                                <div key={order.id} className="group bg-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/10 hover:border-accent/30 transition-all flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-6 w-full">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${
                                            order.category === 'sangre' ? 'bg-red-500/20 text-red-400' :
                                            order.category === 'orina' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-amber-800/20 text-amber-600'
                                        }`}>
                                            {order.category === 'sangre' ? '🩸' : order.category === 'orina' ? '🧪' : '💩'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-lg font-black text-white">{order.patient?.full_name}</h4>
                                                <span className="text-[10px] font-mono text-white/40">C.I. {order.patient?.cedula}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-3 mt-2">
                                                <span className="px-3 py-1 rounded-lg bg-white/5 text-white/60 text-[10px] font-black uppercase tracking-widest border border-white/5">
                                                    {order.test_name}
                                                </span>
                                                <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/10">
                                                    Dr. {order.doctor?.full_name}
                                                </span>
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                                                    order.status === 'pendiente' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                    order.status === 'completado' ? 'bg-accent/10 text-accent border-accent/20' :
                                                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                }`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 w-full md:w-auto">
                                        {order.status === 'pendiente' && (
                                            <button 
                                                onClick={() => handleUpdateStatus(order.id, 'muestra_tomada')}
                                                className="flex-1 md:flex-none px-6 py-3 bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all"
                                            >
                                                Muestra Tomada
                                            </button>
                                        )}
                                        {(order.status === 'pendiente' || order.status === 'muestra_tomada' || order.status === 'en_proceso') && (
                                            <button 
                                                onClick={() => router.push(`/laboratory/order/${order.id}`)}
                                                className="flex-1 md:flex-none px-6 py-3 bg-accent text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#05c492] transition-all"
                                            >
                                                Cargar Resultados
                                            </button>
                                        )}
                                        {order.status === 'completado' && (
                                            <button 
                                                onClick={() => router.push(`/laboratory/order/${order.id}`)}
                                                className="flex-1 md:flex-none px-6 py-3 bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all"
                                            >
                                                Ver Resultados
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                <p className="text-white/20 font-black uppercase tracking-widest">No hay órdenes que coincidan</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
}
