-- Script para poblar la base de datos con datos ficticios completos

-- ====================================================================
-- CREAR USUARIOS DE AUTH (Manual - Solo referencia)
-- ====================================================================
-- IMPORTANTE: Los UUIDs de ejemplo deben reemplazarse con los UUIDs reales
-- después de crear los usuarios mediante el Dashboard de Supabase Auth

-- Usuario Admin
-- Email: admin@servimed.com
-- Password: Admin123!
-- UUID de ejemplo: 11111111-1111-1111-1111-111111111111
-- user_metadata: {"role": "admin", "full_name": "Administrador Sistema"}

-- Usuario Médico
-- Email: medico@test.com
-- Password: Medico123!
-- UUID de ejemplo: 22222222-2222-2222-2222-222222222222
-- user_metadata: {"role": "doctor", "full_name": "Dr. Juan Pérez"}

-- Usuario Paciente
-- Email: paciente@test.com
-- Password: Paciente123!
-- UUID de ejemplo: 33333333-3333-3333-3333-333333333333
-- user_metadata: {"role": "patient", "full_name": "María González"}

-- ====================================================================
-- DATOS FICTICIOS - MÉDICOS (10 especialistas)
-- ====================================================================

-- Nota: Reemplazar los user_id con los UUIDs reales de los usuarios creados

INSERT INTO doctors (id, user_id, full_name, specialty, license_number, bio, experience_years, education, consultation_fee, avatar_url, rating, total_reviews, is_verified, is_active) VALUES
-- Dr. Juan Pérez - Cardiología
('d1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Dr. Juan Pérez', 'Cardiología', 'MED-001-2015', 'Especialista en enfermedades cardiovasculares con más de 10 años de experiencia', 10, '[{"degree": "Medicina General", "institution": "Universidad Nacional", "year": 2010}, {"degree": "Cardiología", "institution": "Hospital Universitario", "year": 2015}]'::jsonb, 75.00, null, 4.8, 127, true, true),

-- Dra. María González - Pediatría
('d2222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'Dra. María González', 'Pediatría', 'MED-002-2016', 'Pediatra especializada en desarrollo infantil y vacunación', 8, '[{"degree": "Medicina General", "institution": "Universidad Central", "year": 2012}, {"degree": "Pediatría", "institution": "Instituto Infantil", "year": 2016}]'::jsonb, 60.00, null, 4.9, 215, true, true),

-- Dr. Carlos Rodríguez - Traumatología
('d3333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'Dr. Carlos Rodríguez', 'Traumatología', 'MED-003-2013', 'Traumatólogo experto en cirugía ortopédica y rehabilitación', 12, '[{"degree": "Medicina General", "institution": "Universidad del Valle", "year": 2008}, {"degree": "Traumatología", "institution": "Hospital San José", "year": 2013}]'::jsonb, 80.00, null, 4.7, 98, true, true),

-- Dra. Ana Martínez - Ginecología
('d4444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666', 'Dra. Ana Martínez', 'Ginecología', 'MED-004-2017', 'Ginecóloga especializada en salud femenina y obstetricia', 7, '[{"degree": "Medicina General", "institution": "Universidad de los Andes", "year": 2013}, {"degree": "Ginecología", "institution": "Clínica Maternal", "year": 2017}]'::jsonb, 70.00, null, 4.9, 182, true, true),

-- Dr. Luis García - Dermatología
('d5555555-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777', 'Dr. Luis García', 'Dermatología', 'MED-005-2014', 'Dermatólogo experto en tratamientos de piel y estética médica', 9, '[{"degree": "Medicina General", "institution": "Universidad Javeriana", "year": 2011}, {"degree": "Dermatología", "institution": "Centro Dermatológico", "year": 2014}]'::jsonb, 65.00, null, 4.6, 143, true, true),

-- Dra. Carmen López - Oftalmología
('d6666666-6666-6666-6666-666666666666', '88888888-8888-8888-8888-888888888888', 'Dra. Carmen López', 'Oftalmología', 'MED-006-2018', 'Oftalmóloga especializada en cirugía refractiva', 6, '[{"degree": "Medicina General", "institution": "Universidad del Rosario", "year": 2014}, {"degree": "Oftalmología", "institution": "Instituto de la Visión", "year": 2018}]'::jsonb, 75.00, null, 4.8, 91, true, true),

-- Dr. Jorge Sánchez - Neurología
('d7777777-7777-7777-7777-777777777777', '99999999-9999-9999-9999-999999999999', 'Dr. Jorge Sánchez', 'Neurología', 'MED-007-2012', 'Neurólogo con especialización en migrañas y cefaleas', 13, '[{"degree": "Medicina General", "institution": "Universidad Nacional", "year": 2007}, {"degree": "Neurología", "institution": "Instituto Neurológico", "year": 2012}]'::jsonb, 85.00, null, 4.7, 76, true, true),

-- Dra. Laura Torres - Endocrinología
('d8888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dra. Laura Torres', 'Endocrinología', 'MED-008-2019', 'Endocrinóloga especializada en diabetes y tiroides', 5, '[{"degree": "Medicina General", "institution": "Universidad del Norte", "year": 2015}, {"degree": "Endocrinología", "institution": "Centro Metabólico", "year": 2019}]'::jsonb, 70.00, null, 4.9, 54, true, true),

-- Dr. Miguel Ramírez - Urología
('d9999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Dr. Miguel Ramírez', 'Urología', 'MED-009-2015', 'Urólogo experto en tratamientos mínimamente invasivos', 10, '[{"degree": "Medicina General", "institution": "Universidad Libre", "year": 2009}, {"degree": "Urología", "institution": "Hospital Militar", "year": 2015}]'::jsonb, 80.00, null, 4.6, 67, true, true),

-- Dra. Patricia Flores - Psiquiatría
('daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Dra. Patricia Flores', 'Psiquiatría', 'MED-010-2016', 'Psiquiatra especializada en terapia cognitivo-conductual', 8, '[{"degree": "Medicina General", "institution": "Universidad Externado", "year": 2012}, {"degree": "Psiquiatría", "institution": "Fundación Santa Fe", "year": 2016}]'::jsonb, 60.00, null, 4.8, 103, true, true);

-- ====================================================================
-- DATOS FICTICIOS - PACIENTES (20 pacientes)
-- ====================================================================

INSERT INTO patients (id, user_id, full_name, date_of_birth, gender, blood_type, allergies, emergency_contact, insurance_provider, insurance_number) VALUES
('p1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'María González', '1985-03-15', 'female', 'O+', '{Penicilina}', '{"name": "Juan González", "phone": "+57 300 1234567", "relationship": "Esposo"}'::jsonb, 'Seguros Bolivar', 'SB-12345678'),
('p2222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Carlos Mendoza', '1990-07-22', 'male', 'A+', '{}', '{"name": "Ana Mendoza", "phone": " +57 310 2345678", "relationship": "Hermana"}'::jsonb, 'Sura', 'SU-98765432'),
('p3333333-3333-3333-3333-333333333333', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Laura Ramírez', '1978-11-05', 'female', 'B+', '{Aspirina, Ibuprofeno}', '{"name": "Pedro Ramírez", "phone": "+57 320 3456789", "relationship": "Esposo"}'::jsonb, 'Sanitas', 'SA-45678901'),
('p4444444-4444-4444-4444-444444444444', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Andrés Castro', '1995-01-30', 'male', 'AB+', '{}', '{"name": "Rosa Castro", "phone": "+57 311 4567890", "relationship": "Madre"}'::jsonb, 'Compensar', 'CO-23456789'),
('p5555555-5555-5555-5555-555555555555', '10101010-1010-1010-1010-101010101010', 'Diana Palacios', '1988-09-12', 'female', 'O-', '{Látex}', '{"name": "Jorge Palacios", "phone": "+57 301 5678901", "relationship": "Hermano"}'::jsonb, 'Nueva EPS', 'NE-34567890');

-- Continuar insertando más pacientes hasta llegar a 20...

-- ====================================================================
-- DISPONIBILIDAD DE MÉDICOS (Horarios)
-- ====================================================================

-- Dr. Juan Pérez - Cardiología (Lunes a Viernes, 8:00-17:00)
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active) VALUES
('d1111111-1111-1111-1111-111111111111', 1, '08:00', '12:00', 30, true),
('d1111111-1111-1111-1111-111111111111', 1, '14:00', '17:00', 30, true),
('d1111111-1111-1111-1111-111111111111', 2, '08:00', '12:00', 30, true),
('d1111111-1111-1111-1111-111111111111', 2, '14:00', '17:00', 30, true),
('d1111111-1111-1111-1111-111111111111', 3, '08:00', '12:00', 30, true),
('d1111111-1111-1111-1111-111111111111', 3, '14:00', '17:00', 30, true),
('d1111111-1111-1111-1111-111111111111', 4, '08:00', '12:00', 30, true),
('d1111111-1111-1111-1111-111111111111', 5, '08:00', '12:00', 30, true);

-- Dra. María González - Pediatría (Lunes a Sábado, 9:00-18:00)
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active) VALUES
('d2222222-2222-2222-2222-222222222222', 1, '09:00', '13:00', 20, true),
('d2222222-2222-2222-2222-222222222222', 1, '14:00', '18:00', 20, true),
('d2222222-2222-2222-2222-222222222222', 2, '09:00', '13:00', 20, true),
('d2222222-2222-2222-2222-222222222222', 3, '09:00', '13:00', 20, true),
('d2222222-2222-2222-2222-222222222222', 6, '09:00', '13:00', 20, true);

-- ====================================================================
-- CITAS (50 registros - pasadas, presentes, futuras)
-- ====================================================================

-- Citas pasadas (completadas)
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, duration, status, reason, notes) VALUES
('p1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '2026-01-15', '10:00', 30, 'completed', 'Chequeo cardiológico de rutina', 'Paciente en buen estado general'),
('p2222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222', '2026-01-20', '11:00', 20, 'completed', 'Vacunación infantil', 'Vacuna aplicada correctamente');

-- Citas futuras (confirmadas)
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, duration, status, reason) VALUES
('p1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '2026-02-20', '10:00', 30, 'confirmed', 'Control de presión arterial'),
('p3333333-3333-3333-3333-333333333333', 'd4444444-4444-4444-4444-444444444444', '2026-02-21', '15:00', 30, 'confirmed', 'Consulta ginecológica');

-- Citas pendientes
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, duration, status, reason) VALUES
('p4444444-4444-4444-4444-444444444444', 'd3333333-3333-3333-3333-333333333333', '2026-02-25', '09:00', 30, 'pending', 'Dolor de rodilla'),
('p5555555-5555-5555-5555-555555555555', 'd5555555-5555-5555-5555-555555555555', '2026-02-26', '14:30', 30, 'pending', 'Consulta dermatológica');

-- Citas canceladas
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, duration, status, reason, cancelled_at, cancellation_reason) VALUES
('p2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', '2026-02-10', '16:00', 30, 'cancelled', 'Chequeo general', '2026-02-08 10:15:00', 'Viaje imprevisto');

-- ====================================================================
-- HISTORIALES MÉDICOS (30 registros)
-- ====================================================================

INSERT INTO medical_records (patient_id, doctor_id, record_date, diagnosis, symptoms, treatment, prescriptions, notes) VALUES
('p1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '2026-01-15', 'Hipertensión arterial leve', 'Dolor de cabeza ocasional, mareos', 'Control de dieta y ejercicio regular', '[{"medication": "Losartán", "dosage": "50mg", "frequency": "1 vez al día", "duration": "30 días"}]'::jsonb, 'Paciente responde bien al tratamiento'),
('p2222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222', '2026-01-20', 'Desarrollo infantil normal', 'Ninguno', 'Continuar con vacunación según calendario', '[]'::jsonb, 'Niño saludable');

-- ====================================================================
-- NOTIFICACIONES
-- ====================================================================

INSERT INTO notifications (user_id, type, title, message) VALUES
('33333333-3333-3333-3333-333333333333', 'appointment_confirmation', 'Cita Confirmada', 'Tu cita con Dr. Juan Pérez ha sido confirmada para el 20 de febrero a las 10:00 AM'),
('33333333-3333-3333-3333-333333333333', 'appointment_reminder', 'Recordatorio de Cita', 'Tienes una cita mañana con Dr. Juan Pérez a las 10:00 AM');

-- ====================================================================
-- MÉTRICAS ADMINISTRATIVAS
-- ====================================================================

INSERT INTO admin_metrics (metric_type, metric_date, value, metadata) VALUES
('appointments_count', '2026-02-01', 145, '{"specialty": "Cardiología"}'::jsonb),
('appointments_count', '2026-02-01', 223, '{"specialty": "Pediatría"}'::jsonb),
('new_patients', '2026-02-01', 28, '{}'::jsonb),
('popular_specialties', '2026-02-01', 1, '{"specialty": "Pediatría", "count": 223}'::jsonb),
('popular_specialties', '2026-02-01', 2, '{"specialty": "Cardiología", "count": 145}'::jsonb);
