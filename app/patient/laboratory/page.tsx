'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { generateResultadoLaboratorio } from '@/lib/utils/pdfGenerator';


export default function PatientLaboratoryPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [patientData, setPatientData] = useState<any>(null);

    useEffect(() => {
        const loadLabData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }

                // Cargar perfil del paciente
                const { data: patient } = await supabase
                    .from('patients')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (!patient) return;
                setPatientData(patient);

                // Cargar órdenes de laboratorio
                const { data: labOrders } = await supabase
                    .from('laboratory_orders')
                    .select(`
                        *,
                        doctor:doctor_id (full_name, specialty),
                        results:laboratory_results (*)
                    `)
                    .eq('patient_id', (patient as any).id)
                    .order('created_at', { ascending: false });

                setOrders(labOrders || []);
            } catch (error) {
                console.error('Error al cargar datos de laboratorio:', error);
            } finally {
                setLoading(false);
            }
        };

        loadLabData();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020714] flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
                <p className="mt-6 text-white/40 font-black uppercase tracking-[0.3em] text-[10px]">Consultando Laboratorio...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col">
            <Header />

            <main className="flex-grow pt-32 pb-20 px-6 max-w-5xl mx-auto w-full">
                {/* Header de la Sección */}
                <div className="mb-12 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        Resultados y Órdenes
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                        Mi Laboratorio <span className="text-accent">Clínico</span>
                    </h1>
                    <p className="text-slate-500 font-medium max-w-2xl">
                        Gestiona tus exámenes de sangre, orina y heces. Podrás ver el progreso de tus muestras y descargar los resultados una vez finalizados.
                    </p>
                </div>

                {orders.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {orders.map((order) => (
                            <div 
                                key={order.id} 
                                className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-accent/30 transition-all group relative overflow-hidden"
                            >
                                {/* Decoración de fondo suave */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 group-hover:bg-accent/10 transition-all duration-700" />
                                
                                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                                    {/* Icono Categoría */}
                                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl shadow-inner ${
                                        order.category === 'sangre' ? 'bg-red-50 text-red-500 border border-red-100' :
                                        order.category === 'orina' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                                        'bg-amber-50 text-amber-700 border border-amber-100'
                                    }`}>
                                        {order.category === 'sangre' ? '🩸' : order.category === 'orina' ? '🧪' : '💩'}
                                    </div>

                                    {/* Info Principal */}
                                    <div className="flex-1 text-center md:text-left">
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                                {order.test_name}
                                            </h3>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                order.status === 'pendiente' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                                order.status === 'muestra_tomada' ? 'bg-blue-50 text-blue-500 border-blue-100' :
                                                order.status === 'en_proceso' ? 'bg-purple-50 text-purple-500 border-purple-100' :
                                                order.status === 'completado' ? 'bg-accent/10 text-accent border-accent/20' :
                                                'bg-red-50 text-red-500 border-red-100'
                                            }`}>
                                                {order.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        
                                        <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm font-medium text-slate-400">
                                            <span className="flex items-center gap-2">
                                                👨‍⚕️ Dr. {order.doctor?.full_name}
                                            </span>
                                            <span className="flex items-center gap-2">
                                                📅 {new Date(order.created_at).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-2">
                                                🆔 Orden: #{order.id.slice(0, 8)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Acción */}
                                    <div className="w-full md:w-auto">
                                        {order.status === 'completado' ? (
                                            <button 
                                                onClick={async () => {
                                                    // Obtener resultados del laboratorio
                                                    const { data: results } = await (supabase
                                                        .from('laboratory_results') as any)
                                                        .select('*')
                                                        .eq('order_id', order.id)
                                                        .single();

                                                    // Obtener datos del especialista por separado
                                                    let specialistData: { full_name: string; license_number?: string; cedula?: string; specialty?: string } = { full_name: 'Bioanalista', license_number: '', cedula: '', specialty: 'Bioanalista Clínico' };
                                                    if (results?.specialist_id) {
                                                        const { data: spec } = await (supabase
                                                            .from('laboratories') as any)
                                                            .select('full_name, license_number, email, specialty')
                                                            .eq('id', results.specialist_id)
                                                            .single();
                                                        if (spec) {
                                                            // La cédula está implícita en el email: 3456789@servimed.com → 3456789
                                                            const cedulaFromEmail = spec.email?.split('@')[0] || '';
                                                            specialistData = { 
                                                                ...spec, 
                                                                cedula: cedulaFromEmail,
                                                                specialty: spec.specialty || 'Bioanalista Clínico' 
                                                            };
                                                        }
                                                    }

                                                    if (results) {
                                                        generateResultadoLaboratorio(
                                                            patientData,
                                                            specialistData,
                                                            { test_name: order.test_name, category: order.category, created_at: order.created_at },
                                                            results as any
                                                        );
                                                    }
                                                }}
                                                className="w-full md:w-auto px-8 py-4 bg-accent text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-accent/20 hover:bg-[#05c492] hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <span>📄</span> Descargar Resultados
                                            </button>
                                        ) : (

                                            <div className="px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest text-center">
                                                {order.status === 'pendiente' ? 'Esperando Muestra' : 'Procesando en Laboratorio'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* ESTADO VACÍO ELEGANTE */
                    <div className="bg-white rounded-[3rem] p-16 border border-slate-200 shadow-2xl shadow-slate-200/50 text-center animate-fade-in">
                        <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-10 border border-slate-100 shadow-inner group transition-all duration-500 hover:scale-110">
                            <span className="text-6xl filter grayscale group-hover:grayscale-0 transition-all duration-500">🔬</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">
                            Sin exámenes registrados
                        </h2>
                        <p className="text-slate-400 font-medium max-w-sm mx-auto mb-10 leading-relaxed">
                            No tienes órdenes de laboratorio pendientes ni resultados previos. Cuando tu médico solicite un examen, aparecerá aquí.
                        </p>
                        <button 
                            onClick={() => router.push('/patient/dashboard')}
                            className="px-10 py-5 bg-[#0a2463] text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-[#0a2463]/20 hover:bg-[#0f3491] hover:-translate-y-1 transition-all active:scale-95"
                        >
                            Volver al Inicio
                        </button>
                    </div>
                )}
            </main>

            <Footer />

            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.8s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
