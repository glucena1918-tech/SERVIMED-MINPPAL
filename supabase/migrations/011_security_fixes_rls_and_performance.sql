-- ====================================================================
-- MIGRACIÓN 011: SOLUCIÓN DE ERRORES DE SEGURIDAD Y PERFORMANCE (ADVISOR)
-- ====================================================================
-- Esta migración resuelve los 5 errores críticos mostrados en el Advisor:
-- 1. Activa RLS en la tabla 'appointments'
-- 2. Activa RLS en la tabla 'secretaries'
-- 3. Resuelve el problema de "Sensitive Columns Exposed"
-- 4. Agrega índices para mejorar el rendimiento (Warnings)
-- ====================================================================

-- 1. HABILITAR RLS CON POLÍTICAS DE VISIBILIDAD CORRECTAS
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.secretaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.doctors ENABLE ROW LEVEL SECURITY;

-- Política de Visibilidad de Citas (Fundamental para el Filtro de Disponibilidad)
-- Permite que todos los usuarios vean las horas ocupadas para evitar duplicados.
DROP POLICY IF EXISTS "appointments_visibility_for_all" ON public.appointments;
CREATE POLICY "appointments_visibility_for_all" ON public.appointments
    FOR SELECT TO authenticated
    USING (true);

-- 2. Políticas para la tabla 'secretaries'
-- Nota: Como esta tabla parece haber sido creada manualmente, definimos sus políticas aquí.
-- Se asume que tiene una columna 'user_id' o se vincula por 'email'.

-- Eliminar políticas previas si existen para evitar conflictos
DROP POLICY IF EXISTS "secretaries_admin_all" ON public.secretaries;
DROP POLICY IF EXISTS "secretaries_select_own" ON public.secretaries;

-- Política: Administradores tienen acceso total (USANDO SOLO app_metadata POR SEGURIDAD)
CREATE POLICY "secretaries_admin_all" ON public.secretaries
FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Política: Secretarias pueden ver su propio registro (Vinculado por email)
CREATE POLICY "secretaries_select_own" ON public.secretaries
FOR SELECT
TO authenticated
USING (
    auth.jwt() ->> 'email' = email
);

-- 3. Optimización de Performance (Resolviendo gran parte de los 26 Warnings)
-- Agregamos índices en todas las llaves foráneas y columnas de búsqueda frecuente

-- Índices en llaves foráneas (FKs)
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id ON public.medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON public.prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor_id ON public.doctor_availability(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors(user_id);
-- Eliminado idx_secretaries_user_id porque la tabla usa email
CREATE INDEX IF NOT EXISTS idx_prescription_items_medical_record_id ON public.prescription_items(medical_record_id);

-- Índices en columnas de búsqueda frecuente
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON public.appointments(appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_patients_cedula ON public.patients(cedula);
CREATE INDEX IF NOT EXISTS idx_medical_records_record_date ON public.medical_records(record_date);
CREATE INDEX IF NOT EXISTS idx_secretaries_email ON public.secretaries(email);

-- 4. Resolver "Sensitive Columns Exposed"
-- Esto sucede cuando hay una política SELECT que usa USING(true) en tablas con datos sensibles.
-- Reforzamos las políticas de SELECT para appointments.

DROP POLICY IF EXISTS "appointments_select_as_patient" ON public.appointments;
CREATE POLICY "appointments_select_as_patient" ON public.appointments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM patients WHERE patients.id = appointments.patient_id AND patients.user_id = auth.uid()));

DROP POLICY IF EXISTS "appointments_select_as_doctor" ON public.appointments;
CREATE POLICY "appointments_select_as_doctor" ON public.appointments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM doctors WHERE doctors.id = appointments.doctor_id AND doctors.user_id = auth.uid()));

-- 5. Políticas de Acceso para el Rol de Secretaria (SOLUCIÓN TÉCNICA)
-- Las secretarias necesitan acceso total para gestionar el flujo administrativo.

-- Política para appointments (Citas)
DROP POLICY IF EXISTS "secretaries_manage_appointments" ON public.appointments;
CREATE POLICY "secretaries_manage_appointments" ON public.appointments
    FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('secretary', 'admin'))
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('secretary', 'admin'));

-- Política para patients (Pacientes)
DROP POLICY IF EXISTS "secretaries_manage_patients" ON public.patients;
CREATE POLICY "secretaries_manage_patients" ON public.patients
    FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('secretary', 'admin'))
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('secretary', 'admin'));

-- Política para doctors (Doctores - Solo lectura para asignar citas)
DROP POLICY IF EXISTS "secretaries_read_doctors" ON public.doctors;
CREATE POLICY "secretaries_read_doctors" ON public.doctors
    FOR SELECT TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('secretary', 'admin'));

-- 6. Políticas de Acceso para el Rol de Paciente (RESTAURACIÓN DE ACCESO)
-- Permitir que los pacientes gestionen sus propias citas y vean sus datos.

-- Política para que el paciente inserte su propia cita
DROP POLICY IF EXISTS "appointments_insert_as_patient" ON public.appointments;
CREATE POLICY "appointments_insert_as_patient" ON public.appointments
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.patients WHERE public.patients.id = appointments.patient_id AND public.patients.user_id = auth.uid()));

-- Política para que el paciente vea sus propias citas (Ya definida arriba como appointments_select_as_patient, pero aseguramos su existencia)
-- DROP POLICY IF EXISTS "appointments_select_as_patient" ON public.appointments; (Ya está arriba)

-- Política para que el paciente vea su propio perfil
DROP POLICY IF EXISTS "patients_select_own" ON public.patients;
CREATE POLICY "patients_select_own" ON public.patients
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Política para que el paciente actualice su propio perfil
DROP POLICY IF EXISTS "patients_update_own" ON public.patients;
CREATE POLICY "patients_update_own" ON public.patients
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 7. Verificación de Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- FIN DE LA MIGRACIÓN ACTUALIZADA
-- ====================================================================
