-- Migración para asegurar que el Administrador pueda ver todas las métricas de salud
-- Incluye diagnósticos y medicamentos individuales

-- 1. Permisos en la tabla de items de prescripción
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

-- Médicos pueden ver sus propias recetas
CREATE POLICY "prescription_items_doctor_access" ON public.prescription_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      INNER JOIN doctors d ON mr.doctor_id = d.id
      WHERE mr.id = prescription_items.medical_record_id
      AND d.user_id = auth.uid()
    )
  );

-- Pacientes pueden ver sus propias recetas
CREATE POLICY "prescription_items_patient_access" ON public.prescription_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      INNER JOIN patients p ON mr.patient_id = p.id
      WHERE mr.id = prescription_items.medical_record_id
      AND p.user_id = auth.uid()
    )
  );

-- ADMINISTRADOR puede ver TODO para las métricas
CREATE POLICY "prescription_items_admin_all" ON public.prescription_items
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- 2. Asegurar que el Admin pueda ver medical_records globales (actualmente limitada por RLS)
-- Añadimos una política específica para el rol admin en medical_records
CREATE POLICY "medical_records_admin_all" ON public.medical_records
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
