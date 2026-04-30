-- Habilitar RLS en todas las tablas
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_metrics ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- POLÍTICAS PARA PACIENTES
-- ====================================================================

-- Pacientes pueden ver solo su propia información
CREATE POLICY "patients_select_own_data" ON patients
  FOR SELECT
  USING (auth.uid() = user_id);

-- Pacientes pueden actualizar solo su propia información
CREATE POLICY "patients_update_own_data" ON patients
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Pacientes pueden insertar su propia información una vez
CREATE POLICY "patients_insert_own_data" ON patients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- POLÍTICAS PARA MÉDICOS
-- ====================================================================

-- Médicos pueden ver su propia información
CREATE POLICY "doctors_select_own_data" ON doctors
  FOR SELECT
  USING (auth.uid() = user_id OR true); -- Todos pueden ver médicos (búsqueda pública)

-- Médicos pueden actualizar solo su propia información
CREATE POLICY "doctors_update_own_data" ON doctors
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Médicos pueden insertar su propia información una vez
CREATE POLICY "doctors_insert_own_data" ON doctors
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- POLÍTICAS PARA DISPONIBILIDAD DE MÉDICOS
-- ====================================================================

-- Todos pueden ver la disponibilidad (necesario para agendar citas)
CREATE POLICY "doctor_availability_select_all" ON doctor_availability
  FOR SELECT
  USING (true);

-- Solo el médico puede gestionar su disponibilidad
CREATE POLICY "doctor_availability_all_own" ON doctor_availability
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM doctors
      WHERE doctors.id = doctor_availability.doctor_id
      AND doctors.user_id = auth.uid()
    )
  );

-- ====================================================================
-- POLÍTICAS PARA CITAS
-- ====================================================================

-- Pacientes pueden ver sus propias citas
CREATE POLICY "appointments_select_as_patient" ON appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
      AND patients.user_id = auth.uid()
    )
  );

-- Médicos pueden ver sus propias citas
CREATE POLICY "appointments_select_as_doctor" ON appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doctors
      WHERE doctors.id = appointments.doctor_id
      AND doctors.user_id = auth.uid()
    )
  );

-- Pacientes pueden crear citas para sí mismos
CREATE POLICY "appointments_insert_as_patient" ON appointments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
      AND patients.user_id = auth.uid()
    )
  );

-- Pacientes y médicos pueden actualizar citas (para cancelar, etc.)
CREATE POLICY "appointments_update_own" ON appointments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
      AND patients.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM doctors
      WHERE doctors.id = appointments.doctor_id
      AND doctors.user_id = auth.uid()
    )
  );

-- ====================================================================
-- POLÍTICAS PARA HISTORIALES MÉDICOS
-- ====================================================================

-- Pacientes pueden ver sus propios historiales (SOLO LECTURA)
CREATE POLICY "medical_records_select_as_patient" ON medical_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = medical_records.patient_id
      AND patients.user_id = auth.uid()
    )
  );

-- Médicos pueden ver historiales de sus pacientes
CREATE POLICY "medical_records_select_as_doctor" ON medical_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      INNER JOIN doctors d ON a.doctor_id = d.id
      WHERE a.patient_id = medical_records.patient_id
      AND d.user_id = auth.uid()
    )
  );

-- Solo médicos pueden crear/actualizar historiales
CREATE POLICY "medical_records_insert_as_doctor" ON medical_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM doctors
      WHERE doctors.id = medical_records.doctor_id
      AND doctors.user_id = auth.uid()
    )
  );

CREATE POLICY "medical_records_update_as_doctor" ON medical_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM doctors
      WHERE doctors.id = medical_records.doctor_id
      AND doctors.user_id = auth.uid()
    )
  );

-- ====================================================================
-- POLÍTICAS PARA RECETAS
-- ====================================================================

-- Pacientes pueden ver sus propias recetas
CREATE POLICY "prescriptions_select_as_patient" ON prescriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = prescriptions.patient_id
      AND patients.user_id = auth.uid()
    )
  );

-- Médicos pueden ver recetas de sus pacientes
CREATE POLICY "prescriptions_select_as_doctor" ON prescriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doctors
      WHERE doctors.id = prescriptions.doctor_id
      AND doctors.user_id = auth.uid()
    )
  );

-- Solo médicos pueden crear recetas
CREATE POLICY "prescriptions_insert_as_doctor" ON prescriptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM doctors
      WHERE doctors.id = prescriptions.doctor_id
      AND doctors.user_id = auth.uid()
    )
  );

-- ====================================================================
-- POLÍTICAS PARA NOTIFICACIONES
-- ====================================================================

-- Los usuarios pueden ver solo sus propias notificaciones
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias notificaciones (marcar como leídas)
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ====================================================================
-- POLÍTICAS PARA COLA DE TRABAJOS (SOLO SISTEMA)
-- ====================================================================

-- Solo el sistema puede acceder a job_queue (no hay políticas de usuario)
CREATE POLICY "job_queue_service_role_only" ON job_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- ====================================================================
-- POLÍTICAS PARA MÉTRICAS ADMIN
-- ====================================================================

-- Solo administradores pueden ver métricas
-- (verificación de rol mediante JWT)
CREATE POLICY "admin_metrics_admin_only" ON admin_metrics
  FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
