'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { generateInformeMedico, generateReceta, generateConstancia, generateOrdenExamen } from '@/lib/utils/pdfGenerator';
import { toast } from 'react-hot-toast';

interface PatientData {
    id: string;
    full_name: string;
    cedula: string;
    date_of_birth: string;
    gender: string;
    blood_type: string;
    phone: string;
    email: string;
    contact_phone: string;
    weight: number | null;
    height: number | null;
    allergies: string[];
    allergies_food: string;
    allergies_medicine: string;
    medical_devices: string;
    chronic_conditions: string;
    previous_surgeries: string;
    family_diseases: string;
    vaccines: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
}

interface MedicalRecord {
    id: string;
    record_date: string;
    diagnosis: string;
    symptoms: string;
    treatment: string;
    treatment_type: string;
    treatment_duration: string;
    treatment_indications: string[];
    requires_rest: boolean;
    rest_days: number;
    prescriptions: any;
    lab_results: string;
    notes: string;
    consultation_type?: string;
    // Signos Vitales
    temperature?: string;
    systolic_pressure?: string;
    diastolic_pressure?: string;
    pulse?: string;
    // Solicitudes Examen
    lab_request?: string;
    xray_request?: string;
    other_request?: string;
    doctor: {
        full_name: string;
        specialty: string;
        cedula?: string;
        license_number?: string;
    };
}

export default function PatientHistoryPage() {
    const router = useRouter();
    const params = useParams();
    const cedula = params.cedula as string;
    const searchParams = useSearchParams();
    const appointmentIdParam = searchParams.get('appointmentId');

    const [loading, setLoading] = useState(true);
    const [patient, setPatient] = useState<PatientData | null>(null);
    const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
    const [pathologies, setPathologies] = useState<any[]>([]);
    const [labOrders, setLabOrders] = useState<any[]>([]);
    const [activeAppointment, setActiveAppointment] = useState<any>(null);
    const [showAddForm, setShowAddForm] = useState(false);

    // Estado del formulario (adaptado al formato oficial)
    const [formData, setFormData] = useState({
        pathologyId: '',
        diagnosis: '',
        symptoms: '', // Motivo de Consulta
        consultationType: '',
        // Signos Vitales
        temperature: '',
        systolicPressure: '',
        diastolicPressure: '',
        pulse: '',

        treatmentType: 'continuo' as 'continuo' | 'temporal',
        treatmentDuration: '',
        indications: ['', '', '', '', '', '', ''], // Hasta 7 indicaciones
        requiresRest: false,
        restDays: 0,
        notes: '',
        // Ordenes de Examen
        reqLab: false,
        labTests: [{ category: 'sangre' as 'sangre' | 'heces' | 'orina', testName: '', observations: '' }],
        reqXray: false,
        xrayRequest: '',
        reqOther: false,
        otherRequest: ''
    });

    // Estado para búsqueda de patologías
    const [searchTerm, setSearchTerm] = useState('');
    const [showPathologyList, setShowPathologyList] = useState(false);

    const filteredPathologies = pathologies.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 400) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Estado para medicamentos (KPIs)
    interface PrescriptionItemState {
        medicine_name: string;
        dosage: string;
        quantity: string;
        duration: string;
        instructions: string;
    }
    const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItemState[]>([]);
    const [newItem, setNewItem] = useState<PrescriptionItemState>({
        medicine_name: '',
        dosage: '',
        quantity: '',
        duration: '',
        instructions: ''
    });

    const [submitting, setSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        loadPatientData();
        loadPathologies();
    }, [cedula]);

    const loadPathologies = async () => {
        const { data } = await supabase
            .from('pathologies')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });
        
        if (data) setPathologies(data);
    };

    const loadPatientData = async () => {
        try {
            // 1. Cargar datos del paciente
            const { data: patientData, error: patientError } = await supabase
                .from('patients')
                .select('*')
                .eq('cedula', cedula)
                .single();

            if (patientError) throw patientError;
            const typedPatient = patientData as unknown as PatientData;
            setPatient(typedPatient);

            // 2. Cargar historial médico con prescription_items
            const { data: records, error: recordsError } = await supabase
                .from('medical_records')
                .select(`
                    *,
                    doctor:doctor_id (
                        full_name,
                        specialty,
                        cedula,
                        license_number
                    ),
                    pathologies:pathology_id (name),
                    prescription_items (*)
                `)
                .eq('patient_id', (patientData as any).id)
                .order('record_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (recordsError) throw recordsError;
            setMedicalRecords(records || []);

            // 4. Cargar órdenes de laboratorio
            const { data: labOrders, error: labError } = await supabase
                .from('laboratory_orders')
                .select(`
                    *,
                    results:laboratory_results (*)
                `)
                .eq('patient_id', (patientData as any).id)
                .order('created_at', { ascending: false });

            if (!labError) {
                // @ts-ignore - Guardar en estado (necesito añadir el estado)
                setLabOrders(labOrders || []);
            }

            // 3. Cargar cita activa
            let appointment = null;
            
            // Prioridad 1: ID específico desde la URL
            if (appointmentIdParam) {
                const { data } = await supabase
                    .from('appointments')
                    .select('*')
                    .eq('id', appointmentIdParam)
                    .single();
                if (data) appointment = data;
            }

            // Prioridad 2: Si no hay ID o no se encontró, buscar cita confirmada para HOY
            if (!appointment) {
                const tzOffset = (new Date()).getTimezoneOffset() * 60000;
                const today = new Date(Date.now() - tzOffset).toISOString().split('T')[0];
                const { data: todayApps } = await supabase
                    .from('appointments')
                    .select('*')
                    .eq('patient_id', (patientData as any).id)
                    .eq('appointment_date', today)
                    .eq('status', 'confirmed')
                    .order('appointment_time', { ascending: true })
                    .limit(1);
                
                if (todayApps && todayApps.length > 0) appointment = todayApps[0];
            }

            // Prioridad 3: Cualquier cita confirmada o pendiente (la más reciente/cercana)
            if (!appointment) {
                const { data: recentApps } = await supabase
                    .from('appointments')
                    .select('*')
                    .eq('patient_id', (patientData as any).id)
                    .in('status', ['confirmed', 'pending'])
                    .order('appointment_date', { ascending: true })
                    .limit(1);
                
                if (recentApps && recentApps.length > 0) appointment = recentApps[0];
            }
            
            if (appointment) {
                setActiveAppointment(appointment);
                setFormData(prev => ({
                    ...prev,
                    consultationType: (appointment as any).consultation_type || '',
                    symptoms: (appointment as any).reason || prev.symptoms
                }));
            }

        } catch (error) {
            console.error('Error cargando datos del paciente:', error);
            toast.error('No se pudo cargar la información del paciente.');
        } finally {
            setLoading(false);
        }
    };

    // Sincronizar formulario con cita activa (Pre-llenado robusto)
    useEffect(() => {
        if (activeAppointment) {
            setFormData(prev => ({
                ...prev,
                consultationType: activeAppointment.consultation_type || '',
                symptoms: activeAppointment.reason || prev.symptoms
            }));
        }
    }, [activeAppointment]);

    const addPrescriptionItem = () => {
        if (!newItem.medicine_name.trim()) {
            toast.error('El nombre del medicamento es obligatorio');
            return;
        }
        setPrescriptionItems([...prescriptionItems, newItem]);
        setNewItem({ medicine_name: '', dosage: '', quantity: '', duration: '', instructions: '' });
    };

    const handleRemovePrescriptionItem = (index: number) => {
        setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
    };

    // Funciones para manejar múltiples exámenes de laboratorio
    const addLabTest = () => {
        setFormData({
            ...formData,
            labTests: [...formData.labTests, { category: 'sangre', testName: '', observations: '' }]
        });
    };

    const removeLabTest = (index: number) => {
        if (formData.labTests.length === 1) return;
        setFormData({
            ...formData,
            labTests: formData.labTests.filter((_, i) => i !== index)
        });
    };

    const updateLabTest = (index: number, field: string, value: any) => {
        const newLabTests = [...formData.labTests];
        newLabTests[index] = { ...newLabTests[index], [field]: value };
        setFormData({ ...formData, labTests: newLabTests });
    };

    const removePrescriptionItem = (index: number) => {
        const updated = [...prescriptionItems];
        updated.splice(index, 1);
        setPrescriptionItems(updated);
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!formData.pathologyId) errors.pathologyId = 'Debe seleccionar una patología del catálogo.';
        if (!formData.diagnosis.trim()) errors.diagnosis = 'El detalle del diagnóstico es obligatorio.';
        if (formData.diagnosis.length > 500) errors.diagnosis = 'El diagnóstico no puede exceder los 500 caracteres.';
        
        if (!formData.symptoms.trim()) errors.symptoms = 'El motivo de consulta es obligatorio.';
        if (formData.symptoms.length > 500) errors.symptoms = 'El motivo de consulta no puede exceder los 500 caracteres.';

        if (!formData.temperature.trim()) errors.temperature = 'Requerido';
        if (!formData.systolicPressure.trim()) errors.systolicPressure = 'Requerido';
        if (!formData.diastolicPressure.trim()) errors.diastolicPressure = 'Requerido';
        if (!formData.pulse.trim()) errors.pulse = 'Requerido';

        if (formData.requiresRest && (formData.restDays <= 0 || isNaN(formData.restDays))) {
            errors.restDays = 'Indique la cantidad de días de reposo.';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmitRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setSubmitting(true);
        setFormErrors({});

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Obtener ID del médico
            const { data: doctor } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!doctor || !patient) {
                throw new Error('No se pudo identificar al médico o paciente.');
            }

            // Filtrar indicaciones vacías
            const validIndications = formData.indications.filter(ind => ind.trim() !== '');

            // Generar texto resumen para compatibilidad legacy
            const prescriptionsText = prescriptionItems.map(item =>
                `${item.medicine_name} (${item.dosage}) - ${item.quantity}`
            ).join('\n');

            // Insertar nuevo registro médico
            const { data: newRecord, error } = await supabase
                .from('medical_records')
                .insert({
                    patient_id: (patient as any).id,
                    doctor_id: (doctor as any).id,
                    pathology_id: formData.pathologyId,
                    record_date: new Date().toISOString().split('T')[0],
                    diagnosis: formData.diagnosis,
                    symptoms: formData.symptoms,
                    // Signos Vitales
                    temperature: formData.temperature,
                    systolic_pressure: formData.systolicPressure,
                    diastolic_pressure: formData.diastolicPressure,
                    pulse: formData.pulse,

                    // Ordenes de Examen (Solo si check activo)
                    lab_request: formData.reqLab ? formData.labRequest : null,
                    xray_request: formData.reqXray ? formData.xrayRequest : null,
                    other_request: formData.reqOther ? formData.otherRequest : null,

                    treatment_type: formData.treatmentType,
                    treatment_duration: formData.treatmentDuration,
                    treatment_indications: validIndications,
                    requires_rest: formData.requiresRest,
                    rest_days: formData.requiresRest ? formData.restDays : 0,
                    consultation_type: formData.consultationType,
                    prescriptions: { text: prescriptionsText }, // Legacy fallback
                    notes: formData.notes
                } as any)
                .select()
                .single();
            if (error) throw error;
 
            const recordId = (newRecord as any)?.id;

            // 🧪 INTEGRACIÓN CON MÓDULO DE LABORATORIO
            // Insertar Órdenes de Laboratorio (Múltiples)
            if (formData.reqLab && formData.labTests.length > 0) {
                const labOrdersToInsert = formData.labTests
                    .filter(test => test.testName.trim() !== '') // Solo tests con nombre
                    .map(test => ({
                        patient_id: (patient as any).id,
                        doctor_id: (doctor as any).id,
                        medical_record_id: recordId,
                        category: test.category,
                        test_name: test.testName,
                        notes_from_doctor: test.observations,
                        status: 'pendiente'
                    }));

                if (labOrdersToInsert.length > 0) {
                    const { error: labOrderError } = await supabase
                        .from('laboratory_orders')
                        .insert(labOrdersToInsert as any);

                    if (labOrderError) {
                        console.error('Error creando órdenes de laboratorio:', labOrderError);
                        toast.error('Se guardó el registro pero no se pudieron crear las órdenes de laboratorio.');
                    } else {
                        toast.success(`🔬 ${labOrdersToInsert.length} órdenes de laboratorio enviadas exitosamente.`);
                    }
                }
            }

            // Insertar Items de Prescripción (KPIs)
            if (prescriptionItems.length > 0) {
                const itemsToInsert = prescriptionItems.map(item => ({
                    medical_record_id: recordId, // Relación FK
                    medicine_name: item.medicine_name,
                    dosage: item.dosage,
                    frequency: '', // No estaba en UI, opcional
                    duration: item.duration,
                    quantity: item.quantity,
                    instructions: item.instructions
                }));

                const { error: itemsError } = await supabase
                    .from('prescription_items')
                    .insert(itemsToInsert as any);

                if (itemsError) throw itemsError;
            }

            // ✅ ACTUALIZAR CITA A 'COMPLETED'
            if (activeAppointment && activeAppointment.id) {
                await supabase
                    .from('appointments')
                    // @ts-ignore
                    .update({
                        status: 'completed',
                        medical_record_id: recordId, // Cast as any needed if types are outdated
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', activeAppointment.id);
            }
            toast.success('✅ Registro médico guardado exitosamente.');
            setFormErrors({});
            setShowAddForm(false);

            // Reset form
            setFormData({
                pathologyId: '',
                diagnosis: '',
                symptoms: '',
                consultationType: '',
                temperature: '',
                systolicPressure: '',
                diastolicPressure: '',
                pulse: '',
                treatmentType: 'continuo',
                treatmentDuration: '',
                indications: ['', '', '', '', '', '', ''],
                requiresRest: false,
                restDays: 0,
                notes: '',
                reqLab: false,
                labTests: [{ category: 'sangre', testName: '', observations: '' }],
                reqXray: false,
                xrayRequest: '',
                reqOther: false,
                otherRequest: ''
            });
            setPrescriptionItems([]);
            loadPatientData();

        } catch (error: any) {
            console.error('Error guardando registro:', error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const updateIndication = (index: number, value: string) => {
        const newIndications = [...formData.indications];
        newIndications[index] = value;
        setFormData({ ...formData, indications: newIndications });
    };

    // Manejadores de descarga de PDFs
    const handleDownloadInforme = (record: MedicalRecord) => {
        if (!patient) return;

        generateInformeMedico(patient, record.doctor, {
            ...record,
            prescription_items: (record as any).prescription_items || []
        });
    };

    const handleDownloadReceta = (record: MedicalRecord) => {
        if (!patient) return;

        generateReceta(patient, record.doctor, {
            ...record,
            prescription_items: (record as any).prescription_items || []
        });
    };

    const handleDownloadConstancia = (record: MedicalRecord) => {
        if (!patient) return;
        generateConstancia(patient, record.doctor, record);
    };

    const handleDownloadOrden = (record: MedicalRecord) => {
        if (!patient) return;
        generateOrdenExamen(patient, record.doctor, record);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Paciente no encontrado</h2>
                    <Link href="/doctor/dashboard" className="text-accent hover:underline">
                        ← Volver al Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    // Calcular edad desde fecha de nacimiento
    const calculateAge = (birthDate: string) => {
        if (!birthDate) return '--';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            {/* Header */}
            <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link href="/doctor/dashboard" className="flex items-center text-gray-500 hover:text-accent transition-colors mr-4">
                                <span className="text-xl">←</span>
                            </Link>
                            <h1 className="text-xl font-bold text-gray-900">Ficha del Paciente</h1>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-accent-600 transition shadow-sm"
                            >
                                {showAddForm ? 'Cancelar' : '+ Nuevo Informe Médico'}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Alerta de Cita Activa */}
                {activeAppointment && (
                    <div className="mb-6 bg-blue-600 rounded-xl p-4 text-white shadow-lg flex items-center justify-between animate-bounce-slow">
                        <div className="flex items-center">
                            <div className="bg-white/20 p-2 rounded-lg mr-4 text-2xl">🗓️</div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Cita Programada para Hoy</p>
                                <h3 className="font-bold text-lg">
                                    {activeAppointment.consultation_type || 'Consulta General'} 
                                    <span className="mx-2 opacity-50">|</span> 
                                    <span className="text-blue-200">{activeAppointment.appointment_time?.slice(0, 5)}</span>
                                </h3>
                            </div>
                        </div>
                        {!showAddForm && (
                            <button 
                                onClick={() => setShowAddForm(true)}
                                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-50 transition shadow-sm"
                            >
                                Iniciar Atención
                            </button>
                        )}
                    </div>
                )}

                {/* Datos del Paciente */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/60 p-6 mb-8">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{patient.full_name}</h2>
                            <p className="text-gray-500 font-mono mt-1">C.I. {patient.cedula}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Tipo de Sangre</p>
                            <p className="text-2xl font-black text-red-600">{patient.blood_type || '--'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500 block">Edad:</span>
                            <span className="font-medium text-gray-900">{calculateAge(patient.date_of_birth)} años</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">Sexo:</span>
                            <span className="font-medium text-gray-900">{patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : patient.gender || '--'}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">Fecha Nacimiento:</span>
                            <span className="font-medium text-gray-900">{patient.date_of_birth || '--'}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">Teléfono:</span>
                            <span className="font-medium text-gray-900">{patient.contact_phone || patient.phone || '--'}</span>
                        </div>

                        {/* Secciones de Salud con diseño suave */}
                        <div className="md:col-span-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Alergias */}
                            <div className="bg-white/50 p-4 rounded-xl border border-gray-100 shadow-sm">
                                <span className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] block mb-3">
                                    🚫 ALERGIAS Y REACCIONES
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${patient.allergies_food ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-400 border-gray-100 opacity-60'}`}>
                                        🍱 Alimentos: {patient.allergies_food || 'Ninguna'}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${patient.allergies_medicine ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-gray-50 text-gray-400 border-gray-100 opacity-60'}`}>
                                        💊 Medicamentos: {patient.allergies_medicine || 'Ninguna'}
                                    </span>
                                </div>
                            </div>

                            {/* Enfermedades Crónicas */}
                            <div className="bg-[#FFF8F1] p-4 rounded-xl border border-[#FFEDD5] shadow-sm">
                                <span className="text-[#9A3412] text-[10px] font-black uppercase tracking-[0.2em] block mb-2">
                                    📋 CONDICIONES CRÓNICAS
                                </span>
                                <p className="text-[#7C2D12] text-sm font-medium">{patient.chronic_conditions || 'Sin registros'}</p>
                            </div>

                            {/* Dispositivos Médicos */}
                            <div className="bg-[#F0F9FF] p-4 rounded-xl border border-[#E0F2FE] shadow-sm">
                                <span className="text-[#0369A1] text-[10px] font-black uppercase tracking-[0.2em] block mb-2">
                                    🦾 DISPOSITIVOS / PRÓTESIS
                                </span>
                                <p className="text-[#0C4A6E] text-sm font-medium">{patient.medical_devices || 'Sin registros'}</p>
                            </div>

                            {/* Cirugías */}
                            <div className="bg-[#F5F3FF] p-4 rounded-xl border border-[#EDE9FE] shadow-sm">
                                <span className="text-[#6D28D9] text-[10px] font-black uppercase tracking-[0.2em] block mb-2">
                                    🔪 ANTECEDENTES QUIRÚRGICOS
                                </span>
                                <p className="text-[#4C1D95] text-sm font-medium">{patient.previous_surgeries || 'Sin registros'}</p>
                            </div>
                        </div>

                        {/* Contacto de Emergencia */}
                        {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
                            <div className="md:col-span-4 mt-4 p-4 bg-gray-50/50 rounded-xl border border-gray-100 flex items-center justify-between">
                                <div>
                                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] block mb-1">🆘 CONTACTO DE EMERGENCIA</span>
                                    <span className="font-bold text-gray-800">{patient.emergency_contact_name}</span>
                                </div>
                                <div className="text-right">
                                    <span className="bg-white px-3 py-1 rounded-full text-blue-600 font-bold border border-blue-100 text-xs">
                                        📞 {patient.emergency_contact_phone}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Formulario de Nuevo Registro (Diseño más suave) */}
                {showAddForm && (
                    <div className="bg-white/80 backdrop-blur-md border border-blue-100 rounded-3xl p-8 mb-12 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
                                    Nuevo Informe Médico
                                    <span className="ml-3 px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] rounded uppercase tracking-widest">Digital</span>
                                </h3>
                                <p className="text-gray-400 text-sm mt-1">Complete los campos siguiendo el protocolo MINPPAL</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest block">ID Trámite</span>
                                <span className="text-xs font-mono text-gray-400">#REF-{new Date().getTime().toString().slice(-6)}</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitRecord} className="space-y-8">
                            {/* Signos Vitales */}
                            <div className="bg-[#FFF1F2]/50 p-6 rounded-2xl border border-red-50">
                                <label className="block text-sm font-bold text-red-800 mb-3">❤️ Signos Vitales (Obligatorio)</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 block mb-1">Temperatura (°C)</label>
                                        <input
                                            type="text"
                                            value={formData.temperature}
                                            onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                                            placeholder="Ej: 37,5"
                                            className={`w-full text-sm rounded border-gray-300 focus:border-red-500 focus:ring-red-500 py-1.5 px-2 ${formErrors.temperature ? 'border-red-500 bg-red-50' : ''}`}
                                        />
                                        {formErrors.temperature && <p className="text-[10px] text-red-600 font-bold mt-0.5">{formErrors.temperature}</p>}
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 block mb-1">P. Sistólica</label>
                                        <input
                                            type="text"
                                            value={formData.systolicPressure}
                                            onChange={(e) => setFormData({ ...formData, systolicPressure: e.target.value })}
                                            placeholder="Ej: 120"
                                            className={`w-full text-sm rounded border-gray-300 focus:border-red-500 focus:ring-red-500 py-1.5 px-2 ${formErrors.systolicPressure ? 'border-red-500 bg-red-50' : ''}`}
                                        />
                                        {formErrors.systolicPressure && <p className="text-[10px] text-red-600 font-bold mt-0.5">{formErrors.systolicPressure}</p>}
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 block mb-1">P. Diastólica</label>
                                        <input
                                            type="text"
                                            value={formData.diastolicPressure}
                                            onChange={(e) => setFormData({ ...formData, diastolicPressure: e.target.value })}
                                            placeholder="Ej: 80"
                                            className={`w-full text-sm rounded border-gray-300 focus:border-red-500 focus:ring-red-500 py-1.5 px-2 ${formErrors.diastolicPressure ? 'border-red-500 bg-red-50' : ''}`}
                                        />
                                        {formErrors.diastolicPressure && <p className="text-[10px] text-red-600 font-bold mt-0.5">{formErrors.diastolicPressure}</p>}
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 block mb-1">Pulso (ppm)</label>
                                        <input
                                            type="text"
                                            value={formData.pulse}
                                            onChange={(e) => setFormData({ ...formData, pulse: e.target.value })}
                                            placeholder="Ej: 75"
                                            className={`w-full text-sm rounded border-gray-300 focus:border-red-500 focus:ring-red-500 py-1.5 px-2 ${formErrors.pulse ? 'border-red-500 bg-red-50' : ''}`}
                                        />
                                        {formErrors.pulse && <p className="text-[10px] text-red-600 font-bold mt-0.5">{formErrors.pulse}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Diagnóstico y Motivo */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Consulta *</label>
                                    <select
                                        required
                                        value={formData.consultationType}
                                        onChange={(e) => setFormData({ ...formData, consultationType: e.target.value })}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border bg-white text-sm"
                                    >
                                        <option value="">Seleccione...</option>
                                        <option value="Preventiva / Chequeo anual.">Preventiva / Chequeo anual.</option>
                                        <option value="Nueva consulta / Primera vez.">Nueva consulta / Primera vez.</option>
                                        <option value="Consulta por problema nuevo.">Consulta por problema nuevo.</option>
                                        <option value="Control de enfermedad crónica.">Control de enfermedad crónica.</option>
                                        <option value="Seguimiento / Revisión de evolución.">Seguimiento / Revisión de evolución.</option>
                                        <option value="Revisión de resultados.">Revisión de resultados.</option>
                                        <option value="Vacaciones (Control salida).">Vacaciones (Control salida).</option>
                                        <option value="Vacaciones (Control regreso).">Vacaciones (Control regreso).</option>
                                        <option value="Consulta Nuevo Ingreso.">Consulta Nuevo Ingreso.</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Motivo de Consulta (Síntomas)</label>
                                    <textarea
                                        rows={2}
                                        value={formData.symptoms}
                                        onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                                        placeholder="Ej: Paciente refiere fiebre alta, mareo..."
                                        className={`w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border ${formErrors.symptoms ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                    />
                                    {formErrors.symptoms && <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.symptoms}</p>}
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-[10px] text-gray-400">Max 500 caracteres</span>
                                        <span className={`text-[10px] ${formData.symptoms.length > 450 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                            {formData.symptoms.length}/500
                                        </span>
                                    </div>
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Patología (Catálogo) *</label>
                                    
                                    {/* Buscador de Patología */}
                                    <div className="relative">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="🔍 Buscar patología..."
                                                value={searchTerm}
                                                onFocus={() => setShowPathologyList(true)}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className={`w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 pl-10 pr-3 border bg-white text-sm ${formErrors.pathologyId ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-gray-400">🔍</span>
                                            </div>
                                            {formData.pathologyId && (
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({...formData, pathologyId: '', diagnosis: ''});
                                                        setSearchTerm('');
                                                    }}
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>

                                        {showPathologyList && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                                                {filteredPathologies.length > 0 ? (
                                                    filteredPathologies.map(p => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData({ 
                                                                    ...formData, 
                                                                    pathologyId: p.id,
                                                                    diagnosis: p.name + ", " 
                                                                });
                                                                setSearchTerm(p.name);
                                                                setShowPathologyList(false);
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 border-b border-gray-50 last:border-0 transition-colors"
                                                        >
                                                            {p.name}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-3 text-sm text-gray-500 italic text-center">
                                                        No se encontraron resultados
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {formErrors.pathologyId && <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.pathologyId}</p>}
                                    
                                    {/* Backdrop para cerrar la lista al hacer click fuera */}
                                    {showPathologyList && (
                                        <div 
                                            className="fixed inset-0 z-40" 
                                            onClick={() => setShowPathologyList(false)}
                                        />
                                    )}

                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4 mb-1">Detalle / Evolución del Diagnóstico</label>
                                    <textarea
                                        rows={2}
                                        value={formData.diagnosis}
                                        onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                                        placeholder="Ej: Presenta mejoría, requiere seguimiento..."
                                        className={`w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border text-sm ${formErrors.diagnosis ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                    />
                                    {formErrors.diagnosis && <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.diagnosis}</p>}
                                </div>
                            </div>

                            {/* Tipo de Tratamiento */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Acude para tratamiento:</label>
                                <div className="flex gap-6">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="treatmentType"
                                            value="continuo"
                                            checked={formData.treatmentType === 'continuo'}
                                            onChange={(e) => setFormData({ ...formData, treatmentType: e.target.value as 'continuo' | 'temporal' })}
                                            className="mr-2 w-4 h-4 text-accent focus:ring-accent"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Continuo</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="treatmentType"
                                            value="temporal"
                                            checked={formData.treatmentType === 'temporal'}
                                            onChange={(e) => setFormData({ ...formData, treatmentType: e.target.value as 'continuo' | 'temporal' })}
                                            className="mr-2 w-4 h-4 text-accent focus:ring-accent"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Temporal</span>
                                    </label>
                                </div>
                            </div>

                            {/* Ameritando, tratamiento a base de: */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <label className="block text-sm font-bold text-gray-700 mb-3">
                                    Ameritando, tratamiento a base de:
                                    <span className="text-xs font-normal text-gray-500 ml-2">(Hasta 7 indicaciones)</span>
                                </label>
                                <div className="space-y-2">
                                    {formData.indications.map((indication, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-600 w-4">{index + 1}.</span>
                                            <input
                                                type="text"
                                                value={indication}
                                                onChange={(e) => updateIndication(index, e.target.value)}
                                                placeholder={`Indicación ${index + 1}`}
                                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Duración del Tratamiento */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Por espacio de:
                                    <span className="text-xs font-normal text-gray-500 ml-2">(Duración del tratamiento)</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.treatmentDuration}
                                    onChange={(e) => setFormData({ ...formData, treatmentDuration: e.target.value })}
                                    placeholder="Ej: 7 días, 2 semanas, 1 mes"
                                    className="w-full md:w-1/2 rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                />
                            </div>

                            {/* Reposo Médico */}
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                <div className="flex items-center mb-3">
                                    <input
                                        type="checkbox"
                                        id="requiresRest"
                                        checked={formData.requiresRest}
                                        onChange={(e) => setFormData({ ...formData, requiresRest: e.target.checked, restDays: e.target.checked ? formData.restDays : 0 })}
                                        className="mr-2 w-4 h-4 text-accent focus:ring-accent rounded"
                                    />
                                    <label htmlFor="requiresRest" className="text-sm font-bold text-gray-700 cursor-pointer">
                                        ⚠️ Amerita Reposo Médico (Generar Constancia de Asistencia)
                                    </label>
                                </div>
                                {formData.requiresRest && (
                                    <div className="mt-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Días de Reposo:</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.restDays}
                                            onChange={(e) => setFormData({ ...formData, restDays: parseInt(e.target.value) || 0 })}
                                            placeholder="Ej: 3"
                                            className={`w-32 rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border ${formErrors.restDays ? 'border-red-500' : ''}`}
                                        />
                                        {formErrors.restDays && <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.restDays}</p>}
                                    </div>
                                )}
                            </div>

                            {/* Receta Médica (KPIs Estructurados) */}
                            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                <label className="block text-sm font-bold text-blue-800 mb-3 flex items-center">
                                    <span className="mr-2 text-lg">💊</span>
                                    Récipe Médico (Farmacia)
                                    <span className="text-xs font-normal text-blue-600 ml-2 bg-blue-100 px-2 py-0.5 rounded-full">Se generará documento PDF oficial</span>
                                </label>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 rounded-md border border-gray-200 shadow-sm mb-3">
                                    <div className="md:col-span-1">
                                        <label className="text-xs font-semibold text-gray-500 block mb-1">Medicamento *</label>
                                        <input
                                            type="text"
                                            value={newItem.medicine_name}
                                            onChange={(e) => setNewItem({ ...newItem, medicine_name: e.target.value })}
                                            placeholder="Ej: Amoxicilina"
                                            className="w-full text-sm rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 py-1.5"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="text-xs font-semibold text-gray-500 block mb-1">Dosis</label>
                                        <input
                                            type="text"
                                            value={newItem.dosage}
                                            onChange={(e) => setNewItem({ ...newItem, dosage: e.target.value })}
                                            placeholder="Ej: 500mg"
                                            className="w-full text-sm rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 py-1.5"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="text-xs font-semibold text-gray-500 block mb-1">Cantidad</label>
                                        <input
                                            type="text"
                                            value={newItem.quantity}
                                            onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                                            placeholder="Ej: 1 Caja / 10 Tab"
                                            className="w-full text-sm rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 py-1.5"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="text-xs font-semibold text-gray-500 block mb-1">Duración</label>
                                        <input
                                            type="text"
                                            value={newItem.duration}
                                            onChange={(e) => setNewItem({ ...newItem, duration: e.target.value })}
                                            placeholder="Ej: 7 días"
                                            className="w-full text-sm rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 py-1.5"
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="text-xs font-semibold text-gray-500 block mb-1">Instrucciones / Nota (Opcional)</label>
                                        <input
                                            type="text"
                                            value={newItem.instructions}
                                            onChange={(e) => setNewItem({ ...newItem, instructions: e.target.value })}
                                            placeholder="Ej: Tomar con alimentos..."
                                            className="w-full text-sm rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 py-1.5"
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex items-end">
                                        <button
                                            type="button"
                                            onClick={addPrescriptionItem}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-1.5 px-3 rounded shadow transition-colors flex items-center justify-center"
                                        >
                                            <span className="mr-1">+</span> Agregar
                                        </button>
                                    </div>
                                </div>

                                {/* Lista de Items Agregados */}
                                {prescriptionItems.length > 0 ? (
                                    <div className="rounded-lg border border-gray-200 overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicamento</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosis</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duración</th>
                                                    <th className="px-3 py-2 text-right"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {prescriptionItems.map((item, index) => (
                                                    <tr key={index}>
                                                        <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                                            {item.medicine_name}
                                                            {item.instructions && <span className="block text-xs text-gray-500 italic">{item.instructions}</span>}
                                                        </td>
                                                        <td className="px-3 py-2 text-sm text-gray-500">{item.dosage || '-'}</td>
                                                        <td className="px-3 py-2 text-sm text-gray-500">{item.quantity || '-'}</td>
                                                        <td className="px-3 py-2 text-sm text-gray-500">{item.duration || '-'}</td>
                                                        <td className="px-3 py-2 text-right text-sm">
                                                            <button
                                                                type="button"
                                                                onClick={() => removePrescriptionItem(index)}
                                                                className="text-red-500 hover:text-red-700 font-bold"
                                                            >
                                                                ✕
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-center text-sm text-gray-500 py-4 italic border-2 border-dashed border-gray-200 rounded-lg">
                                        No se han agregado medicamentos al récipe.
                                    </p>
                                )}
                            </div>

                            {/* Orden de Examenes (Opcional) */}
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                <label className="block text-sm font-bold text-purple-900 mb-3 flex items-center">
                                    <span className="mr-2 text-lg">🔬</span>
                                    Orden de Exámenes (Opcional)
                                    <span className="text-xs font-normal text-purple-600 ml-2 bg-purple-100 px-2 py-0.5 rounded-full">Se generará documento PDF oficial</span>
                                </label>

                                <div className="space-y-4">
                                    {/* Laboratorio */}
                                    <div className="bg-white p-3 rounded border border-gray-200">
                                        <div className="flex items-center mb-2">
                                            <input
                                                type="checkbox"
                                                id="reqLab"
                                                checked={formData.reqLab}
                                                onChange={(e) => setFormData({ ...formData, reqLab: e.target.checked })}
                                                className="mr-2 w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                                            />
                                            <label htmlFor="reqLab" className="text-sm font-bold text-gray-700 cursor-pointer">
                                                1. Laboratorio (Envío Digital Directo)
                                            </label>
                                        </div>
                                        {formData.reqLab && (
                                            <div className="space-y-6 mt-4 ml-6 animate-in fade-in slide-in-from-left-2">
                                                {formData.labTests.map((test, index) => (
                                                    <div key={index} className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 relative group">
                                                        {formData.labTests.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeLabTest(index)}
                                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-10"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                                            <div>
                                                                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1 block">Categoría</label>
                                                                <select
                                                                    value={test.category}
                                                                    onChange={(e) => updateLabTest(index, 'category', e.target.value)}
                                                                    className="w-full text-sm rounded border-gray-300 py-2 px-3 focus:border-purple-500 focus:ring-purple-500 bg-white shadow-sm"
                                                                >
                                                                    <option value="sangre">Sangre (Hematología/Química)</option>
                                                                    <option value="heces">Heces (Coproparasitario)</option>
                                                                    <option value="orina">Orina (Citoquímico)</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1 block">Nombre del Examen</label>
                                                                <input
                                                                    type="text"
                                                                    value={test.testName}
                                                                    onChange={(e) => updateLabTest(index, 'testName', e.target.value)}
                                                                    placeholder="Ej: Perfil 20, Hematología Completa..."
                                                                    className="w-full text-sm rounded border-gray-300 py-2 px-3 focus:border-purple-500 focus:ring-purple-500 bg-white shadow-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1 block">Observaciones para el Laboratorio</label>
                                                            <textarea
                                                                rows={2}
                                                                value={test.observations}
                                                                onChange={(e) => updateLabTest(index, 'observations', e.target.value)}
                                                                placeholder="Detalles adicionales: Ayunas, toma de muestra específica..."
                                                                className="w-full text-sm rounded border-gray-300 py-2 px-3 focus:border-purple-500 focus:ring-purple-500 bg-white shadow-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={addLabTest}
                                                    className="flex items-center gap-2 text-xs font-black text-purple-600 hover:text-purple-800 transition-all uppercase tracking-widest bg-purple-100/50 px-4 py-2 rounded-xl border border-dashed border-purple-300 w-full justify-center"
                                                >
                                                    ➕ Agregar otro examen de laboratorio
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Rayos X */}
                                    <div className="bg-white p-3 rounded border border-gray-200">
                                        <div className="flex items-center mb-2">
                                            <input
                                                type="checkbox"
                                                id="reqXray"
                                                checked={formData.reqXray}
                                                onChange={(e) => setFormData({ ...formData, reqXray: e.target.checked })}
                                                className="mr-2 w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                                            />
                                            <label htmlFor="reqXray" className="text-sm font-bold text-gray-700 cursor-pointer">
                                                2. Rayos X / Imagenología
                                            </label>
                                        </div>
                                        {formData.reqXray && (
                                            <textarea
                                                rows={2}
                                                value={formData.xrayRequest}
                                                onChange={(e) => setFormData({ ...formData, xrayRequest: e.target.value })}
                                                placeholder="Detalles: RX Tórax PA, Eco abdominal..."
                                                className="w-full text-sm rounded border-gray-300 py-2 px-3 focus:border-purple-500 focus:ring-purple-500"
                                            />
                                        )}
                                    </div>

                                    {/* Otros */}
                                    <div className="bg-white p-3 rounded border border-gray-200">
                                        <div className="flex items-center mb-2">
                                            <input
                                                type="checkbox"
                                                id="reqOther"
                                                checked={formData.reqOther}
                                                onChange={(e) => setFormData({ ...formData, reqOther: e.target.checked })}
                                                className="mr-2 w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                                            />
                                            <label htmlFor="reqOther" className="text-sm font-bold text-gray-700 cursor-pointer">
                                                3. Otros Estudios / Observaciones
                                            </label>
                                        </div>
                                        {formData.reqOther && (
                                            <textarea
                                                rows={2}
                                                value={formData.otherRequest}
                                                onChange={(e) => setFormData({ ...formData, otherRequest: e.target.value })}
                                                placeholder="Detalles: Referencia a especialista, ecografía..."
                                                className="w-full text-sm rounded border-gray-300 py-2 px-3 focus:border-purple-500 focus:ring-purple-500"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Notas Adicionales del Médico */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Observaciones del Médico</label>
                                <textarea
                                    rows={2}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Notas internas, recomendaciones adicionales..."
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border"
                                />
                            </div>

                            {/* Botones */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent-600 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            💾 Guardar Informe Médico
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Módulo de Laboratorio */}
                <div className="mb-12">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                        <span className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center mr-3 text-lg">🔬</span>
                        Resultados de Laboratorio
                        {labOrders.filter(o => o.status === 'completado').length > 0 && (
                            <span className="ml-3 text-[10px] font-black text-white bg-accent px-2 py-1 rounded-full uppercase tracking-widest animate-pulse">
                                {labOrders.filter(o => o.status === 'completado').length} Nuevos
                            </span>
                        )}
                    </h3>

                    {labOrders.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {labOrders.map((order) => (
                                <div key={order.id} className={`bg-white/70 backdrop-blur-sm rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${
                                    order.status === 'completado' ? 'border-accent/30 bg-accent/5' : 'border-gray-200'
                                }`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                                                order.category === 'sangre' ? 'bg-red-50 text-red-500' : 
                                                order.category === 'orina' ? 'bg-yellow-50 text-yellow-500' : 
                                                'bg-amber-50 text-amber-700'
                                            }`}>
                                                {order.category === 'sangre' ? '🩸' : order.category === 'orina' ? '🧪' : '💩'}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm">{order.test_name}</h4>
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{order.category}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                            order.status === 'pendiente' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                                            order.status === 'completado' ? 'bg-accent/10 text-accent border-accent/20' :
                                            'bg-blue-50 text-blue-600 border-blue-200'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </div>

                                    {order.status === 'completado' && order.results && (
                                        <div className="space-y-3">
                                            <div className="p-3 bg-white/50 rounded-xl border border-gray-100 text-xs text-gray-600">
                                                <p className="font-bold text-gray-800 mb-1">Resumen de Hallazgos:</p>
                                                <p className="line-clamp-2 italic">
                                                    {order.results[0]?.observations || 'Sin observaciones adicionales.'}
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    // Aquí se abriría un modal o se generaría el PDF del resultado
                                                    toast.success('Abriendo reporte de resultados...');
                                                }}
                                                className="w-full py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all"
                                            >
                                                Ver Resultados Detallados
                                            </button>
                                        </div>
                                    )}

                                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                                        <span className="text-[9px] text-gray-400 font-medium">Solicitado el {new Date(order.created_at).toLocaleDateString()}</span>
                                        {order.status === 'pendiente' && (
                                            <span className="text-[9px] text-yellow-600 font-bold italic">En espera de toma de muestra</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center">
                            <p className="text-gray-400 font-black text-xs uppercase tracking-widest">No hay órdenes de laboratorio registradas</p>
                        </div>
                    )}
                </div>

                {/* Historial Médico */}
                <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                        📋 Historial Clínico
                        <span className="ml-3 text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {medicalRecords.length} registros
                        </span>
                    </h3>

                    {medicalRecords.length > 0 ? (
                        <div className="space-y-6">
                            {medicalRecords.map((record) => (
                                <div key={record.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/60 overflow-hidden hover:shadow-md transition-all duration-300">

                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-blue-50/50 to-transparent p-4 border-b border-gray-100">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-lg text-gray-900">{record.diagnosis}</h4>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Dr. {record.doctor?.full_name} - {record.doctor?.specialty}
                                                </p>
                                                {record.consultation_type && (
                                                    <span className="inline-block mt-2 bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-200">
                                                        🩺 {record.consultation_type}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-bold border border-accent/20 block mb-2">
                                                    {new Date(record.record_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                                {record.treatment_type && (
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${record.treatment_type === 'continuo' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {record.treatment_type === 'continuo' ? '🔄 Continuo' : '⏱️ Temporal'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Signos Vitales Bar */}
                                    {(record.temperature || record.systolic_pressure || record.pulse) && (
                                        <div className="mx-5 mt-4 p-3 bg-red-50/30 rounded-xl border border-red-100/50 flex flex-wrap gap-4 items-center justify-around shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">🌡️</span>
                                                <div>
                                                    <p className="text-[9px] font-black text-red-400 uppercase tracking-tighter leading-none">Temp.</p>
                                                    <p className="text-xs font-bold text-red-700">{record.temperature || '--'}°C</p>
                                                </div>
                                            </div>
                                            <div className="w-px h-6 bg-red-100 hidden md:block" />
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">🩸</span>
                                                <div>
                                                    <p className="text-[9px] font-black text-red-400 uppercase tracking-tighter leading-none">Presión</p>
                                                    <p className="text-xs font-bold text-red-700">{record.systolic_pressure || '--'}/{record.diastolic_pressure || '--'} mmHg</p>
                                                </div>
                                            </div>
                                            <div className="w-px h-6 bg-red-100 hidden md:block" />
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">💓</span>
                                                <div>
                                                    <p className="text-[9px] font-black text-red-400 uppercase tracking-tighter leading-none">Pulso</p>
                                                    <p className="text-xs font-bold text-red-700">{record.pulse || '--'} ppm</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Contenido */}
                                    <div className="p-5 space-y-4">

                                        {record.symptoms && (
                                            <div>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Motivo de Consulta</span>
                                                <p className="text-sm text-gray-700 bg-gray-50/50 p-3 rounded-xl border border-gray-100">{record.symptoms}</p>
                                            </div>
                                        )}

                                        {record.treatment_indications && Array.isArray(record.treatment_indications) && record.treatment_indications.length > 0 && (
                                            <div>
                                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-2">Tratamiento a Base De:</span>
                                                <ol className="space-y-2 bg-blue-50/30 p-4 rounded-xl border border-blue-100/50">
                                                    {record.treatment_indications.map((indication, idx) => (
                                                        <li key={idx} className="text-sm text-gray-800 flex gap-3 items-start">
                                                            <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">{idx + 1}</span>
                                                            <span className="font-medium leading-relaxed">{indication}</span>
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}

                                        {record.treatment_duration && (
                                            <div>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Duración</span>
                                                <p className="text-xs font-bold text-gray-600 bg-gray-100/50 px-3 py-1.5 rounded-full border border-gray-100 inline-flex items-center gap-2">
                                                    ⏱️ {record.treatment_duration}
                                                </p>
                                            </div>
                                        )}

                                        {record.requires_rest && (
                                            <div className="bg-[#FFFBEB] border border-[#FEF3C7] p-4 rounded-xl flex items-center gap-3">
                                                <span className="text-xl">🛌</span>
                                                <div>
                                                    <p className="text-[10px] font-black text-[#92400E] uppercase tracking-widest">Reposo Médico</p>
                                                    <p className="text-sm font-bold text-[#78350F]">
                                                        {record.rest_days} {record.rest_days === 1 ? 'día' : 'días'} de reposo absoluto
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Visualización de Receta (Legacy o KPI) */}
                                        {(record.prescriptions?.text || (record as any).prescription_items?.length > 0) && (
                                            <div>
                                                <span className="text-xs font-bold text-green-700 uppercase tracking-wide block mb-1">Receta Médica</span>
                                                <div className="bg-green-50 border-2 border-green-200 p-3 rounded">

                                                    {/* Caso 1: Items KPI Estructurados */}
                                                    {(record as any).prescription_items?.length > 0 ? (
                                                        <ul className="list-disc list-inside space-y-1">
                                                            {(record as any).prescription_items.map((item: any, idx: number) => (
                                                                <li key={idx} className="text-sm text-green-900 font-medium">
                                                                    <span className="font-bold">{item.medicine_name}</span>
                                                                    {item.dosage && ` (${item.dosage})`}
                                                                    {item.quantity && ` - ${item.quantity}`}
                                                                    {item.duration && ` x ${item.duration}`}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        /* Caso 2: Texto Legacy */
                                                        <p className="text-sm text-green-900 font-medium whitespace-pre-line">
                                                            {record.prescriptions?.text !== undefined ? record.prescriptions.text : JSON.stringify(record.prescriptions)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {record.notes && (
                                            <div className="pt-3 border-t border-gray-100">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Observaciones</span>
                                                <p className="text-sm text-gray-600 italic">"{record.notes}"</p>
                                            </div>
                                        )}

                                        {/* Botones de Descarga */}
                                        <div className="pt-4 border-t border-gray-100 flex gap-2 flex-wrap">
                                            <button
                                                onClick={() => handleDownloadInforme(record)}
                                                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium transition shadow-sm flex items-center gap-1"
                                            >
                                                📄 Reporte Médico
                                            </button>

                                            {/* Botón condicional de Receta */}
                                            {(record.prescriptions?.text || (record as any).prescription_items?.length > 0) && (
                                                <button
                                                    onClick={() => handleDownloadReceta(record)}
                                                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium transition shadow-sm flex items-center gap-1"
                                                >
                                                    💊 Imprimir Récipe
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleDownloadConstancia(record)}
                                                className="flex items-center justify-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-700 transition shadow-sm border border-transparent"
                                                title="Constancia de Asistencia"
                                            >
                                                🕒 Constancia
                                            </button>

                                            {(record.lab_request || record.xray_request || record.other_request) && (
                                                <button
                                                    onClick={() => handleDownloadOrden(record)}
                                                    className="flex items-center justify-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-700 transition shadow-sm border border-transparent"
                                                    title="Orden de Exámenes"
                                                >
                                                    🔬 Orden Examen
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white p-12 rounded-xl border border-dashed border-gray-200 text-center opacity-70">
                            <span className="text-5xl mb-4 block grayscale">📄</span>
                            <h4 className="font-bold text-gray-600 text-lg">Sin registros médicos</h4>
                            <p className="text-sm text-gray-400 mt-1">Este paciente no tiene historial clínico aún.</p>
                        </div>
                    )}
                </div>

            </main >

            {/* Botón Volver Arriba (Posición central derecha para evitar conflictos) */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center group"
                    title="Volver al inicio"
                >
                    <div className="bg-accent/90 backdrop-blur-md text-white pl-3 pr-2 py-6 rounded-l-2xl shadow-[-4px_0_15px_rgba(0,0,0,0.1)] border-y border-l border-white/20 transition-all duration-500 transform translate-x-1 group-hover:translate-x-0 flex flex-col items-center gap-2">
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-5 w-5 animate-bounce-slow" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <span className="[writing-mode:vertical-lr] text-[10px] font-black uppercase tracking-widest">Subir</span>
                    </div>
                </button>
            )}
        </div >
    );
}
