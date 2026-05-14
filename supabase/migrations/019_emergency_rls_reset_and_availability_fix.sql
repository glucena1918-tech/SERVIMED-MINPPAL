
-- 1. ASEGURAR QUE RLS ESTÉ ACTIVO EN TODO
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_orders ENABLE ROW LEVEL SECURITY;

-- 2. LIMPIEZA TOTAL DE POLÍTICAS ANTERIORES PARA EVITAR CONFLICTOS
DROP POLICY IF EXISTS "patients_unified_policy" ON patients;
DROP POLICY IF EXISTS "appointments_unified_policy" ON appointments;
DROP POLICY IF EXISTS "medical_records_unified_policy" ON medical_records;
DROP POLICY IF EXISTS "doctor_availability_select" ON doctor_availability;
DROP POLICY IF EXISTS "doctors_select" ON doctors;
DROP POLICY IF EXISTS "patients_self_access" ON patients;
DROP POLICY IF EXISTS "appointments_patient_access" ON appointments;
DROP POLICY IF EXISTS "medical_records_patient_access" ON medical_records;
DROP POLICY IF EXISTS "availability_read_all" ON doctor_availability;
DROP POLICY IF EXISTS "doctors_public_read" ON doctors;

-- 3. POLÍTICAS SIMPLIFICADAS Y ROBUSTAS

-- PACIENTES: Pueden ver su propio perfil
CREATE POLICY "patients_self_access" ON patients
FOR ALL USING (auth.uid() = user_id);

-- DOCTORES: Todos pueden ver doctores activos (para agendar)
CREATE POLICY "doctors_public_read" ON doctors
FOR SELECT USING (is_active = true OR auth.uid() = user_id);

-- DISPONIBILIDAD: Permitir lectura pública para que el calendario funcione
CREATE POLICY "availability_read_all" ON doctor_availability
FOR SELECT USING (true);

-- CITAS: El paciente ve sus propias citas
CREATE POLICY "appointments_patient_access" ON appointments
FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
);

-- EXPEDIENTE: El paciente ve su propio historial
CREATE POLICY "medical_records_patient_access" ON medical_records
FOR SELECT USING (
  patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
);

-- 4. FIX DE DATOS: Asegurar que el Dr. Pérez sea visible y tenga horarios correctos
UPDATE doctors SET is_active = true WHERE full_name ILIKE '%Pedro Pérez%';
UPDATE doctor_availability SET is_active = true WHERE doctor_id IN (SELECT id FROM doctors WHERE full_name ILIKE '%Pedro Pérez%');
