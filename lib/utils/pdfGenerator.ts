import jsPDF from 'jspdf';

// Tipos de datos
interface PatientData {
    full_name: string;
    cedula: string;
    date_of_birth: string;
    gender: string;
    [key: string]: any;
}

interface DoctorData {
    full_name: string;
    specialty: string;
    cedula?: string;
    license_number?: string;
    [key: string]: any;
}

export interface PrescriptionItem {
    medicine_name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: string;
    instructions?: string;
}

export interface MedicalRecordData {
    record_date: string;
    diagnosis: string;
    symptoms?: string; // Motivo de Consulta
    treatment_type?: string;
    treatment_duration?: string;
    treatment_indications?: string[];
    requires_rest?: boolean;
    rest_days?: number;
    prescriptions?: any;
    prescription_items?: PrescriptionItem[];
    notes?: string;
    // Signos Vitales
    temperature?: string;
    systolic_pressure?: string;
    diastolic_pressure?: string;
    pulse?: string;
    // Solicitudes de Exámenes
    lab_request?: string;
    xray_request?: string;
    other_request?: string;
    pathologies?: { name: string };
    [key: string]: any;
}

// Utilidades
const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
};

const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return adjustedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Colores Institucionales
const COLORS = {
    BLUE_DARK: [0, 51, 102], // #003366
    GRAY_LIGHT: [250, 250, 250],
    GRAY_BORDER: [220, 220, 220],
    BLUE_VITAL: [50, 100, 200], // Azul claro para labels de vitales
    GRAY_TEXT: [100, 100, 100]
};

const INSTITUTION_ADDRESS = "Ministerio del Poder Popular para la Alimentación, MINPPAL. / Avenida Andrés Bello / Edificio Las Fundaciones / Caracas";

/**
 * Agrega el pie de página institucional (Línea horizontal + Dirección)
 */
const addGlobalFooter = (doc: jsPDF) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const footerY = pageHeight - 15;

    // Línea horizontal
    doc.setDrawColor(COLORS.GRAY_BORDER[0], COLORS.GRAY_BORDER[1], COLORS.GRAY_BORDER[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    // Dirección
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.GRAY_TEXT[0], COLORS.GRAY_TEXT[1], COLORS.GRAY_TEXT[2]);
    
    // Dirección alineada a la izquierda
    doc.text(INSTITUTION_ADDRESS, margin, footerY);
};

/**
 * Agrega el encabezado de imagen (Logo)
 */
const addHeader = (doc: jsPDF): number => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const headerWidth = pageWidth - (margin * 2);
    const headerHeight = 22;

    const headerImg = new Image();
    headerImg.src = '/images/header-documentos.png';

    try {
        doc.addImage(headerImg, 'PNG', margin, 5, headerWidth, headerHeight);
    } catch (e) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, 5, headerWidth, headerHeight, 'F');
    }
    return headerHeight + 15;
};

/**
 * Agrega el bloque de firma unificado
 */
const addSignatureFooter = (doc: jsPDF, doctor: DoctorData | null | undefined) => {
    if (!doctor) return; // Guard: si no hay datos del firmante, no renderizar
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = pageHeight - 40;

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(70, y, 140, y);
    y += 5;

    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Dr(a). ${doctor.full_name}`, 105, y, { align: 'center' });
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(doctor.specialty || 'Medicina General', 105, y, { align: 'center' });
    y += 5;

    const credenciales = [];
    if (doctor.cedula) credenciales.push(`C.I.: ${doctor.cedula}`);
    if (doctor.license_number) credenciales.push(`MPPS/LIC: ${doctor.license_number}`);

    if (credenciales.length > 0) {
        doc.text(credenciales.join('  |  '), 105, y, { align: 'center' });
    }
};

const addDocumentTitle = (doc: jsPDF, title: string, date: string, startY: number): number => {
    let y = startY;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text(title.toUpperCase(), 105, y, { align: 'center' });

    doc.setDrawColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.setLineWidth(0.5);
    doc.line(70, y + 2, 140, y + 2);
    y += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    doc.text(`Caracas, ${formatDate(date)}`, 190, y, { align: 'right' });

    return y + 10;
};

const addPatientBox = (doc: jsPDF, patient: PatientData, startY: number): number => {
    const boxHeight = 22;
    doc.setDrawColor(COLORS.GRAY_BORDER[0], COLORS.GRAY_BORDER[1], COLORS.GRAY_BORDER[2]);
    doc.setFillColor(COLORS.GRAY_LIGHT[0], COLORS.GRAY_LIGHT[1], COLORS.GRAY_LIGHT[2]);
    doc.roundedRect(15, startY, 180, boxHeight, 1, 1, 'FD');

    let y = startY + 6;
    doc.setFontSize(9);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('PACIENTE:', 20, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text(patient.full_name, 40, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('C.I.:', 130, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text(patient.cedula, 138, y);

    y += 9;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('EDAD:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text(`${calculateAge(patient.date_of_birth)} años`, 40, y);

    return startY + boxHeight + 8;
};

// =========================================================================
// GENERADORES
// =========================================================================

export const generateInformeMedico = (
    patient: PatientData,
    doctor: DoctorData,
    record: MedicalRecordData
) => {
    const doc = new jsPDF();
    let y = addHeader(doc);

    y = addDocumentTitle(doc, 'INFORME MÉDICO', record.record_date, y);
    y = addPatientBox(doc, patient, y);

    // Signos Vitales
    const temp = record.temperature ? `${record.temperature} °C` : '--';
    const sist = record.systolic_pressure || '--';
    const diast = record.diastolic_pressure || '--';
    const pulse = record.pulse ? `${record.pulse} ppm` : '--';

    doc.setFillColor(252, 241, 241);
    doc.roundedRect(15, y - 5, 180, 12, 1, 1, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('TEMPERATURA:', 20, y + 3);
    doc.setTextColor(180, 0, 0);
    doc.text(temp, 48, y + 3);

    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('TENSIÓN ART:', 80, y + 3);
    doc.setTextColor(180, 0, 0);
    doc.text(`${sist}/${diast} mmHg`, 108, y + 3);

    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('PULSO:', 155, y + 3);
    doc.setTextColor(180, 0, 0);
    doc.text(pulse, 170, y + 3);

    y += 18;

    // Motivo
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('MOTIVO:', 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    const motivoText = doc.splitTextToSize(record.symptoms || 'Control Médico', 170);
    doc.text(motivoText, 20, y);
    y += motivoText.length * 5 + 10;

    // Diagnóstico
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('DIAGNÓSTICO:', 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    
    const pathologyName = record.pathologies?.name || '';
    if (pathologyName) {
        doc.setFont('helvetica', 'bold');
        doc.text(pathologyName.toUpperCase(), 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
    }

    const diagnosisText = doc.splitTextToSize(record.diagnosis || 'No especificado', 170);
    doc.text(diagnosisText, 20, y);
    y += diagnosisText.length * 5 + 10;

    addSignatureFooter(doc, doctor);
    addGlobalFooter(doc);
    doc.save(`Informe_Medico_${patient.full_name}.pdf`);
};

export const generateReceta = (
    patient: PatientData,
    doctor: DoctorData,
    record: MedicalRecordData
) => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = addHeader(doc);

    y = addDocumentTitle(doc, 'RÉCIPE MÉDICO', record.record_date, y);
    y = addPatientBox(doc, patient, y);

    doc.setFont('times', 'bold');
    doc.setFontSize(24);
    doc.text('Rp./', 20, y);
    y += 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('MEDICAMENTO', 22, y);
    doc.text('DOSIS / PRESENTACIÓN', 100, y);
    doc.text('CANTIDAD', 150, y);

    y += 2;
    doc.setDrawColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0);

    if (record.prescription_items && record.prescription_items.length > 0) {
        record.prescription_items.forEach((item) => {
            if (y > pageHeight - 60) {
                doc.addPage();
                y = addHeader(doc) + 20;
            }
            doc.text(item.medicine_name, 22, y, { maxWidth: 70 });
            doc.text(item.dosage || '--', 100, y, { maxWidth: 40 });
            doc.text(item.quantity || '--', 150, y);
            y += 10;
        });
    } else {
        doc.text(record.prescriptions?.text || 'Sin medicamentos indicados.', 20, y, { maxWidth: 170 });
    }

    addSignatureFooter(doc, doctor);
    addGlobalFooter(doc);
    doc.save(`Recipe_${patient.full_name}.pdf`);
};

export const generateConstancia = (
    patient: PatientData,
    doctor: DoctorData,
    record: MedicalRecordData
) => {
    const doc = new jsPDF();
    let y = addHeader(doc);
    y = addDocumentTitle(doc, 'CONSTANCIA DE ASISTENCIA', record.record_date, y);
    y = addPatientBox(doc, patient, y);

    const diag = record.pathologies?.name ? `${record.pathologies.name} - ${record.diagnosis}` : record.diagnosis;
    const bodyText = `Quien suscribe, Dr(a). ${doctor.full_name}, hace constar que el paciente asistió a consulta el día ${formatDate(record.record_date)}.\n\nDiagnóstico: ${diag}`;
    
    doc.text(doc.splitTextToSize(bodyText, 160), 25, y);
    y += 40;

    if (record.requires_rest) {
        doc.setFont('helvetica', 'bold');
        doc.text(`REPOSO MÉDICO: ${record.rest_days} día(s).`, 25, y);
    }

    addSignatureFooter(doc, doctor);
    addGlobalFooter(doc);
    doc.save(`Constancia_${patient.full_name}.pdf`);
};

export const generateOrdenExamen = (
    patient: PatientData,
    doctor: DoctorData,
    record: MedicalRecordData
) => {
    const doc = new jsPDF();
    let y = addHeader(doc);
    y = addDocumentTitle(doc, 'ORDEN DE EXÁMENES', record.record_date, y);
    y = addPatientBox(doc, patient, y);

    const categories = [
        { title: '1. LABORATORIO CLÍNICO', data: record.lab_request },
        { title: '2. RAYOS X / IMAGENOLOGÍA', data: record.xray_request },
        { title: '3. OTROS ESTUDIOS', data: record.other_request }
    ];

    categories.forEach(cat => {
        if (cat.data) {
            doc.setFont('helvetica', 'bold');
            doc.text(cat.title, 20, y);
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.text(doc.splitTextToSize(cat.data, 160), 25, y);
            y += 20;
        }
    });

    addSignatureFooter(doc, doctor);
    addGlobalFooter(doc);
    doc.save(`Orden_${patient.full_name}.pdf`);
};

export const generateResultadoLaboratorio = (
    patient: PatientData,
    specialist: { full_name: string; license_number?: string },
    order: { test_name: string; category: string; created_at: string },
    results: { results_data: any; observations?: string }
) => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = addHeader(doc);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('RESULTADOS DE LABORATORIO', 105, y, { align: 'center' });
    y += 7;
    // Subtítulo específico por categoría
    doc.setFontSize(10);
    const subtitle = order.category === 'heces'
        ? 'RESULTADOS EXAMEN GENERAL DE HECES'
        : order.category === 'orina'
        ? 'EXAMEN GENERAL DE ORINA'
        : 'INFORME DE RESULTADOS DE LABORATORIO';
    doc.text(subtitle, 105, y, { align: 'center' });
    y += 10;

    doc.setFillColor(245, 247, 250);
    doc.roundedRect(15, y, 180, 25, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    
    doc.setFont('helvetica', 'bold'); doc.text('PACIENTE:', 20, y + 8);
    doc.setFont('helvetica', 'normal'); doc.text(patient.full_name.toUpperCase(), 45, y + 8);
    doc.setFont('helvetica', 'bold'); doc.text('CÉDULA:', 20, y + 15);
    doc.setFont('helvetica', 'normal'); doc.text(patient.cedula, 45, y + 15);
    doc.setFont('helvetica', 'bold'); doc.text('FECHA:', 130, y + 8);
    doc.setFont('helvetica', 'normal'); doc.text(new Date(order.created_at).toLocaleDateString(), 155, y + 8);
    doc.setFont('helvetica', 'bold'); doc.text('EXAMEN:', 130, y + 15);
    doc.setFont('helvetica', 'normal'); doc.text(order.test_name.toUpperCase(), 155, y + 15);
    
    y += 35;

    const addTableHeader = (doc: jsPDF, yPos: number) => {
        doc.setFillColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
        doc.roundedRect(15, yPos, 180, 8, 1, 1, 'F');
        doc.setFontSize(8);
        doc.setTextColor(255);
        doc.setFont('helvetica', 'bold');
        doc.text('PARÁMETRO', 20, yPos + 5.5);
        doc.text('RESULTADO', 90, yPos + 5.5, { align: 'center' });
        doc.text('UNIDAD', 125, yPos + 5.5, { align: 'center' });
        doc.text('VALORES DE REFERENCIA', 167, yPos + 5.5, { align: 'center' });
        return yPos + 12;
    };

    y = addTableHeader(doc, y);
    doc.setTextColor(0);

    // Mapa de nombres de sección para el PDF
    const SECTION_NAMES: Record<string, string> = {
        datosMuestra:           '1. DATOS DE LA MUESTRA',
        macroscopico:           '2. EXAMEN MACROSCÓPICO',
        quimicoHeces:           '3. EXAMEN QUÍMICO',
        microscopicoCorologico: '4. EXAMEN MICROSCÓPICO / COPROLÓGICO',
        coproparasitario:       '5. EXAMEN COPROPARASITARIO',
        hematologia:            'HEMATOLOGÍA',
        grupo:                  'GRUPO SANGUÍNEO',
        coagulacion:            'COAGULACIÓN',
        quimica:                'QUÍMICA SANGUÍNEA',
        fisico:                 'EXAMEN FÍSICO',
        quimico:                'EXAMEN QUÍMICO',
        sedimento:              'SEDIMENTO URINARIO (MICROSCÓPICO)',
        parasitario:            'EXAMEN COPROPARASITARIO',
    };

    const sections = results.results_data;
    for (const sectionName in sections) {
        const fields = sections[sectionName];
        const displayName = SECTION_NAMES[sectionName] || sectionName.toUpperCase();

        // Sección especial: Datos de la Muestra (tabla 2 columnas: Campo | Información)
        if (sectionName === 'datosMuestra') {
            if (y > pageHeight - 50) { doc.addPage(); y = addHeader(doc); }
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(245, 245, 245);
            doc.rect(15, y - 4, 180, 6, 'F');
            doc.text(displayName, 20, y);
            y += 8;
            // Cabecera de 2 columnas
            doc.setFillColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
            doc.roundedRect(15, y, 180, 7, 1, 1, 'F');
            doc.setFontSize(8); doc.setTextColor(255);
            doc.text('CAMPO', 20, y + 5);
            doc.text('INFORMACIÓN', 105, y + 5);
            y += 10;
            doc.setTextColor(0); doc.setFont('helvetica', 'normal');
            for (const field in fields) {
                const val = typeof fields[field] === 'object' ? (fields[field].value || '') : (fields[field] || '');
                if (val) {
                    if (y > pageHeight - 20) { doc.addPage(); y = addHeader(doc); }
                    doc.setFontSize(8);
                    doc.text(field, 20, y);
                    doc.text(val, 105, y);
                    doc.setDrawColor(240); doc.setLineWidth(0.1);
                    doc.line(15, y + 2, 195, y + 2);
                    y += 7;
                }
            }
            y += 5;
            // Agregar tabla estándar para el resto
            y = addTableHeader(doc, y);
            doc.setTextColor(0);
            continue;
        }

        if (y > pageHeight - 30) {
            doc.addPage();
            y = addHeader(doc);
            y = addTableHeader(doc, y);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(245, 245, 245);
        doc.rect(15, y - 4, 180, 6, 'F');
        doc.text(displayName, 20, y);
        y += 8;
        doc.setFont('helvetica', 'normal');
        
        for (const field in fields) {
            const data = fields[field];
            const value = typeof data === 'object' ? data.value : (data || '--');
            const unit = typeof data === 'object' ? (data.unit || '') : '';
            const reference = typeof data === 'object' ? (data.reference || '--') : '--';
            
            if (value && value !== '--') {
                if (y > pageHeight - 20) {
                    doc.addPage();
                    y = addHeader(doc);
                    y = addTableHeader(doc, y);
                }
                doc.setFontSize(8);
                doc.text(field, 20, y);
                doc.setFont('helvetica', 'bold');
                doc.text(value, 90, y, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.text(unit, 125, y, { align: 'center' });
                doc.text(reference, 167, y, { align: 'center' });
                doc.setDrawColor(240);
                doc.setLineWidth(0.1);
                doc.line(15, y + 2, 195, y + 2);
                y += 7;
            }
        }
        y += 5;
    }

    if (results.observations) {
        if (y > pageHeight - 50) { doc.addPage(); y = 30; }
        doc.setFont('helvetica', 'bold');
        doc.text('OBSERVACIONES:', 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(doc.splitTextToSize(results.observations, 170), 20, y);
    }

    // Asegurar que el especialista tenga el título correcto de Bioanalista
    const specialistWithDefaults = {
        ...specialist,
        specialty: (specialist as any).specialty || 'Bioanalista Clínico',
        full_name: (specialist as any).full_name || 'Bioanalista',
    };
    addSignatureFooter(doc, specialistWithDefaults as any);
    addGlobalFooter(doc);
    doc.save(`Resultado_${order.test_name}_${patient.full_name}.pdf`);
};
