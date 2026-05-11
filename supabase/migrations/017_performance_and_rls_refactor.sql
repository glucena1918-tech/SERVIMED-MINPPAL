-- ====================================================================
-- MIGRACIÓN 017: CONSOLIDACIÓN DE RLS Y OPTIMIZACIÓN DE RENDIMIENTO
-- ====================================================================
-- Resolve "Auth RLS Initialization Plan" (Lint 0003) and "Multiple Permissive Policies" (Lint 0006).

-- 1. LIMPIEZA DE ÍNDICES INNECESARIOS (Resuelve Lint 0005 y 0009)
DROP INDEX IF EXISTS public.idx_prescription_items_record_id;
DROP INDEX IF EXISTS public.idx_laboratory_orders_medical_record_id;
DROP INDEX IF EXISTS public.idx_laboratory_results_specialist_id;
DROP INDEX IF EXISTS public.idx_medical_records_pathology_id;

-- 2. ÍNDICES PARA FOREIGN KEYS FALTANTES (Resuelve Lint 0001)
CREATE INDEX IF NOT EXISTS idx_appointments_medical_record_id ON public.appointments(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_laboratories_user_id ON public.laboratories(user_id);
CREATE INDEX IF NOT EXISTS idx_laboratory_orders_doctor_id ON public.laboratory_orders(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_appointment_id ON public.medical_records(appointment_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id ON public.medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON public.prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_medical_record_id ON public.prescriptions(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions(patient_id);

-------------------------------------------------------------------------------
-- 3. CONSOLIDACIÓN DE POLÍTICAS RLS (Resuelve Lint 0003 y 0006)
-------------------------------------------------------------------------------

-- APPOINTMENTS
DROP POLICY IF EXISTS "appointments_unified_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_admin_final" ON public.appointments;
DROP POLICY IF EXISTS "appointments_doctor_final" ON public.appointments;
DROP POLICY IF EXISTS "appointments_patient_final" ON public.appointments;
DROP POLICY IF EXISTS "secretaries_manage_appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable insert for secretaries and admin" ON public.appointments;
DROP POLICY IF EXISTS "Enable select for secretaries and admin" ON public.appointments;
DROP POLICY IF EXISTS "Enable update for secretaries and admin" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_as_doctor" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_as_patient" ON public.appointments;
DROP POLICY IF EXISTS "appointments_read_restricted" ON public.appointments;

CREATE POLICY "appointments_unified_policy" ON public.appointments
FOR ALL TO authenticated
USING (
  ((select ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = ANY (ARRAY['admin'::text, 'secretary'::text]))
  OR (doctor_id IN (SELECT d.id FROM doctors d WHERE d.user_id = (select auth.uid())))
  OR (patient_id IN (SELECT p.id FROM patients p WHERE p.user_id = (select auth.uid())))
  OR ((select auth.email()) = 'goldengrovessoul@gmail.com')
)
WITH CHECK (
  ((select ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = ANY (ARRAY['admin'::text, 'secretary'::text]))
  OR (doctor_id IN (SELECT d.id FROM doctors d WHERE d.user_id = (select auth.uid())))
  OR (patient_id IN (SELECT p.id FROM patients p WHERE p.user_id = (select auth.uid())))
  OR ((select auth.email()) = 'goldengrovessoul@gmail.com')
);

-- PATIENTS
DROP POLICY IF EXISTS "patients_unified_policy" ON public.patients;
DROP POLICY IF EXISTS "Secretaries can insert patients" ON public.patients;
DROP POLICY IF EXISTS "patients_self_and_admin" ON public.patients;
DROP POLICY IF EXISTS "secretaries_manage_patients" ON public.patients;
DROP POLICY IF EXISTS "Secretaries can view all patients" ON public.patients;
DROP POLICY IF EXISTS "admins_view_patients" ON public.patients;
DROP POLICY IF EXISTS "admins_view_patients_final" ON public.patients;
DROP POLICY IF EXISTS "doctors_view_patients_final" ON public.patients;
DROP POLICY IF EXISTS "lab_view_patients" ON public.patients;
DROP POLICY IF EXISTS "patients_read_authorized" ON public.patients;
DROP POLICY IF EXISTS "patients_view_own" ON public.patients;
DROP POLICY IF EXISTS "Secretaries can update patients" ON public.patients;
DROP POLICY IF EXISTS "patients_update_own" ON public.patients;

CREATE POLICY "patients_unified_policy" ON public.patients
FOR ALL TO authenticated
USING (
  ((select ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = ANY (ARRAY['admin'::text, 'secretary'::text, 'laboratory'::text]))
  OR (user_id = (select auth.uid()))
  OR (EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = (select auth.uid())))
)
WITH CHECK (
  ((select ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = ANY (ARRAY['admin'::text, 'secretary'::text]))
  OR (user_id = (select auth.uid()))
);

-- MEDICAL RECORDS
DROP POLICY IF EXISTS "medical_records_unified_policy" ON public.medical_records;
DROP POLICY IF EXISTS "Admins can view all medical records" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_admin_all" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_select_as_doctor" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_select_as_patient" ON public.medical_records;
DROP POLICY IF EXISTS "policy_medical_records_admin_final" ON public.medical_records;

CREATE POLICY "medical_records_unified_policy" ON public.medical_records
FOR ALL TO authenticated
USING (
  ((select ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = 'admin'::text)
  OR ((select auth.email()) = 'goldengrovessoul@gmail.com')
  OR (doctor_id IN (SELECT d.id FROM doctors d WHERE d.user_id = (select auth.uid())))
  OR (patient_id IN (SELECT p.id FROM patients p WHERE p.user_id = (select auth.uid())))
)
WITH CHECK (
  ((select ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = 'admin'::text)
  OR (doctor_id IN (SELECT d.id FROM doctors d WHERE d.user_id = (select auth.uid())))
);

-- DOCTORS
DROP POLICY IF EXISTS "doctors_unified_select" ON public.doctors;
DROP POLICY IF EXISTS "doctors_admin_all" ON public.doctors;
DROP POLICY IF EXISTS "doctors_admin_insert" ON public.doctors;
DROP POLICY IF EXISTS "doctors_admin_update" ON public.doctors;
DROP POLICY IF EXISTS "doctors_admin_delete" ON public.doctors;

CREATE POLICY "doctors_select" ON public.doctors 
FOR SELECT TO public 
USING (is_active = true OR (user_id = (select auth.uid())) OR ((select ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = ANY (ARRAY['admin'::text, 'secretary'::text, 'laboratory'::text])));

CREATE POLICY "doctors_admin_write" ON public.doctors 
FOR INSERT, UPDATE, DELETE TO authenticated 
WITH CHECK (((select ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = 'admin'::text));

-- DOCTOR AVAILABILITY
DROP POLICY IF EXISTS "doctor_availability_select" ON public.doctor_availability;
DROP POLICY IF EXISTS "doctor_availability_unified_insert" ON public.doctor_availability;
DROP POLICY IF EXISTS "doctor_availability_unified_update" ON public.doctor_availability;
DROP POLICY IF EXISTS "doctor_availability_unified_delete" ON public.doctor_availability;

CREATE POLICY "doctor_availability_select" ON public.doctor_availability FOR SELECT TO public USING (true);
CREATE POLICY "doctor_availability_write" ON public.doctor_availability 
FOR INSERT, UPDATE, DELETE TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM doctors d WHERE d.id = doctor_id AND d.user_id = (select auth.uid())));

-- ====================================================================
-- FIN DE LA OPTIMIZACIÓN
-- ====================================================================
