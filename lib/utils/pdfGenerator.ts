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
    BLUE_VITAL: [50, 100, 200] // Azul claro para labels de vitales
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
const addSignatureFooter = (doc: jsPDF, doctor: DoctorData) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = pageHeight - 40;

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(70, y, 140, y);
    y += 5;

    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Dr. ${doctor.full_name}`, 105, y, { align: 'center' });
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(doctor.specialty || 'Medicina General', 105, y, { align: 'center' });
    y += 5;

    const credenciales = [];
    if (doctor.cedula) credenciales.push(`C.I.: ${doctor.cedula}`);
    if (doctor.license_number) credenciales.push(`MPPS: ${doctor.license_number}`);

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

    // Etiqueta Paciente
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('PACIENTE:', 20, y);
    
    // Nombre del Paciente con límite de ancho para evitar choque con C.I.
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    const nameWidth = 85; // Espacio máximo para el nombre antes de llegar a C.I.
    doc.text(patient.full_name, 40, y, { maxWidth: nameWidth });

    // Etiqueta C.I.
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('C.I.:', 130, y);
    
    // Valor C.I.
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

    // === SIGNOS VITALES (Diseño Mejorado) ===
    const temp = record.temperature ? `${record.temperature} °C` : '--';
    const sist = record.systolic_pressure || '--';
    const diast = record.diastolic_pressure || '--';
    const pulse = record.pulse ? `${record.pulse} ppm` : '--';

    // Dibujar fondo sutil para signos vitales
    doc.setFillColor(252, 241, 241); // Fondo rosado muy pálido (acorde al tema médico/rojo)
    doc.roundedRect(15, y - 5, 180, 12, 1, 1, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    // Temperatura
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('TEMPERATURA:', 20, y + 3);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 0, 0); // Rojo clínico
    doc.text(temp, 48, y + 3);

    // Presión
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('TENSIÓN ART:', 80, y + 3);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 0, 0);
    doc.text(`${sist}/${diast} mmHg`, 108, y + 3);

    // Pulso
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('PULSO:', 155, y + 3);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 0, 0);
    doc.text(pulse, 170, y + 3);

    y += 18;

    // === MOTIVO ===
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('MOTIVO:', 20, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    // Usamos 'symptoms' como Motivo según la lógica definida
    const motivoText = doc.splitTextToSize(record.symptoms || 'Control Médico', 170);
    doc.text(motivoText, 20, y);
    y += motivoText.length * 5 + 10;

    // === DIAGNÓSTICO ===
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
    doc.text('DIAGNÓSTICO:', 20, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    
    const pathologyName = record.pathologies?.name || '';
    // Si hay patología oficial, la ponemos en negrita/mayúscula primero
    if (pathologyName) {
        doc.setFont('helvetica', 'bold');
        doc.text(pathologyName.toUpperCase(), 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
    }

    const diagnosisText = doc.splitTextToSize(record.diagnosis || 'No especificado', 170);
    doc.text(diagnosisText, 20, y);
    y += diagnosisText.length * 5 + 10;

    // (Opcional) Nota de reposo si existe, aunque no está en la imagen referencia estricta, suele ir en informes.
    // La imagen referencia NO muestra tratamiento. Así que NO lo pongo.

    addSignatureFooter(doc, doctor);
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
    doc.setTextColor(0);
    doc.text('Rp./', 20, y);
    y += 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);

    doc.text('MEDICAMENTO', 22, y);
    doc.text('DOSIS / PRESENTACIÓN', 100, y);
    doc.text('CANTIDAD A DESPACHAR', 150, y);

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
                doc.setFont('helvetica', 'bold');
                doc.text('MEDICAMENTO', 22, y);
                y += 6;
            }

            const medName = doc.splitTextToSize(item.medicine_name, 70);
            const dosage = doc.splitTextToSize(item.dosage || '--', 40);
            const qty = item.quantity || '--';

            doc.text(medName, 22, y);
            doc.text(dosage, 100, y);
            doc.text(qty, 150, y);

            const rows = Math.max(medName.length, dosage.length);
            const rowHeight = rows * 6;

            y += rowHeight + 4;

            doc.setDrawColor(240);
            doc.setLineWidth(0.1);
            doc.line(20, y - 2, 190, y - 2);
        });
    } else if (record.prescriptions?.text) {
        const lines = doc.splitTextToSize(record.prescriptions.text, 170);
        doc.text(lines, 20, y);
    } else {
        doc.setTextColor(150);
        doc.text('Sin medicamentos indicados.', 20, y);
    }

    const footerY = pageHeight - 50;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Este documento es válido exclusivamente para la dispensación de medicamentos en farmacia.', 20, footerY);

    addSignatureFooter(doc, doctor);
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

    doc.setFont('helvetica', 'normal');
    
    const pathologyName = record.pathologies?.name || '';
    const diagFinal = pathologyName 
        ? `${pathologyName.toUpperCase()} - ${record.diagnosis}`
        : record.diagnosis;

    const bodyText1 = `Quien suscribe, Dr(a). ${doctor.full_name}, hace constar por medio de la presente que el paciente antes mencionado asistió a consulta médica en nuestras instalaciones el día ${formatDate(record.record_date)}, para evaluación y control de salud.\n\nDiagnóstico Clínico: ${diagFinal}`;

    const lines1 = doc.splitTextToSize(bodyText1, 160);
    doc.text(lines1, 25, y);
    y += lines1.length * 6 + 10;

    if (record.requires_rest && record.rest_days && record.rest_days > 0) {
        doc.setFont('helvetica', 'bold');
        const restLines = doc.splitTextToSize(`NOTA: Se indica REPOSO MÉDICO por un lapso de ${record.rest_days} día(s) contados a partir de la fecha de la consulta.`, 160);
        doc.text(restLines, 25, y);
        y += restLines.length * 6 + 10;
    }

    doc.setFont('helvetica', 'normal');
    doc.text('Constancia que se expide a petición de la parte interesada.', 25, y);

    addSignatureFooter(doc, doctor);
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

    doc.setFontSize(11);
    doc.setTextColor(0);

    // Se solicita evaluación mediante los siguientes estudios:
    doc.setFont('helvetica', 'normal');
    const intro = "Se solicita realizar los siguientes estudios paraclínicos para evaluación diagnóstica:";
    doc.text(intro, 20, y);
    y += 10;

    let hasExams = false;

    // 1. Laboratorio
    if (record.lab_request) {
        hasExams = true;
        // Caja de título
        doc.setFillColor(245, 248, 255);
        doc.roundedRect(20, y, 170, 8, 1, 1, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
        doc.text('1. LABORATORIO CLÍNICO (Heces - Orina - Hematología)', 25, y + 5.5);
        y += 12;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        const labText = doc.splitTextToSize(record.lab_request, 160);
        doc.text(labText, 25, y);
        y += labText.length * 6 + 8;
    }

    // 2. Rayos X
    if (record.xray_request) {
        hasExams = true;
        doc.setFillColor(245, 248, 255);
        doc.roundedRect(20, y, 170, 8, 1, 1, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
        doc.text('2. RAYOS X / IMAGENOLOGÍA', 25, y + 5.5);
        y += 12;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        const xrayText = doc.splitTextToSize(record.xray_request, 160);
        doc.text(xrayText, 25, y);
        y += xrayText.length * 6 + 8;
    }

    // 3. Otros
    if (record.other_request) {
        hasExams = true;
        doc.setFillColor(245, 248, 255);
        doc.roundedRect(20, y, 170, 8, 1, 1, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLORS.BLUE_DARK[0], COLORS.BLUE_DARK[1], COLORS.BLUE_DARK[2]);
        doc.text('3. OTROS ESTUDIOS / OBSERVACIONES', 25, y + 5.5);
        y += 12;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        const otherText = doc.splitTextToSize(record.other_request, 160);
        doc.text(otherText, 25, y);
        y += otherText.length * 6 + 8;
    }

    if (!hasExams) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        doc.text('Sin estudios adicionales solicitados en esta orden.', 25, y);
        y += 10;
    }

    addSignatureFooter(doc, doctor);
    doc.save(`Orden_Examen_${patient.full_name}.pdf`);
};
