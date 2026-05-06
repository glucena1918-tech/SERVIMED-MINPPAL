'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';

export default function LaboratoryOrderPage() {
    const router = useRouter();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});
    const [observations, setObservations] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            const { data, error } = await supabase
                .from('laboratory_orders')
                .select(`
                    *,
                    patient:patient_id (*),
                    doctor:doctor_id (*)
                `)
                .eq('id', id)
                .single();

            if (error) {
                toast.error('Error al cargar la orden');
                router.push('/laboratory/dashboard');
            } else {
                setOrder(data);
                
                // Cargar resultados previos si existen
                const { data: results } = await supabase
                    .from('laboratory_results')
                    .select('*')
                    .eq('order_id', id)
                    .single();
                
                if (results) {
                    setFormData(results.results_data || {});
                    setObservations(results.observations || '');
                }
            }
            setLoading(false);
        };

        fetchOrder();
    }, [id, router]);

    const handleInputChange = (section: string, field: string, value: string) => {
        setFormData((prev: any) => ({
            ...prev,
            [section]: {
                ...(prev[section] || {}),
                [field]: value
            }
        }));
    };

    const handleSave = async (finalize: boolean = false) => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            // Buscar ID de especialista
            const { data: specialist } = await supabase
                .from('laboratories')
                .select('id')
                .eq('user_id', user?.id)
                .single();

            const { error: resultError } = await supabase
                .from('laboratory_results')
                .upsert({
                    order_id: id,
                    specialist_id: specialist?.id,
                    results_data: formData,
                    observations: observations,
                    is_finalized: finalize
                }, { onConflict: 'order_id' });

            if (resultError) throw resultError;

            if (finalize) {
                await supabase
                    .from('laboratory_orders')
                    .update({ status: 'completado' })
                    .eq('id', id);
                
                // Crear notificación para el paciente
                await supabase.from('notifications').insert({
                    user_id: order.patient.user_id,
                    type: 'laboratory_result',
                    title: 'Resultado de Laboratorio Disponible',
                    message: `Tu examen de ${order.category} (${order.test_name}) ya está disponible para consulta.`
                });

                toast.success('Resultados finalizados y paciente notificado');
                router.push('/laboratory/dashboard');
            } else {
                await supabase
                    .from('laboratory_orders')
                    .update({ status: 'en_proceso' })
                    .eq('id', id);
                toast.success('Borrador guardado');
            }

        } catch (error) {
            console.error('Error guardando:', error);
            toast.error('Error al guardar los resultados');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020714] flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
            </div>
        );
    }

    const renderBloodForm = () => (
        <div className="space-y-12">
            {/* Hematología */}
            <section className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">
                <h3 className="text-red-400 font-black text-xs uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-sm">🩸</span>
                    Hematología
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['Hemoglobina', 'Hematocrito', 'Eritrocitos', 'Leucocitos', 'Plaquetas', 'Neutrófilos', 'Linfocitos', 'Monocitos', 'Eosinófilos', 'Basófilos', 'VCM', 'HCM', 'CHCM', 'RDW', 'Reticulocitos', 'VSG'].map(field => (
                        <div key={field} className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                            <input 
                                type="text"
                                value={formData.hematologia?.[field] || ''}
                                onChange={(e) => handleInputChange('hematologia', field, e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-red-400 outline-none transition-all"
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* Grupo y Coagulación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="bg-white/5 p-8 rounded-3xl border border-white/10">
                    <h3 className="text-blue-400 font-black text-xs uppercase tracking-[0.3em] mb-8">Grupo Sanguíneo</h3>
                    <div className="space-y-6">
                        {['Grupo ABO', 'Factor Rh'].map(field => (
                            <div key={field} className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                                <input 
                                    type="text"
                                    value={formData.grupo?.[field] || ''}
                                    onChange={(e) => handleInputChange('grupo', field, e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-blue-400 outline-none transition-all"
                                />
                            </div>
                        ))}
                    </div>
                </section>
                <section className="bg-white/5 p-8 rounded-3xl border border-white/10">
                    <h3 className="text-yellow-400 font-black text-xs uppercase tracking-[0.3em] mb-8">Coagulación</h3>
                    <div className="space-y-6">
                        {['TP', 'INR', 'TTPa', 'Fibrinógeno', 'Tiempo Trombina'].map(field => (
                            <div key={field} className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                                <input 
                                    type="text"
                                    value={formData.coagulacion?.[field] || ''}
                                    onChange={(e) => handleInputChange('coagulacion', field, e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-yellow-400 outline-none transition-all"
                                />
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Química Sanguínea */}
            <section className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">
                <h3 className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em] mb-8">Química Sanguínea</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {['Glucosa', 'Urea', 'Creatinina', 'Ácido Úrico', 'Colesterol', 'HDL', 'LDL', 'Triglicéridos', 'Proteínas', 'Albúmina', 'Bilirrubina Total', 'Bilirrubina Directa', 'TGO/AST', 'TGP/ALT', 'Sodio', 'Potasio'].map(field => (
                        <div key={field} className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                            <input 
                                type="text"
                                value={formData.quimica?.[field] || ''}
                                onChange={(e) => handleInputChange('quimica', field, e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-emerald-400 outline-none transition-all"
                            />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );

    const renderUrineForm = () => (
        <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">
                    <h3 className="text-yellow-400 font-black text-xs uppercase tracking-[0.3em] mb-8">Examen Físico</h3>
                    <div className="space-y-6">
                        {['Color', 'Aspecto', 'Olor', 'Densidad', 'pH'].map(field => (
                            <div key={field} className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                                <input 
                                    type="text"
                                    value={formData.fisico?.[field] || ''}
                                    onChange={(e) => handleInputChange('fisico', field, e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-yellow-400 outline-none transition-all"
                                />
                            </div>
                        ))}
                    </div>
                </section>
                <section className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">
                    <h3 className="text-blue-400 font-black text-xs uppercase tracking-[0.3em] mb-8">Examen Químico</h3>
                    <div className="space-y-6">
                        {['Proteínas', 'Glucosa', 'Cetonas', 'Hemoglobina', 'Nitritos', 'Leucocitos'].map(field => (
                            <div key={field} className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                                <input 
                                    type="text"
                                    value={formData.quimico?.[field] || ''}
                                    onChange={(e) => handleInputChange('quimico', field, e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-blue-400 outline-none transition-all"
                                />
                            </div>
                        ))}
                    </div>
                </section>
            </div>
            <section className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">
                <h3 className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em] mb-8">Sedimento Urinario (Microscópico)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['Células', 'Leucocitos/campo', 'Hematíes/campo', 'Bacterias', 'Cristales', 'Cilindros', 'Moco', 'Levaduras'].map(field => (
                        <div key={field} className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                            <input 
                                type="text"
                                value={formData.sedimento?.[field] || ''}
                                onChange={(e) => handleInputChange('sedimento', field, e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-emerald-400 outline-none transition-all"
                            />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );

    const renderStoolForm = () => (
        <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">
                    <h3 className="text-amber-600 font-black text-xs uppercase tracking-[0.3em] mb-8">Examen Macroscópico</h3>
                    <div className="space-y-6">
                        {['Color', 'Consistencia', 'Moco visible', 'Sangre visible', 'Restos alimenticios', 'Parásitos visibles'].map(field => (
                            <div key={field} className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                                <input 
                                    type="text"
                                    value={formData.macroscopico?.[field] || ''}
                                    onChange={(e) => handleInputChange('macroscopico', field, e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-amber-600 outline-none transition-all"
                                />
                            </div>
                        ))}
                    </div>
                </section>
                <section className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">
                    <h3 className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em] mb-8">Microscópico / Coproparasitario</h3>
                    <div className="space-y-6">
                        {['Quistes', 'Trofozoítos', 'Huevos', 'Larvas', 'Protozoarios', 'Helmintos'].map(field => (
                            <div key={field} className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                                <input 
                                    type="text"
                                    value={formData.parasitario?.[field] || ''}
                                    onChange={(e) => handleInputChange('parasitario', field, e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-emerald-400 outline-none transition-all"
                                />
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020714] text-white">
            <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5 bg-black/20 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-full transition-all">←</button>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-widest">Carga de Resultados</h1>
                        <p className="text-xs text-white/40">{order.patient.full_name} | {order.test_name}</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => handleSave(false)}
                        disabled={isSaving}
                        className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                        Guardar Borrador
                    </button>
                    <button 
                        onClick={() => handleSave(true)}
                        disabled={isSaving}
                        className="px-6 py-2 bg-accent text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#05c492] transition-all shadow-lg shadow-accent/20"
                    >
                        {isSaving ? 'Guardando...' : 'Finalizar y Notificar'}
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                {order.category === 'sangre' && renderBloodForm()}
                {order.category === 'orina' && renderUrineForm()}
                {order.category === 'heces' && renderStoolForm()}

                {/* Sección de Observaciones */}
                <section className="mt-12 bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">
                    <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] mb-8">Observaciones del Especialista</h3>
                    <textarea 
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        rows={5}
                        placeholder="Escriba aquí sus observaciones o comentarios sobre los resultados..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-accent/50 transition-all resize-none"
                    />
                </section>
            </main>
        </div>
    );
}
