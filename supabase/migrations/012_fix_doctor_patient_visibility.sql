-- ====================================================================
-- MIGRACIÓN 012: VISIBILIDAD DE PACIENTES PARA MÉDICOS Y ADMINS
-- ====================================================================

-- 1. Permitir que los MÉDICOS puedan ver a los pacientes
-- (Necesario para que aparezcan en el Dashboard y en las búsquedas)
DROP POLICY IF EXISTS "doctors_view_patients" ON public.patients;
CREATE POLICY "doctors_view_patients" ON public.patients
FOR SELECT
TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'doctor'
);

-- 2. Permitir que los ADMINS puedan ver a todos los pacientes
DROP POLICY IF EXISTS "admins_view_patients" ON public.patients;
CREATE POLICY "admins_view_patients" ON public.patients
FOR SELECT
TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- 3. Permitir que los PACIENTES vean su propio perfil
DROP POLICY IF EXISTS "patients_view_own" ON public.patients;
CREATE POLICY "patients_view_own" ON public.patients
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
);

-- ====================================================================
-- FIN DE LA MIGRACIÓN
-- ====================================================================
