'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

    const [loading, setLoading] = useState(true);
    const [patient, setPatient] = useState<PatientData | null>(null);
    const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
    const [activeAppointment, setActiveAppointment] = useState<any>(null);
    const [showAddForm, setShowAddForm] = useState(false);

    // Estado del formulario (adaptado al formato oficial)
    const [formData, setFormData] = useState({
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
        labRequest: '',
        reqXray: false,
        xrayRequest: '',
        reqOther: false,
        otherRequest: ''
    });

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
    }, [cedula]);

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
                    prescription_items (*)
                `)
                .eq('patient_id', (patientData as any).id)
                .order('record_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (recordsError) throw recordsError;
            setMedicalRecords(records || []);

            // 3. Cargar cita activa para hoy (si existe)
            const today = new Date().toISOString().split('T')[0];
            const { data: appointment } = await supabase
                .from('appointments')
                .select('*')
                .eq('patient_id', (patientData as any).id)
                .eq('appointment_date', today)
                .eq('status', 'confirmed')
                .single();
            
            if (appointment) {
                setActiveAppointment(appointment);
                setFormData(prev => ({
                    ...prev,
                    consultationType: appointment.consultation_type || '',
                    symptoms: appointment.reason || prev.symptoms
                }));
            }

        } catch (error) {
            console.error('Error cargando datos del paciente:', error);
            toast.error('No se pudo cargar la información del paciente.');
        } finally {
            setLoading(false);
        }
    };

    const addPrescriptionItem = () => {
        if (!newItem.medicine_name.trim()) {
            toast.error('El nombre del medicamento es obligatorio');
            return;
        }
        setPrescriptionItems([...prescriptionItems, newItem]);
        setNewItem({ medicine_name: '', dosage: '', quantity: '', duration: '', instructions: '' });
    };

    const removePrescriptionItem = (index: number) => {
        const updated = [...prescriptionItems];
        updated.splice(index, 1);
        setPrescriptionItems(updated);
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!formData.diagnosis.trim()) errors.diagnosis = 'El diagnóstico es obligatorio.';
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
                    doctor_id: doctor.id,
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
            const today = new Date().toISOString().split('T')[0];
            await supabase
                .from('appointments')
                .update({
                    status: 'completed',
                    medical_record_id: recordId, // Cast as any needed if types are outdated
                    updated_at: new Date().toISOString()
                } as any)
                .eq('patient_id', (patient as any).id)
                .eq('doctor_id', doctor.id)
                .eq('appointment_date', today)
                .eq('status', 'confirmed');
 
            toast.success('✅ Registro médico guardado exitosamente.');
            setFormErrors({});
            setShowAddForm(false);

            // Reset form
            setFormData({
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
                labRequest: '',
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <nav className="bg-white shadow-sm border-b sticky top-0 z-30">
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
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

                        {/* Alergias */}
                        {(patient.allergies_food || patient.allergies_medicine) && (
                            <div className="md:col-span-4">
                                <span className="text-gray-500 block mb-1">Alergias:</span>
                                <div className="flex flex-wrap gap-2">
                                    {patient.allergies_food && (
                                        <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs font-medium border border-red-200">
                                            🍽️ Comidas: {patient.allergies_food}
                                        </span>
                                    )}
                                    {patient.allergies_medicine && (
                                        <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs font-medium border border-red-200">
                                            💊 Medicamentos: {patient.allergies_medicine}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Enfermedades Crónicas */}
                        {patient.chronic_conditions && (
                            <div className="md:col-span-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
                                <span className="text-xs font-bold text-orange-700 uppercase tracking-wide block mb-1">🯠 Enfermedades Previas / Crónicas</span>
                                <p className="text-sm text-gray-800">{patient.chronic_conditions}</p>
                            </div>
                        )}

                        {/* Dispositivos Médicos */}
                        {patient.medical_devices && (
                            <div className="md:col-span-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide block mb-1">🦴 Dispositivos Médicos</span>
                                <p className="text-sm text-gray-800">{patient.medical_devices}</p>
                            </div>
                        )}

                        {/* Cirugías Previas */}
                        {patient.previous_surgeries && (
                            <div className="md:col-span-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
                                <span className="text-xs font-bold text-purple-700 uppercase tracking-wide block mb-1">🔪 Cirugías Previas</span>
                                <p className="text-sm text-gray-800">{patient.previous_surgeries}</p>
                            </div>
                        )}

                        {/* Antecedentes Familiares */}
                        {patient.family_diseases && (
                            <div className="md:col-span-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <span className="text-xs font-bold text-amber-700 uppercase tracking-wide block mb-1">👨‍👩‍👧 Antecedentes Familiares</span>
                                <p className="text-sm text-gray-800">{patient.family_diseases}</p>
                            </div>
                        )}

                        {/* Vacunas */}
                        {patient.vaccines && (
                            <div className="md:col-span-4 bg-green-50 border border-green-200 rounded-lg p-3">
                                <span className="text-xs font-bold text-green-700 uppercase tracking-wide block mb-1">💉 Vacunas Aplicadas</span>
                                <p className="text-sm text-gray-800">{patient.vaccines}</p>
                            </div>
                        )}

                        {/* Contacto de Emergencia */}
                        {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
                            <div className="md:col-span-4">
                                <span className="text-gray-500 block mb-1">🆘 Contacto de Emergencia:</span>
                                <span className="font-medium text-gray-900">
                                    {patient.emergency_contact_name} {patient.emergency_contact_phone ? `— ${patient.emergency_contact_phone}` : ''}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Formulario de Nuevo Registro (FORMATO OFICIAL) */}
                {showAddForm && (
                    <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-xl p-6 mb-8 shadow-lg">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center">
                            <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">📄</span>
                            Nuevo Informe Médico
                        </h3>
                        <p className="text-xs text-gray-500 mb-6 ml-11">Formato oficial <span style={{ color: '#0F75C1' }}>Sistema de Salud Institucional</span> <span style={{ color: '#292358' }}>MINPPAL</span></p>

                        <form onSubmit={handleSubmitRecord} className="space-y-6">

                            {/* Signos Vitales */}
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100 mb-4">
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
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Diagnóstico Médico *</label>
                                    <textarea
                                        rows={2}
                                        value={formData.diagnosis}
                                        onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                                        placeholder="Ej: Infección respiratoria aguda..."
                                        className={`w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent py-2 px-3 border ${formErrors.diagnosis ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                    />
                                    {formErrors.diagnosis && <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.diagnosis}</p>}
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-[10px] text-gray-400">Max 500 caracteres</span>
                                        <span className={`text-[10px] ${formData.diagnosis.length > 450 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                            {formData.diagnosis.length}/500
                                        </span>
                                    </div>
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
                                                1. Laboratorio (Heces - Orina - Hematología)
                                            </label>
                                        </div>
                                        {formData.reqLab && (
                                            <textarea
                                                rows={2}
                                                value={formData.labRequest}
                                                onChange={(e) => setFormData({ ...formData, labRequest: e.target.value })}
                                                placeholder="Detalles: Hematología completa, Orina, Heces, Perfil 20..."
                                                className="w-full text-sm rounded border-gray-300 py-2 px-3 focus:border-purple-500 focus:ring-purple-500"
                                            />
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

                {/* Historial Médico */}
                <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                        📋 Historial Clínico
                        <span className="ml-3 text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {medicalRecords.length} registros
                        </span>
                    </h3>

                    {medicalRecords.length > 0 ? (
                        <div className="space-y-4">
                            {medicalRecords.map((record) => (
                                <div key={record.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">

                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-blue-50 to-white p-4 border-b border-gray-100">
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

                                    {/* Contenido */}
                                    <div className="p-5 space-y-4">

                                        {record.symptoms && (
                                            <div>
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Síntomas</span>
                                                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{record.symptoms}</p>
                                            </div>
                                        )}

                                        {record.treatment_indications && Array.isArray(record.treatment_indications) && record.treatment_indications.length > 0 && (
                                            <div>
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Tratamiento a Base De:</span>
                                                <ol className="space-y-1 bg-blue-50 p-3 rounded border border-blue-100">
                                                    {record.treatment_indications.map((indication, idx) => (
                                                        <li key={idx} className="text-sm text-gray-800 flex gap-2">
                                                            <span className="font-bold text-blue-600">{idx + 1}.</span>
                                                            <span>{indication}</span>
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}

                                        {record.treatment_duration && (
                                            <div>
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Duración</span>
                                                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded inline-block">
                                                    📅 Por espacio de: <strong>{record.treatment_duration}</strong>
                                                </p>
                                            </div>
                                        )}

                                        {record.requires_rest && (
                                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                                                <p className="text-sm font-bold text-yellow-800">
                                                    ⚠️ Reposo Médico: {record.rest_days} {record.rest_days === 1 ? 'día' : 'días'}
                                                </p>
                                            </div>
                                        )}

                                        {/* Visualización de Receta (Legacy o KPI) */}
                                        {(record.prescriptions?.text || (record as any).prescription_items?.length > 0) && (
                                            <div>
                                                <span className="text-xs font-bold text-green-700 uppercase tracking-wide block mb-1">💊 Receta Médica</span>
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
                                                            {record.prescriptions?.text || JSON.stringify(record.prescriptions)}
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
        </div >
    );
}
