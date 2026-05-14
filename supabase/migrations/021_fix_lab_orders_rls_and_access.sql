
-- 1. LABORATORY ORDERS: Asegurar acceso robusto para Bioanalistas, Médicos y Administradores
DROP POLICY IF EXISTS "laboratory_orders_access_policy" ON public.laboratory_orders;
DROP POLICY IF EXISTS "orders_admin_all" ON public.laboratory_orders;
DROP POLICY IF EXISTS "orders_doctor_manage" ON public.laboratory_orders;
DROP POLICY IF EXISTS "orders_lab_manage" ON public.laboratory_orders;
DROP POLICY IF EXISTS "orders_patient_select" ON public.laboratory_orders;

CREATE POLICY "laboratory_orders_specialist_access" ON public.laboratory_orders
FOR ALL TO authenticated
USING (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'laboratory')
  OR ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  OR (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()))
  OR (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
)
WITH CHECK (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'laboratory')
  OR ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  OR (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()))
);

-- Asegurar que el Bioanalista pueda ver a los pacientes y doctores para cargar los resultados
DROP POLICY IF EXISTS "lab_view_patients" ON public.patients;
CREATE POLICY "lab_view_patients" ON public.patients
FOR SELECT TO authenticated
USING (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'laboratory')
  OR ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  OR (user_id = auth.uid())
);

DROP POLICY IF EXISTS "lab_view_doctors" ON public.doctors;
CREATE POLICY "lab_view_doctors" ON public.doctors
FOR SELECT TO authenticated
USING (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'laboratory')
  OR ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  OR (user_id = auth.uid())
  OR (is_active = true)
);
