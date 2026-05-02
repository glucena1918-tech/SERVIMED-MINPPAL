-- Migración para restaurar la visibilidad pública de los médicos en la página de especialidades
-- Ejecutada manualmente por el usuario y documentada aquí.

-- 1. Devolver permisos básicos de lectura al rol público (anon) para las tablas necesarias
GRANT SELECT ON public.doctors TO anon;
GRANT SELECT ON public.doctor_availability TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- 2. Crear política para que usuarios no autenticados puedan ver médicos activos
-- (Nota: Esto permite que la página de Especialidades funcione sin login)
CREATE POLICY "doctors_select_public" ON public.doctors
  FOR SELECT
  TO anon
  USING (is_active = true);

-- 3. Crear política para que usuarios no autenticados puedan ver la disponibilidad
CREATE POLICY "doctor_availability_select_public" ON public.doctor_availability
  FOR SELECT
  TO anon
  USING (true);
