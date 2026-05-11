'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { generateResultadoLaboratorio } from '@/lib/utils/pdfGenerator';


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
                .eq('id', id as string)
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
                    .eq('order_id', id as string)
                    .single();
                
                if (results) {
                    setFormData((results as any).results_data || {});
                    setObservations((results as any).observations || '');
                }
            }
            setLoading(false);
        };

        fetchOrder();
    }, [id, router]);

    const handleInputChange = (section: string, field: string, type: 'value' | 'reference' | 'unit', value: string) => {
        setFormData((prev: any) => ({
            ...prev,
            [section]: {
                ...(prev[section] || {}),
                [field]: {
                    ...(prev[section]?.[field] || { value: '', reference: '', unit: '' }),
                    [type]: value
                }
            }
        }));
    };



    const handleSave = async (finalize: boolean = false) => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            // Buscar ID de especialista: primero por user_id, luego por email como fallback
            let specialist: any = null;

            // Estrategia 1: buscar por user_id (si el vínculo ya está creado)
            const { data: specByUserId } = await (supabase
                .from('laboratories') as any)
                .select('id, full_name')
                .eq('user_id', user?.id as string)
                .maybeSingle();

            if (specByUserId?.id) {
                specialist = specByUserId;
            } else {
                // Estrategia 2: buscar por email sintético (cedula@servimed.com)
                const userEmail = user?.email || '';
                const { data: specByEmail } = await (supabase
                    .from('laboratories') as any)
                    .select('id, full_name')
                    .eq('email', userEmail)
                    .maybeSingle();

                if (specByEmail?.id) {
                    specialist = specByEmail;
                    // Aprovechar para vincular el user_id (auto-reparación)
                    await (supabase.from('laboratories') as any)
                        .update({ user_id: user?.id })
                        .eq('id', specByEmail.id);
                }
            }

            // Verificar si ya existe un resultado para esta orden
            const { data: existingResult } = await (supabase
                .from('laboratory_results') as any)
                .select('id')
                .eq('order_id', id as string)
                .maybeSingle();

            let dbError: any = null;

            if (existingResult?.id) {
                // Actualizar registro existente
                const { error } = await (supabase
                    .from('laboratory_results') as any)
                    .update({
                        specialist_id: specialist?.id,
                        results_data: formData,
                        observations: observations,
                        is_finalized: finalize
                    })
                    .eq('id', existingResult.id);
                dbError = error;
            } else {
                // Insertar nuevo registro
                const { error } = await (supabase
                    .from('laboratory_results') as any)
                    .insert({
                        order_id: id as string,
                        specialist_id: specialist?.id,
                        results_data: formData,
                        observations: observations,
                        is_finalized: finalize
                    });
                dbError = error;
            }

            if (dbError) {
                const msg = dbError.message || dbError.details || dbError.hint || JSON.stringify(dbError);
                throw new Error(msg);
            }

            if (finalize) {
                await (supabase
                    .from('laboratory_orders') as any)
                    .update({ status: 'completado' })
                    .eq('id', id as string);
                
                // Crear notificación para el paciente
                await (supabase.from('notifications') as any).insert({
                    user_id: order.patient.user_id,
                    type: 'laboratory_result',
                    title: 'Resultado de Laboratorio Disponible',
                    message: `Tu examen de ${order.category} (${order.test_name}) ya está disponible para consulta.`
                });

                toast.success('Resultados finalizados y paciente notificado');
                router.push('/laboratory/dashboard');
            } else {
                await (supabase
                    .from('laboratory_orders') as any)
                    .update({ status: 'en_proceso' })
                    .eq('id', id as string);
                toast.success('Borrador guardado');
            }

        } catch (error: any) {
            // Serializar correctamente errores de Supabase (PostgrestError no es enumerable)
            const detail = error?.message || error?.details || error?.hint ||
                (typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error));
            console.error('Error guardando resultados:', detail);
            toast.error(`Error al guardar: ${detail || 'Error desconocido'}`);
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {['Hemoglobina', 'Hematocrito', 'Eritrocitos', 'Leucocitos', 'Plaquetas', 'Neutrófilos', 'Linfocitos', 'Monocitos', 'Eosinófilos', 'Basófilos', 'VCM', 'HCM', 'CHCM', 'RDW', 'Reticulocitos', 'VSG'].map(field => (
                        <div key={field} className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <input 
                                        type="text"
                                        placeholder="Resultado"
                                        value={formData.hematologia?.[field]?.value || ''}
                                        onChange={(e) => handleInputChange('hematologia', field, 'value', e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-red-400 outline-none transition-all pr-10"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-white/20">VAL</span>
                                </div>
                                <div className="w-[20%] relative">
                                    <input 
                                        type="text"
                                        placeholder="Unid."
                                        value={formData.hematologia?.[field]?.unit || ''}
                                        onChange={(e) => handleInputChange('hematologia', field, 'unit', e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-3 text-white focus:border-red-400/50 outline-none transition-all text-xs"
                                    />
                                </div>
                                <div className="w-[35%] relative">
                                    <input 
                                        type="text"
                                        placeholder="Ref."
                                        value={formData.hematologia?.[field]?.reference || ''}
                                        onChange={(e) => handleInputChange('hematologia', field, 'reference', e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-red-400/30 outline-none transition-all italic text-white/60 text-xs"
                                    />
                                </div>
                            </div>
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
                            <div key={field} className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        placeholder="Resultado"
                                        value={formData.grupo?.[field]?.value || ''}
                                        onChange={(e) => handleInputChange('grupo', field, 'value', e.target.value)}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-blue-400 outline-none transition-all"
                                    />
                                    <input 
                                        type="text"
                                        placeholder="Unidad"
                                        value={formData.grupo?.[field]?.unit || ''}
                                        onChange={(e) => handleInputChange('grupo', field, 'unit', e.target.value)}
                                        className="w-[20%] bg-white/5 border border-white/10 rounded-2xl px-3 py-3 text-white focus:border-blue-400/50 outline-none transition-all text-xs"
                                    />
                                    <input 
                                        type="text"
                                        placeholder="Ref."
                                        value={formData.grupo?.[field]?.reference || ''}
                                        onChange={(e) => handleInputChange('grupo', field, 'reference', e.target.value)}
                                        className="w-[30%] bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-blue-400/30 outline-none transition-all italic text-white/60 text-xs"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>


                </section>
                <section className="bg-white/5 p-8 rounded-3xl border border-white/10">
                    <h3 className="text-yellow-400 font-black text-xs uppercase tracking-[0.3em] mb-8">Coagulación</h3>
                    <div className="space-y-6">
                        {['TP', 'INR', 'TTPa', 'Fibrinógeno', 'Tiempo Trombina'].map(field => (
                            <div key={field} className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        placeholder="Resultado"
                                        value={formData.coagulacion?.[field]?.value || ''}
                                        onChange={(e) => handleInputChange('coagulacion', field, 'value', e.target.value)}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-yellow-400 outline-none transition-all"
                                    />
                                    <input 
                                        type="text"
                                        placeholder="Unidad"
                                        value={formData.coagulacion?.[field]?.unit || ''}
                                        onChange={(e) => handleInputChange('coagulacion', field, 'unit', e.target.value)}
                                        className="w-[20%] bg-white/5 border border-white/10 rounded-2xl px-3 py-3 text-white focus:border-yellow-400/50 outline-none transition-all text-xs"
                                    />
                                    <input 
                                        type="text"
                                        placeholder="Ref."
                                        value={formData.coagulacion?.[field]?.reference || ''}
                                        onChange={(e) => handleInputChange('coagulacion', field, 'reference', e.target.value)}
                                        className="w-[30%] bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-yellow-400/30 outline-none transition-all italic text-white/60 text-xs"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>


                </section>
            </div>

            {/* Química Sanguínea */}
            <section className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">
                <h3 className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em] mb-8">Química Sanguínea</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {['Glucosa', 'Urea', 'Creatinina', 'Ácido Úrico', 'Colesterol', 'HDL', 'LDL', 'Triglicéridos', 'Proteínas', 'Albúmina', 'Bilirrubina Total', 'Bilirrubina Directa', 'TGO/AST', 'TGP/ALT', 'Sodio', 'Potasio'].map(field => (
                        <div key={field} className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    placeholder="Resultado"
                                    value={formData.quimica?.[field]?.value || ''}
                                    onChange={(e) => handleInputChange('quimica', field, 'value', e.target.value)}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-emerald-400 outline-none transition-all"
                                />
                                <input 
                                    type="text"
                                    placeholder="Unid."
                                    value={formData.quimica?.[field]?.unit || ''}
                                    onChange={(e) => handleInputChange('quimica', field, 'unit', e.target.value)}
                                    className="w-[20%] bg-white/5 border border-white/10 rounded-2xl px-3 py-3 text-white focus:border-emerald-400/50 outline-none transition-all text-xs"
                                />
                                <input 
                                    type="text"
                                    placeholder="Ref."
                                    value={formData.quimica?.[field]?.reference || ''}
                                    onChange={(e) => handleInputChange('quimica', field, 'reference', e.target.value)}
                                    className="w-[30%] bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-emerald-400/30 outline-none transition-all italic text-white/60 text-xs"
                                />
                            </div>
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
                            <div key={field} className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                                <div className="flex gap-3">
                                    <input 
                                        type="text"
                                        placeholder="Resultado"
                                        value={typeof formData.fisico?.[field] === 'object' ? formData.fisico?.[field].value : (formData.fisico?.[field] || '')}
                                        onChange={(e) => handleInputChange('fisico', field, 'value', e.target.value)}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-yellow-400 outline-none transition-all"
                                    />
                                    <input 
                                        type="text"
                                        placeholder="Ref."
                                        value={formData.fisico?.[field]?.reference || ''}
                                        onChange={(e) => handleInputChange('fisico', field, 'reference', e.target.value)}
                                        className="w-[40%] bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-yellow-400/50 outline-none transition-all italic text-white/60"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                </section>
                <section className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">
                    <h3 className="text-blue-400 font-black text-xs uppercase tracking-[0.3em] mb-8">Examen Químico</h3>
                    <div className="space-y-6">
                        {['Proteínas', 'Glucosa', 'Cetonas', 'Hemoglobina', 'Nitritos', 'Leucocitos'].map(field => (
                            <div key={field} className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                                <div className="flex gap-3">
                                    <input 
                                        type="text"
                                        placeholder="Resultado"
                                        value={typeof formData.quimico?.[field] === 'object' ? formData.quimico?.[field].value : (formData.quimico?.[field] || '')}
                                        onChange={(e) => handleInputChange('quimico', field, 'value', e.target.value)}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-blue-400 outline-none transition-all"
                                    />
                                    <input 
                                        type="text"
                                        placeholder="Ref."
                                        value={formData.quimico?.[field]?.reference || ''}
                                        onChange={(e) => handleInputChange('quimico', field, 'reference', e.target.value)}
                                        className="w-[40%] bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-blue-400/50 outline-none transition-all italic text-white/60"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
            <section className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">
                <h3 className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em] mb-8">Sedimento Urinario (Microscópico)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {['Células', 'Leucocitos/campo', 'Hematíes/campo', 'Bacterias', 'Cristales', 'Cilindros', 'Moco', 'Levaduras'].map(field => (
                        <div key={field} className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                            <div className="flex gap-3">
                                <input 
                                    type="text"
                                    placeholder="Resultado"
                                    value={typeof formData.sedimento?.[field] === 'object' ? formData.sedimento?.[field].value : (formData.sedimento?.[field] || '')}
                                    onChange={(e) => handleInputChange('sedimento', field, 'value', e.target.value)}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-emerald-400 outline-none transition-all"
                                />
                                <input 
                                    type="text"
                                    placeholder="Ref."
                                    value={formData.sedimento?.[field]?.reference || ''}
                                    onChange={(e) => handleInputChange('sedimento', field, 'reference', e.target.value)}
                                    className="w-[40%] bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-emerald-400/50 outline-none transition-all italic text-white/60"
                                />
                            </div>
                        </div>
                    ))}
                </div>

            </section>
        </div>
    );

    const renderStoolForm = () => (
        <div className="space-y-12">
            {/* 1. Datos de la Muestra */}
            <section className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">
                <h3 className="text-orange-400 font-black text-xs uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-sm">📋</span>
                    1. Datos de la Muestra
                </h3>
                <div className="space-y-6">
                    {['Tipo de muestra', 'Fecha y hora de toma/recepción', 'Fecha y hora de procesado', 'Tratamiento previo (antiparasitarios/antibióticos)', 'Observación de contaminación (orina, agua o sangre menstrual)'].map(field => (
                        <div key={field} className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                            <input
                                type="text"
                                placeholder="Información"
                                value={formData.datosMuestra?.[field]?.value || ''}
                                onChange={(e) => handleInputChange('datosMuestra', field, 'value', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-orange-400 outline-none transition-all"
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* 2. Examen Macroscópico */}
            <section className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">
                <h3 className="text-amber-600 font-black text-xs uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-amber-600/20 flex items-center justify-center text-sm">🔬</span>
                    2. Examen Macroscópico
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {['Cantidad', 'Color', 'Consistencia', 'Olor', 'Moco visible', 'Sangre visible', 'Restos alimenticios', 'Parásitos visibles/segmentos'].map(field => (
                        <div key={field} className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                            <div className="flex gap-3">
                                <input type="text" placeholder="Resultado"
                                    value={formData.macroscopico?.[field]?.value || ''}
                                    onChange={(e) => handleInputChange('macroscopico', field, 'value', e.target.value)}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-amber-600 outline-none transition-all"
                                />
                                <input type="text" placeholder="Ref."
                                    value={formData.macroscopico?.[field]?.reference || ''}
                                    onChange={(e) => handleInputChange('macroscopico', field, 'reference', e.target.value)}
                                    className="w-[40%] bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-amber-600/50 outline-none transition-all italic text-white/60"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3. Examen Químico */}
            <section className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">
                <h3 className="text-purple-400 font-black text-xs uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">⚗️</span>
                    3. Examen Químico
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {['pH fecal', 'Sangre oculta', 'Sustancias reductoras', 'Grasa fecal cualitativa', 'Proteínas'].map(field => (
                        <div key={field} className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                            <div className="flex gap-3">
                                <input type="text" placeholder="Resultado"
                                    value={formData.quimicoHeces?.[field]?.value || ''}
                                    onChange={(e) => handleInputChange('quimicoHeces', field, 'value', e.target.value)}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-purple-400 outline-none transition-all"
                                />
                                <input type="text" placeholder="Ref."
                                    value={formData.quimicoHeces?.[field]?.reference || ''}
                                    onChange={(e) => handleInputChange('quimicoHeces', field, 'reference', e.target.value)}
                                    className="w-[40%] bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-purple-400/50 outline-none transition-all italic text-white/60"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 4. Examen Microscópico / Coprológico */}
            <section className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">
                <h3 className="text-blue-400 font-black text-xs uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-sm">🔭</span>
                    4. Examen Microscópico / Coprológico
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {['Leucocitos', 'Eritrocitos', 'Células epiteliales', 'Almidones', 'Grasas neutras', 'Ácidos grasos', 'Fibras musculares', 'Levaduras', 'Cristales', 'Flora bacteriana', 'Moco microscópico'].map(field => (
                        <div key={field} className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                            <div className="flex gap-3">
                                <input type="text" placeholder="Resultado"
                                    value={formData.microscopicoCorologico?.[field]?.value || ''}
                                    onChange={(e) => handleInputChange('microscopicoCorologico', field, 'value', e.target.value)}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-blue-400 outline-none transition-all"
                                />
                                <input type="text" placeholder="Ref."
                                    value={formData.microscopicoCorologico?.[field]?.reference || ''}
                                    onChange={(e) => handleInputChange('microscopicoCorologico', field, 'reference', e.target.value)}
                                    className="w-[40%] bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-blue-400/50 outline-none transition-all italic text-white/60"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 5. Examen Coproparasitario */}
            <section className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">
                <h3 className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm">🦠</span>
                    5. Examen Coproparasitario
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {['Quistes', 'Trofozoítos', 'Huevos', 'Larvas', 'Protozoarios observados', 'Helmintos observados', 'Método empleado'].map(field => (
                        <div key={field} className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">{field}</label>
                            <div className="flex gap-3">
                                <input type="text" placeholder="Resultado"
                                    value={formData.coproparasitario?.[field]?.value || ''}
                                    onChange={(e) => handleInputChange('coproparasitario', field, 'value', e.target.value)}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-emerald-400 outline-none transition-all"
                                />
                                <input type="text" placeholder="Ref."
                                    value={formData.coproparasitario?.[field]?.reference || ''}
                                    onChange={(e) => handleInputChange('coproparasitario', field, 'reference', e.target.value)}
                                    className="w-[40%] bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-emerald-400/50 outline-none transition-all italic text-white/60"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
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
                <div className="flex items-center gap-3">
                    {order.status === 'completado' && (
                        <button 
                            onClick={async () => {
                                const { data: { user } } = await supabase.auth.getUser();
                                // Buscar especialista por user_id primero, luego por email
                                let spec: any = null;
                                const { data: s1 } = await (supabase.from('laboratories') as any).select('full_name, license_number, email, specialty').eq('user_id', user?.id as string).maybeSingle();
                                if (s1) { spec = s1; }
                                else {
                                    const { data: s2 } = await (supabase.from('laboratories') as any).select('full_name, license_number, email, specialty').eq('email', user?.email as string).maybeSingle();
                                    spec = s2;
                                }
                                const { data: results } = await (supabase.from('laboratory_results') as any).select('*').eq('order_id', id as string).single();
                                if (!spec || !results) return;
                                // La cédula está implícita en el email: 3456789@servimed.com → 3456789
                                const cedulaFromEmail = spec.email?.split('@')[0] || '';
                                generateResultadoLaboratorio(
                                    order.patient,
                                    { full_name: spec.full_name, license_number: spec.license_number, cedula: cedulaFromEmail, specialty: spec.specialty || 'Bioanalista Clínico' } as any,
                                    { test_name: order.test_name, category: order.category, created_at: order.created_at },
                                    results as any
                                );
                            }}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                        >
                            <span>📄 Descargar Resultado</span>
                        </button>
                    )}
                    <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
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
