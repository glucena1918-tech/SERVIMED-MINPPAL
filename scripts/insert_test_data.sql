-- SCRIPT DE DATOS DE PRUEBA - SERVIMED MINPPAL
-- Fecha: 17 de Marzo de 2026

DO $$ 
DECLARE
    doctor_elena_id UUID := extensions.uuid_generate_v4();
    patient_carlos_id UUID := extensions.uuid_generate_v4();
    patient_ana_id UUID := extensions.uuid_generate_v4();
    juan_perez_id UUID := '4bc3f477-7243-4154-b39d-b1dfdf456de5'; -- ID existente
BEGIN
    -- 1. Insertar una nueva Doctora (Dra. Elena Ramos)
    -- Nota: No vinculamos a auth.users para simplificar, a menos que sea necesario para login.
    -- Los doctores en la tabla public.doctors pueden existir sin user_id para pruebas de UI.
    INSERT INTO public.doctors (id, full_name, specialty, license_number, bio, experience_years, is_verified, is_active, cedula, phone)
    VALUES (
        doctor_elena_id, 
        'Dra. Elena Ramos', 
        'Medicina Interna', 
        'MED-VE-987654', 
        'Especialista en control de enfermedades crónicas.', 
        15, 
        true, 
        true, 
        'V-9876543', 
        '0414-9998877'
    );

    -- 2. Insertar nuevos Pacientes
    INSERT INTO public.patients (id, full_name, date_of_birth, gender, blood_type, cedula, agency, department, work_location, contact_phone)
    VALUES 
    (
        patient_carlos_id, 
        'Carlos Ruiz', 
        '1985-05-12', 
        'male', 
        'O+', 
        'V-15888777', 
        'MINPPAL', 
        'Recursos Humanos', 
        'Torre Las Mercedes', 
        '0412-5554433'
    ),
    (
        patient_ana_id, 
        'Ana Silva', 
        '1992-11-30', 
        'female', 
        'AB-', 
        'V-20111222', 
        'CUSPAL', 
        'Administración', 
        'Sede Central', 
        '0424-1112233'
    );

    -- 3. Insertar Citas de Prueba para HOY y próximos días
    -- Cita 1: Carlos con Juan Perez (HOY - Pendiente)
    INSERT INTO public.appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason)
    VALUES (patient_carlos_id, juan_perez_id, CURRENT_DATE, '09:00:00', 'pending', 'Chequeo traumatológico de rutina');

    -- Cita 2: Ana con Elena Ramos (HOY - Confirmada)
    INSERT INTO public.appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason)
    VALUES (patient_ana_id, doctor_elena_id, CURRENT_DATE, '10:30:00', 'confirmed', 'Control de tensión arterial');

    -- Cita 3: María González (existente) con Elena Ramos (MAÑANA - Confirmada)
    INSERT INTO public.appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason)
    VALUES ('4ed11a9e-5454-4acc-9795-c3b4a5e4f4d5', doctor_elena_id, CURRENT_DATE + INTERVAL '1 day', '14:00:00', 'confirmed', 'Consulta por fatiga persistente');

    -- Cita 4: Pedro Perez (existente) con Juan Perez (Ayer - Completada)
    -- Nota: Al marcar como completed, lo ideal es vincular un medical_record, pero para prueba visual de dashboard basta el estado.
    INSERT INTO public.appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason, notes)
    VALUES ('0e409f4c-9406-4f97-9b7c-18b81fd69245', juan_perez_id, CURRENT_DATE - INTERVAL '1 day', '15:00:00', 'completed', 'Revisión de esguince', 'Paciente muestra mejoría');

END $$;
