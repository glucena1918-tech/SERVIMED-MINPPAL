-- ====================================================================
-- MIGRACIÓN 007: CORREGIR VULNERABILIDAD RLS EN ADMIN_METRICS
-- ====================================================================
-- Problema: La política actual usa user_metadata.role que puede ser
--           modificado por el usuario (inseguro)
-- Solución: Cambiar a app_metadata que solo el servidor puede modificar
-- ====================================================================

-- Eliminar la política insegura
DROP POLICY IF EXISTS "admin_metrics_admin_only" ON admin_metrics;

-- Crear política segura usando app_metadata
CREATE POLICY "admin_metrics_admin_only" ON admin_metrics
  FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Verificar que la política se aplicó correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'admin_metrics';
