-- ====================================================================
-- MIGRACIÓN 018: FIX CRÍTICO - RLS Role Fallback + Cleanup Duplicados
-- ====================================================================
-- PROBLEMA: Las RLS dependen de app_metadata.role, pero el registro
-- solo escribe user_metadata.role. Nuevos usuarios quedan bloqueados.
-- SOLUCIÓN: (1) Trigger para sincronizar rol en app_metadata al registrar
--           (2) Limpiar políticas duplicadas en doctor_availability y doctors
-- ====================================================================

-- 1. FUNCIÓN: Sincronizar rol al crear usuario
CREATE OR REPLACE FUNCTION public.sync_role_to_app_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (NEW.raw_user_meta_data->>'role') IS NOT NULL 
     AND (NEW.raw_app_meta_data->>'role') IS NULL THEN
    NEW.raw_app_meta_data := 
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', NEW.raw_user_meta_data->>'role');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_role_on_user_create ON auth.users;
CREATE TRIGGER sync_role_on_user_create
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_to_app_metadata();

-- 2. LIMPIAR POLÍTICAS DUPLICADAS en doctor_availability
DROP POLICY IF EXISTS "doctor_availability_unified_select" ON public.doctor_availability;
DROP POLICY IF EXISTS "doctor_availability_unified_insert" ON public.doctor_availability;
DROP POLICY IF EXISTS "doctor_availability_unified_update" ON public.doctor_availability;
DROP POLICY IF EXISTS "doctor_availability_unified_delete" ON public.doctor_availability;
DROP POLICY IF EXISTS "doctor_availability_delete" ON public.doctor_availability;
DROP POLICY IF EXISTS "doctor_availability_insert" ON public.doctor_availability;
DROP POLICY IF EXISTS "doctor_availability_update" ON public.doctor_availability;
DROP POLICY IF EXISTS "doctor_availability_write" ON public.doctor_availability;
DROP POLICY IF EXISTS "doctor_availability_select" ON public.doctor_availability;

CREATE POLICY "doctor_availability_select" ON public.doctor_availability 
  FOR SELECT TO public USING (true);

CREATE POLICY "doctor_availability_insert" ON public.doctor_availability 
  FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (
    SELECT 1 FROM doctors d 
    WHERE d.id = doctor_id AND d.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "doctor_availability_update" ON public.doctor_availability 
  FOR UPDATE TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM doctors d 
    WHERE d.id = doctor_id AND d.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM doctors d 
    WHERE d.id = doctor_id AND d.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "doctor_availability_delete" ON public.doctor_availability 
  FOR DELETE TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM doctors d 
    WHERE d.id = doctor_id AND d.user_id = (SELECT auth.uid())
  ));

-- 3. LIMPIAR POLÍTICAS DUPLICADAS en doctors
DROP POLICY IF EXISTS "doctors_unified_select" ON public.doctors;
DROP POLICY IF EXISTS "doctors_admin_all" ON public.doctors;
DROP POLICY IF EXISTS "doctors_admin_insert" ON public.doctors;
DROP POLICY IF EXISTS "doctors_admin_update" ON public.doctors;
DROP POLICY IF EXISTS "doctors_admin_delete" ON public.doctors;
DROP POLICY IF EXISTS "doctors_read_authorized" ON public.doctors;
DROP POLICY IF EXISTS "doctors_admin_write" ON public.doctors;
DROP POLICY IF EXISTS "doctors_write" ON public.doctors;
DROP POLICY IF EXISTS "doctors_select" ON public.doctors;

CREATE POLICY "doctors_select" ON public.doctors 
  FOR SELECT TO public 
  USING (
    is_active = true 
    OR (user_id = (SELECT auth.uid())) 
    OR ((SELECT ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = ANY (ARRAY['admin'::text, 'secretary'::text, 'laboratory'::text]))
  );

CREATE POLICY "doctors_admin_all" ON public.doctors 
  FOR ALL TO authenticated 
  USING (
    ((SELECT ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = 'admin'::text)
  )
  WITH CHECK (
    ((SELECT ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = 'admin'::text)
  );

-- ====================================================================
-- FIN DE LA CORRECCIÓN
-- ====================================================================
