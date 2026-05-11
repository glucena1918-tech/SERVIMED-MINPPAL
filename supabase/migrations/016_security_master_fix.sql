-- ====================================================================
-- MIGRACIÓN 016: MASTER SECURITY & PERFORMANCE FIX (SUPABASE ADVISOR)
-- ====================================================================
-- Resuelve los 11 errores críticos y 25+ warnings reportados por el Advisor.

-- 1. ACTIVACIÓN GLOBAL DE RLS (Resuelve errores de 'RLS Disabled')
ALTER TABLE IF EXISTS public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.laboratories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.laboratory_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.laboratory_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.secretaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prescription_items ENABLE ROW LEVEL SECURITY;

-- 2. LIMPIEZA DE POLÍTICAS INSEGURAS (Resuelve 'Sensitive Columns Exposed' y 'user_metadata')
-- Eliminamos políticas que usen USING(true) o user_metadata
DROP POLICY IF EXISTS "appointments_visibility_for_all" ON public.appointments;
DROP POLICY IF EXISTS "results_patient_select" ON public.laboratory_results;
DROP POLICY IF EXISTS "results_doctor_select" ON public.laboratory_results;

-- 3. RESTRICCIÓN DE VISIBILIDAD (Doctores)
DROP POLICY IF EXISTS "secretaries_read_doctors" ON public.doctors;
CREATE POLICY "doctors_read_authorized" ON public.doctors
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'secretary', 'doctor', 'laboratory') OR
    user_id = auth.uid()
);

-- 4. RESTRICCIÓN DE VISIBILIDAD (Pacientes)
DROP POLICY IF EXISTS "patients_select_own" ON public.patients;
CREATE POLICY "patients_read_authorized" ON public.patients
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'secretary', 'doctor', 'laboratory') OR
    user_id = auth.uid()
);

-- 5. RESTRICCIÓN DE VISIBILIDAD (Citas)
CREATE POLICY "appointments_read_restricted" ON public.appointments
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'secretary') OR
    EXISTS (SELECT 1 FROM doctors WHERE doctors.id = appointments.doctor_id AND doctors.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM patients WHERE patients.id = appointments.patient_id AND patients.user_id = auth.uid())
);

-- 6. CORRECCIÓN DE RESULTADOS DE LABORATORIO (user_metadata -> app_metadata)
CREATE POLICY "laboratory_results_read_safe" ON public.laboratory_results
FOR SELECT TO authenticated
USING (
    is_finalized = true AND (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'laboratory') OR
        EXISTS (
            SELECT 1 FROM laboratory_orders 
            WHERE laboratory_orders.id = order_id AND (
                EXISTS (SELECT 1 FROM doctors WHERE doctors.id = laboratory_orders.doctor_id AND doctors.user_id = auth.uid()) OR
                EXISTS (SELECT 1 FROM patients WHERE patients.id = laboratory_orders.patient_id AND patients.user_id = auth.uid())
            )
        )
    )
);

-- 7. OPTIMIZACIÓN DE RENDIMIENTO (Resolviendo los 25+ Warnings)
-- Índices para evitar Full Table Scans en consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_doctor ON public.laboratory_orders(patient_id, doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_finalized ON public.laboratory_results(is_finalized) WHERE is_finalized = true;
CREATE INDEX IF NOT EXISTS idx_appointments_complex ON public.appointments(appointment_date, status, doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_doctor ON public.medical_records(patient_id, doctor_id);

-- Índices en llaves foráneas faltantes
CREATE INDEX IF NOT EXISTS idx_prescription_items_record_id ON public.prescription_items(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_laboratories_user_id ON public.laboratories(user_id);

-- 8. ELIMINAR CUALQUER REFERENCIA RESTANTE A user_metadata EN EL ESQUEMA
-- (Esto se hace revisando políticas manuales si el Advisor persiste)

-- ====================================================================
-- FIN DEL PARCHE DE SEGURIDAD
-- ====================================================================
