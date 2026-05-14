'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

interface MedicalRecord {
    id: string;
    record_date: string;
    diagnosis: string;
    symptoms: string;
    treatment: string;
    prescriptions: any;
    lab_results: string;
    notes: string;
    doctor: {
        full_name: string;
        specialty: string;
    };
    temperature?: string;
    systolic_pressure?: string;
    diastolic_pressure?: string;
    pulse?: string;
    consultation_type?: string;
}

// ── PDF GENERATOR ──────────────────────────────────────────────
const generatePDF = async (records: MedicalRecord[], patientName: string) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const W = 210; // A4 width mm
    const margin = 18;
    const contentW = W - margin * 2;
    let y = 0;

    const COLORS = {
        navy: [10, 36, 99] as [number, number, number],
        accent: [6, 214, 160] as [number, number, number],
        accentDark: [4, 128, 96] as [number, number, number],
        lightGray: [245, 247, 250] as [number, number, number],
        midGray: [107, 114, 128] as [number, number, number],
        dark: [17, 24, 39] as [number, number, number],
        white: [255, 255, 255] as [number, number, number],
        greenLight: [236, 253, 245] as [number, number, number],
        greenBorder: [52, 211, 153] as [number, number, number],
    };

    // ── Cargar logo como base64 via canvas ──
    const loadImageAsBase64 = (url: string): Promise<string> =>
        new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve('');
            img.src = url;
        });

    const logoBase64 = await loadImageAsBase64(
        '/images/logo-history.png'
    );

    const addPage = () => {
        doc.addPage();
        y = 28;
        // mini-header en páginas siguientes
        doc.setFillColor(...COLORS.navy);
        doc.rect(0, 0, W, 14, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Sistema de Salud Institucional MINPPAL — Historial Clínico Confidencial', margin, 9);
        doc.setTextColor(...COLORS.midGray);
        doc.text(`${patientName}`, W - margin, 9, { align: 'right' });
    };

    const checkY = (needed: number) => {
        if (y + needed > 275) addPage();
    };

    // ── PORTADA / HEADER ───────────────────────────────────────
    const headerH = 38; // altura del header principal

    // Fondo azul navy
    doc.setFillColor(...COLORS.navy);
    doc.rect(0, 0, W, headerH, 'F');

    // Franja verde izquierda
    doc.setFillColor(...COLORS.accent);
    doc.rect(0, 0, 5, headerH, 'F');

    // ── Contenedor rectangular blanco para el logo (centrado verticalmente) ──
    const logoBoxW = 60;  // ancho del contenedor
    const logoBoxH = 28;  // alto del contenedor
    const logoBoxX = 10;  // x desde el borde izq (dejando la franja verde)
    const logoBoxY = (headerH - logoBoxH) / 2; // centrado vertical

    // Sombra suave del contenedor
    doc.setFillColor(0, 20, 70);
    doc.roundedRect(logoBoxX + 1, logoBoxY + 1, logoBoxW, logoBoxH, 3, 3, 'F');

    // Contenedor blanco
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, 3, 3, 'F');

    // Insertar imagen del logo centrada dentro del contenedor
    if (logoBase64) {
        // Calcular proporciones manteniendo aspect ratio
        const imgMaxW = logoBoxW - 6;   // padding interno horizontal
        const imgMaxH = logoBoxH - 6;   // padding interno vertical
        const imgX = logoBoxX + 3;
        const imgY = logoBoxY + 3;
        doc.addImage(logoBase64, 'PNG', imgX, imgY, imgMaxW, imgMaxH, '', 'FAST');
    } else {
        // Fallback texto si la imagen no carga
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.navy);
        doc.text('MINPPAL', logoBoxX + logoBoxW / 2, logoBoxY + logoBoxH / 2, { align: 'center' });
    }

    // Línea separadora vertical entre logo y título
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(logoBoxX + logoBoxW + 8, logoBoxY + 4, logoBoxX + logoBoxW + 8, logoBoxY + logoBoxH - 4);

    // ── Título del documento (derecha) ──
    const titleX = logoBoxX + logoBoxW + 14;
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('HISTORIAL CLINICO PERSONAL', titleX, logoBoxY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(200, 220, 255);
    doc.text('Sistema de Salud Institucional MINPPAL', titleX, logoBoxY + 15);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`, titleX, logoBoxY + 21);
    doc.text(`Total de registros: ${records.length}`, titleX, logoBoxY + 27);

    y = headerH + 8;

    // Paciente banner
    const patientBoxHeight = 22;
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(margin, y, contentW, patientBoxHeight, 3, 3, 'F');
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentW, patientBoxHeight, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.midGray);
    doc.text('PACIENTE', margin + 5, y + 7);
    
    // Texto legal - Movido un poco más arriba y a la derecha con cuidado
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.midGray);
    doc.text('DOCUMENTO PRIVADO Y CONFIDENCIAL', W - margin - 5, y + 7, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.navy);
    // Limitamos el ancho del nombre para evitar que choque con el borde derecho
    const nameText = patientName.toUpperCase();
    const maxNameWidth = contentW - 10;
    doc.text(nameText, margin + 5, y + 15, { maxWidth: maxNameWidth });

    y += patientBoxHeight + 8;

    // ── REGISTROS ─────────────────────────────────────────────
    records.forEach((record, idx) => {
        checkY(52);

        const dateStr = new Date(record.record_date).toLocaleDateString('es-ES', {
            day: '2-digit', month: 'long', year: 'numeric'
        });

        // Número de consulta
        doc.setFillColor(...COLORS.navy);
        doc.roundedRect(margin, y, 8, 8, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(...COLORS.white);
        doc.text(`${idx + 1}`, margin + 4, y + 5.5, { align: 'center' });

        // Header de consulta (Aumentado de 14 a 19 para la nueva línea)
        const headerBoxHeight = 19;
        doc.setFillColor(230, 236, 255);
        doc.roundedRect(margin + 10, y, contentW - 10, headerBoxHeight, 2, 2, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.navy);
        doc.text(`Consulta — ${dateStr}`, margin + 14, y + 6);

        // Médico (Corrigiendo el Dr. Dr.)
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.accentDark);
        let doctorDisplayName = record.doctor?.full_name || 'No especificado';
        if (doctorDisplayName.toLowerCase().startsWith('dr.')) {
            doctorDisplayName = doctorDisplayName.substring(3).trim();
        }
        doc.text(`Dr. ${doctorDisplayName}`, margin + 14, y + 11);

        if (record.doctor?.specialty) {
            doc.setTextColor(...COLORS.midGray);
            const drPrefixWidth = doc.getTextWidth(`Dr. ${doctorDisplayName} `);
            doc.text(`• ${record.doctor.specialty}`, margin + 14 + drPrefixWidth, y + 11);
        }

        // NUEVO: Motivo de consulta
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.navy);
        doc.text('MOTIVO:', margin + 14, y + 16);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.midGray);
        doc.text(record.consultation_type || 'Consulta General', margin + 28, y + 16);

        y += headerBoxHeight + 4;
        checkY(15);
        // ── SIGNOS VITALES (Diseño Mejorado) ──
        if (record.temperature || record.systolic_pressure || record.pulse) {
            checkY(18);
            doc.setFillColor(254, 242, 242);
            doc.roundedRect(margin, y, contentW, 12, 2, 2, 'F');
            doc.setDrawColor(252, 165, 165);
            doc.setLineWidth(0.3);
            doc.roundedRect(margin, y, contentW, 12, 2, 2, 'S');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(185, 28, 28);
            
            // Labels
            doc.text('TEMPERATURA', margin + 5, y + 4.5);
            doc.text('TENSIÓN ART.', margin + 65, y + 4.5);
            doc.text('PULSO', margin + 125, y + 4.5);

            // Valores
            doc.setFontSize(9);
            doc.setTextColor(153, 27, 27);
            doc.text(`${record.temperature || '--'} °C`, margin + 5, y + 9);
            doc.text(`${record.systolic_pressure || '--'}/${record.diastolic_pressure || '--'} mmHg`, margin + 65, y + 9);
            doc.text(`${record.pulse || '--'} ppm`, margin + 125, y + 9);

            y += 16;
        }

        // ── DIAGNÓSTICO ──
        checkY(20);
        doc.setFillColor(239, 246, 255);
        doc.roundedRect(margin, y, contentW, 12, 2, 2, 'F');
        doc.setDrawColor(191, 219, 254);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, y, contentW, 12, 2, 2, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(37, 99, 235);
        doc.text('DIAGNOSTICO / MOTIVO DE CONSULTA', margin + 4, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.dark);
        const diagLines = doc.splitTextToSize(record.diagnosis || '—', contentW - 8);
        // if diagnosis overflows 12mm box, expand
        if (diagLines.length > 1) {
            const boxH = 8 + diagLines.length * 4.5;
            doc.setFillColor(239, 246, 255);
            doc.roundedRect(margin, y, contentW, boxH, 2, 2, 'F');
            doc.setDrawColor(191, 219, 254);
            doc.roundedRect(margin, y, contentW, boxH, 2, 2, 'S');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(37, 99, 235);
            doc.text('DIAGNOSTICO / MOTIVO DE CONSULTA', margin + 4, y + 5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(17, 24, 39);
            doc.text(diagLines, margin + 4, y + 10);
            y += boxH + 3;
        } else {
            doc.text(record.diagnosis || '—', margin + 4, y + 10);
            y += 16;
        }

        // ── RECETA ──
        if (record.prescriptions) {
            checkY(22);
            const rxText = record.prescriptions?.text !== undefined ? record.prescriptions.text : JSON.stringify(record.prescriptions);
            const rxLines = doc.splitTextToSize(rxText, contentW - 10);
            const rxH = 10 + rxLines.length * 4.5;

            doc.setFillColor(...COLORS.greenLight);
            doc.roundedRect(margin, y, contentW, rxH, 2, 2, 'F');
            doc.setDrawColor(...COLORS.greenBorder);
            doc.setLineWidth(0.4);
            doc.roundedRect(margin, y, contentW, rxH, 2, 2, 'S');
            // Franja verde izq
            doc.setFillColor(...COLORS.accent);
            doc.roundedRect(margin, y, 3, rxH, 1, 1, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(...COLORS.accentDark);
            doc.text('RECETA MÉDICA', margin + 6, y + 5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(6, 78, 59);
            doc.text(rxLines, margin + 6, y + 10);
            y += rxH + 3;
        }

        // ── SÍNTOMAS ──
        if (record.symptoms) {
            checkY(16);
            const sLines = doc.splitTextToSize(record.symptoms, contentW - 8);
            const sH = 8 + sLines.length * 4.5;
            doc.setFillColor(249, 250, 251);
            doc.roundedRect(margin, y, contentW, sH, 2, 2, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(...COLORS.midGray);
            doc.text('SÍNTOMAS REPORTADOS', margin + 4, y + 5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(...COLORS.dark);
            doc.text(sLines, margin + 4, y + 10);
            y += sH + 3;
        }

        // ── NOTAS ──
        if (record.notes) {
            checkY(14);
            const nLines = doc.splitTextToSize(`"${record.notes}"`, contentW - 8);
            const nH = 8 + nLines.length * 4.5;
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(229, 231, 235);
            doc.setLineWidth(0.3);
            doc.roundedRect(margin, y, contentW, nH, 2, 2, 'FD');
            doc.setFont('helvetica', 'bolditalic');
            doc.setFontSize(7);
            doc.setTextColor(...COLORS.midGray);
            doc.text('OBSERVACIONES DEL MÉDICO', margin + 4, y + 5);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8.5);
            doc.setTextColor(75, 85, 99);
            doc.text(nLines, margin + 4, y + 10);
            y += nH + 3;
        }

        // Separador entre registros
        if (idx < records.length - 1) {
            y += 4;
            doc.setDrawColor(...COLORS.accent);
            doc.setLineWidth(0.6);
            doc.line(margin, y, W - margin, y);
            y += 8;
        }
    });

    // ── FOOTER institucional ──
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        
        // Línea horizontal
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(margin, 280, W - margin, 280);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.midGray);
        
        // Dirección alineada a la izquierda para evitar colisión con la numeración
        const address = "Ministerio del Poder Popular para la Alimentación, MINPPAL. / Avenida Andrés Bello / Edificio Las Fundaciones / Caracas";
        doc.text(address, margin, 287);
        
        // Numeración de página alineada a la derecha
        doc.setFont('helvetica', 'bold');
        doc.text(`Página ${p} de ${totalPages}`, W - margin, 287, { align: 'right' });
    }

    const fileName = `Historial_${patientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
};
// ──────────────────────────────────────────────────────────────

export default function PatientHistoryPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
    const [patientName, setPatientName] = useState('Paciente');

    useEffect(() => {
        loadMedicalHistory();
    }, []);

    const loadMedicalHistory = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/login'); return; }
            const user = session.user;

            // Intentar obtener perfil de paciente
            let { data: patient } = await supabase
                .from('patients')
                .select('id, full_name')
                .eq('user_id', user.id)
                .single();

            // Respaldo robusto: Buscar por cédula si no hay vínculo directo
            if (!patient) {
                const searchCedula = user.user_metadata?.cedula || user.email?.split('@')[0];
                if (searchCedula) {
                    const { data: existingPatient } = await supabase
                        .from('patients')
                        .select('id, full_name')
                        .eq('cedula', searchCedula)
                        .single();

                    if (existingPatient) {
                        // Auto-vincular
                        await (supabase as any).from('patients').update({ user_id: user.id }).eq('id', existingPatient.id);
                        patient = existingPatient;
                    }
                }
            }

            if (patient) {
                setPatientName((patient as any).full_name || 'Paciente');
                const { data: records, error } = await supabase
                    .from('medical_records')
                    .select(`
                        id, record_date, diagnosis, symptoms,
                        treatment, prescriptions, lab_results, notes,
                        temperature, systolic_pressure, diastolic_pressure, pulse, consultation_type,
                        doctor:doctor_id ( full_name, specialty )
                    `)
                    .eq('patient_id', (patient as any).id)
                    .order('record_date', { ascending: false })
                    .order('created_at', { ascending: false });

                if (error) console.error('Error cargando historial:', error);
                setMedicalRecords(records || []);
            }
        } catch (error) {
            console.error('Error inesperado:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        setGenerating(true);
        try {
            await generatePDF(medicalRecords, patientName);
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: '#f0f4f8' }}>

            {/* ── HERO BANNER ── */}
            <div className="relative h-52 overflow-hidden">
                <img
                    src="/images/bg-patient-history.jpeg"
                    alt="Historial Clínico"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(135deg, rgba(10,36,99,0.55) 0%, rgba(2,7,20,0.40) 100%)' }} />

                {/* Navbar flotante */}
                <div className="absolute top-0 left-0 right-0 z-20">
                    <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                        <Link href="/patient/dashboard"
                            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-semibold">
                            <span className="text-lg">←</span> Volver al Dashboard
                        </Link>

                        {/* Botón PDF flotante */}
                        {medicalRecords.length > 0 && (
                            <button
                                onClick={handleDownloadPDF}
                                disabled={generating}
                                className="group relative flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 overflow-hidden"
                                style={{ background: 'linear-gradient(135deg, #0A2463, #1d4ed8)', boxShadow: '0 4px 15px rgba(10,36,99,0.4)', backdropFilter: 'blur(8px)' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                {generating ? (
                                    <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg><span>Generando...</span></>
                                ) : (
                                    <><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><span>Descargar PDF</span><span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full font-black">{medicalRecords.length}</span></>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Título centrado */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10" style={{ paddingTop: '48px' }}>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] mb-2" style={{ color: '#06D6A0' }}>● Sistema de Salud Institucional MINPPAL</p>
                    <h1 className="text-3xl font-black text-white drop-shadow-lg">📋 Mi Historial Clínico</h1>
                    <p className="text-white/60 text-sm mt-1">Diagnósticos, tratamientos y recetas registrados</p>
                </div>

                {/* Ola inferior */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-10">
                        <path d="M0,60 C360,0 1080,0 1440,60 L1440,60 L0,60 Z" fill="#f0f4f8" />
                    </svg>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start">
                    <span className="text-2xl mr-3">ℹ️</span>
                    <div>
                        <h4 className="font-bold text-blue-900 text-sm">Acceso a tu Historial Médico</h4>
                        <p className="text-blue-700 text-xs mt-1">
                            Aquí puedes revisar todos los diagnósticos, tratamientos y recetas registrados por tus médicos.
                            Este historial es completamente privado y confidencial.
                        </p>
                    </div>
                </div>

                {/* Historial */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                        <span>📋 Registros Médicos</span>
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {medicalRecords.length} {medicalRecords.length === 1 ? 'registro' : 'registros'}
                        </span>
                    </h3>

                    {medicalRecords.length > 0 ? (
                        <div className="space-y-4">
                            {medicalRecords.map((record) => (
                                <div key={record.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">

                                    {/* Header del registro */}
                                    <div className="bg-gradient-to-r from-blue-50 to-white p-4 border-b border-gray-100">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-lg text-gray-900 leading-tight">{record.diagnosis}</h4>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    👨‍⚕️ Dr. {record.doctor?.full_name}
                                                    {record.doctor?.specialty && <span className="text-gray-400 ml-2">• {record.doctor.specialty}</span>}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="inline-block bg-accent/10 text-accent px-3 py-1.5 rounded-xl text-[10px] font-black border border-accent/20 whitespace-nowrap shadow-sm">
                                                    {new Date(record.record_date).toLocaleDateString('es-ES', {
                                                        day: 'numeric', month: 'short', year: 'numeric'
                                                    }).toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contenido del registro */}
                                    <div className="p-5 space-y-4">
                                        {/* Signos Vitales Bar */}
                                        {(record.temperature || record.systolic_pressure || record.pulse) && (
                                            <div className="mx-0 mb-4 p-2.5 bg-red-50/50 rounded-xl border border-red-100/50 flex flex-wrap gap-4 items-center justify-around shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs">🌡️</span>
                                                    <div>
                                                        <p className="text-[8px] font-black text-red-400 uppercase tracking-tighter leading-none">Temp.</p>
                                                        <p className="text-xs font-bold text-red-700">{record.temperature || '--'}°C</p>
                                                    </div>
                                                </div>
                                                <div className="w-px h-5 bg-red-100 hidden md:block" />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs">🩸</span>
                                                    <div>
                                                        <p className="text-[8px] font-black text-red-400 uppercase tracking-tighter leading-none">Presión</p>
                                                        <p className="text-xs font-bold text-red-700">{record.systolic_pressure || '--'}/{record.diastolic_pressure || '--'} mmHg</p>
                                                    </div>
                                                </div>
                                                <div className="w-px h-5 bg-red-100 hidden md:block" />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs">💓</span>
                                                    <div>
                                                        <p className="text-[8px] font-black text-red-400 uppercase tracking-tighter leading-none">Pulso</p>
                                                        <p className="text-xs font-bold text-red-700">{record.pulse || '--'} ppm</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {record.symptoms && (
                                            <div>
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Síntomas Reportados</span>
                                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">{record.symptoms}</p>
                                            </div>
                                        )}
                                        {record.treatment && (
                                            <div>
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Tratamiento Indicado</span>
                                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">{record.treatment}</p>
                                            </div>
                                        )}
                                        {record.prescriptions && (
                                            <div>
                                                <span className="text-xs font-bold text-green-700 uppercase tracking-wide block mb-1">Receta Médica</span>
                                                <div className="bg-green-50 border-2 border-green-200 p-3 rounded-lg">
                                                    <p className="text-sm text-green-900 font-medium">
                                                        {record.prescriptions?.text !== undefined ? record.prescriptions.text : JSON.stringify(record.prescriptions)}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {record.lab_results && (
                                            <div>
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Resultados de Laboratorio</span>
                                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">{record.lab_results}</p>
                                            </div>
                                        )}
                                        {record.notes && (
                                            <div className="pt-3 border-t border-gray-100">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Observaciones del Médico</span>
                                                <p className="text-sm text-gray-600 italic">"{record.notes}"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white p-16 rounded-xl border border-dashed border-gray-200 text-center">
                            <div className="text-6xl mb-4 grayscale opacity-20">📄</div>
                            <h3 className="font-bold text-gray-600 text-lg mb-2">Historial Vacío</h3>
                            <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                                Aún no tienes registros médicos. Cuando asistas a una consulta, tu médico agregará diagnósticos, tratamientos y recetas aquí.
                            </p>
                            <Link
                                href="/patient/appointments/request"
                                className="inline-flex items-center px-4 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent-600 transition shadow-sm text-sm"
                            >
                                Solicitar mi Primera Cita →
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
