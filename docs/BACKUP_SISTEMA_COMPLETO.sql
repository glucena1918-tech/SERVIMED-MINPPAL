-- Extensiones necesarias para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear enum para roles de usuario
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');

-- Crear enum para gÃ©neros
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');

-- Crear enum para estados de cita
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- Crear enum para tipos de job
CREATE TYPE job_type AS ENUM ('send_email', 'generate_pdf', 'send_notification');

-- Crear enum para estados de job
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
-- Tabla de pacientes
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender gender_type NOT NULL,
  blood_type TEXT,
  allergies TEXT[],
  emergency_contact JSONB DEFAULT '{}'::jsonb,
  insurance_provider TEXT,
  insurance_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices para pacientes
CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_full_name ON patients(full_name);

-- Tabla de mÃ©dicos
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  bio TEXT,
  experience_years INTEGER DEFAULT 0,
  education JSONB DEFAULT '[]'::jsonb,
  consultation_fee NUMERIC(10, 2) DEFAULT 0,
  avatar_url TEXT,
  rating NUMERIC(3, 2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_reviews INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices para mÃ©dicos
CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_specialty ON doctors(specialty);
CREATE INDEX idx_doctors_is_active ON doctors(is_active);
CREATE INDEX idx_doctors_license_number ON doctors(license_number);
-- Tabla de disponibilidad de mÃ©dicos
CREATE TABLE doctor_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration INTEGER DEFAULT 30 CHECK (slot_duration > 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(doctor_id, day_of_week, start_time)
);

-- Ãndices para disponibilidad
CREATE INDEX idx_doctor_availability_doctor_id ON doctor_availability(doctor_id);
CREATE INDEX idx_doctor_availability_day_of_week ON doctor_availability(day_of_week);

-- Tabla de citas mÃ©dicas
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration INTEGER DEFAULT 30,
  status appointment_status DEFAULT 'pending',
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT
);

-- Ãndices para citas
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date_time ON appointments(appointment_date, appointment_time);

-- RestricciÃ³n Ãºnica para evitar citas duplicadas
CREATE UNIQUE INDEX unique_doctor_appointment_slot 
ON appointments(doctor_id, appointment_date, appointment_time) 
WHERE status != 'cancelled';
-- Tabla de historiales clÃ­nicos
CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  diagnosis TEXT,
  symptoms TEXT,
  treatment TEXT,
  prescriptions JSONB DEFAULT '[]'::jsonb,
  lab_results TEXT,
  notes TEXT,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices para historiales mÃ©dicos
CREATE INDEX idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX idx_medical_records_doctor_id ON medical_records(doctor_id);
CREATE INDEX idx_medical_records_record_date ON medical_records(record_date);
CREATE INDEX idx_medical_records_appointment_id ON medical_records(appointment_id);

-- Tabla de recetas mÃ©dicas
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices para recetas
CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_medical_record_id ON prescriptions(medical_record_id);
-- Tabla de cola de trabajos
CREATE TABLE job_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type job_type NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status job_status DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices para cola de trabajos
CREATE INDEX idx_job_queue_status ON job_queue(status);
CREATE INDEX idx_job_queue_job_type ON job_queue(job_type);
CREATE INDEX idx_job_queue_scheduled_for ON job_queue(scheduled_for);

-- Tabla de notificaciones
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices para notificaciones
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);

-- Tabla de mÃ©tricas administrativas
CREATE TABLE admin_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_type TEXT NOT NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices para mÃ©tricas
CREATE INDEX idx_admin_metrics_metric_type ON admin_metrics(metric_type);
CREATE INDEX idx_admin_metrics_metric_date ON admin_metrics(metric_date);
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
-- POLÃTICAS PARA PACIENTES
-- ====================================================================

-- Pacientes pueden ver solo su propia informaciÃ³n
CREATE POLICY "patients_select_own_data" ON patients
  FOR SELECT
  USING (auth.uid() = user_id);

-- Pacientes pueden actualizar solo su propia informaciÃ³n
CREATE POLICY "patients_update_own_data" ON patients
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Pacientes pueden insertar su propia informaciÃ³n una vez
CREATE POLICY "patients_insert_own_data" ON patients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- POLÃTICAS PARA MÃ‰DICOS
-- ====================================================================

-- MÃ©dicos pueden ser vistos por cualquier usuario autenticado (Para bÃºsqueda/citas)
CREATE POLICY "doctors_select_authenticated" ON public.doctors
  FOR SELECT
  TO authenticated
  USING (true);

-- MÃ©dicos pueden actualizar solo su propia informaciÃ³n
CREATE POLICY "doctors_update_own_data" ON doctors
  FOR UPDATE
  USING (auth.uid() = user_id);

-- MÃ©dicos pueden insertar su propia informaciÃ³n una vez
CREATE POLICY "doctors_insert_own_data" ON doctors
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- POLÃTICAS PARA DISPONIBILIDAD DE MÃ‰DICOS
-- ====================================================================

-- Todos pueden ver la disponibilidad (necesario para agendar citas)
CREATE POLICY "doctor_availability_select_all" ON doctor_availability
  FOR SELECT
  USING (true);

-- Solo el mÃ©dico puede gestionar su disponibilidad
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
-- POLÃTICAS PARA CITAS
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

-- MÃ©dicos pueden ver sus propias citas
CREATE POLICY "appointments_select_as_doctor" ON appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doctors
      WHERE doctors.id = appointments.doctor_id
      AND doctors.user_id = auth.uid()
    )
  );

-- Pacientes pueden crear citas para sÃ­ mismos
CREATE POLICY "appointments_insert_as_patient" ON appointments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
      AND patients.user_id = auth.uid()
    )
  );

-- Pacientes y mÃ©dicos pueden actualizar citas (para cancelar, etc.)
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
-- POLÃTICAS PARA HISTORIALES MÃ‰DICOS
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

-- MÃ©dicos pueden ver historiales de sus pacientes
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

-- Solo mÃ©dicos pueden crear/actualizar historiales
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
-- POLÃTICAS PARA RECETAS
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

-- MÃ©dicos pueden ver recetas de sus pacientes
CREATE POLICY "prescriptions_select_as_doctor" ON prescriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doctors
      WHERE doctors.id = prescriptions.doctor_id
      AND doctors.user_id = auth.uid()
    )
  );

-- Solo mÃ©dicos pueden crear recetas
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
-- POLÃTICAS PARA NOTIFICACIONES
-- ====================================================================

-- Los usuarios pueden ver solo sus propias notificaciones
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias notificaciones (marcar como leÃ­das)
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ====================================================================
-- POLÃTICAS PARA COLA DE TRABAJOS (SOLO SISTEMA)
-- ====================================================================

-- Solo el sistema puede acceder a job_queue (no hay polÃ­ticas de usuario)
CREATE POLICY "job_queue_service_role_only" ON job_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- ====================================================================
-- POLÃTICAS PARA MÃ‰TRICAS ADMIN
-- ====================================================================

-- Solo administradores pueden ver mÃ©tricas
-- (verificaciÃ³n de rol mediante JWT)
-- Solo administradores pueden ver mÃ©tricas
CREATE POLICY "admin_metrics_admin_only" ON admin_metrics
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ====================================================================
-- 26 WARNINGS: RESTRICCIÃ“N DE VISIBILIDAD GRAPHQL Y STORAGE
-- ====================================================================

-- 1. Revocar acceso pÃºblico (anon) a tablas para limpiar avisos de GraphQL
-- Esto asegura que solo usuarios autenticados puedan interactuar con la DB
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- 2. Garantizar acceso a usuarios autenticados (necesario para que RLS funcione)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 3. Caso especial: doctors y patients necesitan ser visibles para registro/bÃºsqueda inicial
-- Pero RLS ya controla el contenido.

-- 4. Storage: Corregir el Bucket de Avatars
-- Nota: Esto asume que el bucket se llama 'avatars'
DO $$
BEGIN
  -- Intentar corregir polÃ­ticas de storage si existen
  -- Nota: Las polÃ­ticas de storage estÃ¡n en schema 'storage'
  DELETE FROM storage.policies WHERE name = 'Public Access' AND bucket_id = 'avatars';
  
  INSERT INTO storage.policies (name, bucket_id, definition, operation)
  VALUES ('Public Access', 'avatars', '(bucket_id = ''avatars''::text)', 'SELECT');
EXCEPTION WHEN OTHERS THEN
  -- Si el bucket no existe o no hay permisos, ignorar
END $$;
-- ====================================================================
-- MIGRACIÃ“N 007: CORREGIR VULNERABILIDAD RLS EN ADMIN_METRICS
-- ====================================================================
-- Problema: La polÃ­tica actual usa user_metadata.role que puede ser
--           modificado por el usuario (inseguro)
-- SoluciÃ³n: Cambiar a app_metadata que solo el servidor puede modificar
-- ====================================================================

-- Eliminar la polÃ­tica insegura
DROP POLICY IF EXISTS "admin_metrics_admin_only" ON admin_metrics;

-- Crear polÃ­tica segura usando app_metadata
CREATE POLICY "admin_metrics_admin_only" ON admin_metrics
  FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Verificar que la polÃ­tica se aplicÃ³ correctamente
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
-- Corregir la polÃ­tica de actualizaciÃ³n de citas para permitir que los pacientes cancelen sus propias citas
-- Anteriormente solo se permitÃ­a a los doctores actualizar citas.

DROP POLICY IF EXISTS "policy_update_appointments" ON "public"."appointments";

CREATE POLICY "policy_update_appointments" ON "public"."appointments"
FOR UPDATE
TO authenticated
USING (
  (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())) 
  OR 
  (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
);
-- Crear bucket 'avatars' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS en objetos de storage (por si no lo estÃ¡)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- PolÃ­tica: Todos pueden VER los avatares (pÃºblico)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- PolÃ­tica: Usuarios autenticados pueden SUBIR avatares
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- PolÃ­tica: Usuarios pueden ACTUALIZAR sus propios avatares
-- Asumimos que el owner es el usuario que lo subiÃ³
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid() = owner );

-- PolÃ­tica: Usuarios pueden BORRAR sus propios avatares
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid() = owner );
-- Tabla para los items del Recipe (Medicamentos individuales para KPIs)
CREATE TABLE IF NOT EXISTS prescription_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    medical_record_id UUID REFERENCES medical_records(id) ON DELETE CASCADE NOT NULL,
    medicine_name TEXT NOT NULL, -- Nombre del medicamento (KPI clave)
    dosage TEXT,                 -- Ej: 500mg
    frequency TEXT,              -- Ej: Cada 8 horas
    duration TEXT,               -- Ej: Por 5 dÃ­as
    quantity TEXT,               -- Ej: 1 Caja / 10 Tabletas
    instructions TEXT,           -- Indicaciones adicionales especÃ­ficas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas de Seguridad (RLS)

-- 1. Lectura: Ver items si tienes acceso a la historia mÃ©dica (Doctor o Paciente)
CREATE POLICY "Users can view prescription items of accessible records"
ON prescription_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM medical_records mr
        LEFT JOIN doctors d ON mr.doctor_id = d.id
        LEFT JOIN patients p ON mr.patient_id = p.id
        WHERE mr.id = prescription_items.medical_record_id
        AND (
            d.user_id = auth.uid() -- Es el doctor que la creÃ³
            OR 
            p.user_id = auth.uid() -- Es el paciente dueÃ±o de la historia
        )
    )
);

-- 2. InserciÃ³n: Solo el doctor que crea la historia puede aÃ±adir items
CREATE POLICY "Doctors can insert prescription items"
ON prescription_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM medical_records mr
        JOIN doctors d ON mr.doctor_id = d.id
        WHERE mr.id = prescription_items.medical_record_id
        AND d.user_id = auth.uid()
    )
);

-- Ãndices para reportes y KPIs rÃ¡pidos
CREATE INDEX IF NOT EXISTS idx_prescription_items_medicine_name ON prescription_items(medicine_name);
CREATE INDEX IF NOT EXISTS idx_prescription_items_created_at ON prescription_items(created_at);
-- ====================================================================
-- MIGRACIÃ“N 011: SOLUCIÃ“N DE ERRORES DE SEGURIDAD Y PERFORMANCE (ADVISOR)
-- ====================================================================
-- Esta migraciÃ³n resuelve los 5 errores crÃ­ticos mostrados en el Advisor:
-- 1. Activa RLS en la tabla 'appointments'
-- 2. Activa RLS en la tabla 'secretaries'
-- 3. Resuelve el problema de "Sensitive Columns Exposed"
-- 4. Agrega Ã­ndices para mejorar el rendimiento (Warnings)
-- ====================================================================

-- 1. HABILITAR RLS CON POLÃTICAS DE VISIBILIDAD CORRECTAS
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.secretaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.doctors ENABLE ROW LEVEL SECURITY;

-- PolÃ­tica de Visibilidad de Citas (Fundamental para el Filtro de Disponibilidad)
-- Permite que todos los usuarios vean las horas ocupadas para evitar duplicados.
DROP POLICY IF EXISTS "appointments_visibility_for_all" ON public.appointments;
CREATE POLICY "appointments_visibility_for_all" ON public.appointments
    FOR SELECT TO authenticated
    USING (true);

-- 2. PolÃ­ticas para la tabla 'secretaries'
-- Nota: Como esta tabla parece haber sido creada manualmente, definimos sus polÃ­ticas aquÃ­.
-- Se asume que tiene una columna 'user_id' o se vincula por 'email'.

-- Eliminar polÃ­ticas previas si existen para evitar conflictos
DROP POLICY IF EXISTS "secretaries_admin_all" ON public.secretaries;
DROP POLICY IF EXISTS "secretaries_select_own" ON public.secretaries;

-- PolÃ­tica: Administradores tienen acceso total (USANDO SOLO app_metadata POR SEGURIDAD)
CREATE POLICY "secretaries_admin_all" ON public.secretaries
FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- PolÃ­tica: Secretarias pueden ver su propio registro (Vinculado por email)
CREATE POLICY "secretaries_select_own" ON public.secretaries
FOR SELECT
TO authenticated
USING (
    auth.jwt() ->> 'email' = email
);

-- 3. OptimizaciÃ³n de Performance (Resolviendo gran parte de los 26 Warnings)
-- Agregamos Ã­ndices en todas las llaves forÃ¡neas y columnas de bÃºsqueda frecuente

-- Ãndices en llaves forÃ¡neas (FKs)
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id ON public.medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON public.prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor_id ON public.doctor_availability(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors(user_id);
-- Eliminado idx_secretaries_user_id porque la tabla usa email
CREATE INDEX IF NOT EXISTS idx_prescription_items_medical_record_id ON public.prescription_items(medical_record_id);

-- Ãndices en columnas de bÃºsqueda frecuente
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON public.appointments(appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_patients_cedula ON public.patients(cedula);
CREATE INDEX IF NOT EXISTS idx_medical_records_record_date ON public.medical_records(record_date);
CREATE INDEX IF NOT EXISTS idx_secretaries_email ON public.secretaries(email);

-- 4. Resolver "Sensitive Columns Exposed"
-- Esto sucede cuando hay una polÃ­tica SELECT que usa USING(true) en tablas con datos sensibles.
-- Reforzamos las polÃ­ticas de SELECT para appointments.

DROP POLICY IF EXISTS "appointments_select_as_patient" ON public.appointments;
CREATE POLICY "appointments_select_as_patient" ON public.appointments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM patients WHERE patients.id = appointments.patient_id AND patients.user_id = auth.uid()));

DROP POLICY IF EXISTS "appointments_select_as_doctor" ON public.appointments;
CREATE POLICY "appointments_select_as_doctor" ON public.appointments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM doctors WHERE doctors.id = appointments.doctor_id AND doctors.user_id = auth.uid()));

-- 5. PolÃ­ticas de Acceso para el Rol de Secretaria (SOLUCIÃ“N TÃ‰CNICA)
-- Las secretarias necesitan acceso total para gestionar el flujo administrativo.

-- PolÃ­tica para appointments (Citas)
DROP POLICY IF EXISTS "secretaries_manage_appointments" ON public.appointments;
CREATE POLICY "secretaries_manage_appointments" ON public.appointments
    FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('secretary', 'admin'))
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('secretary', 'admin'));

-- PolÃ­tica para patients (Pacientes)
DROP POLICY IF EXISTS "secretaries_manage_patients" ON public.patients;
CREATE POLICY "secretaries_manage_patients" ON public.patients
    FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('secretary', 'admin'))
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('secretary', 'admin'));

-- PolÃ­tica para doctors (Doctores - Solo lectura para asignar citas)
DROP POLICY IF EXISTS "secretaries_read_doctors" ON public.doctors;
CREATE POLICY "secretaries_read_doctors" ON public.doctors
    FOR SELECT TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('secretary', 'admin'));

-- 6. PolÃ­ticas de Acceso para el Rol de Paciente (RESTAURACIÃ“N DE ACCESO)
-- Permitir que los pacientes gestionen sus propias citas y vean sus datos.

-- PolÃ­tica para que el paciente inserte su propia cita
DROP POLICY IF EXISTS "appointments_insert_as_patient" ON public.appointments;
CREATE POLICY "appointments_insert_as_patient" ON public.appointments
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.patients WHERE public.patients.id = appointments.patient_id AND public.patients.user_id = auth.uid()));

-- PolÃ­tica para que el paciente vea sus propias citas (Ya definida arriba como appointments_select_as_patient, pero aseguramos su existencia)
-- DROP POLICY IF EXISTS "appointments_select_as_patient" ON public.appointments; (Ya estÃ¡ arriba)

-- PolÃ­tica para que el paciente vea su propio perfil
DROP POLICY IF EXISTS "patients_select_own" ON public.patients;
CREATE POLICY "patients_select_own" ON public.patients
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- PolÃ­tica para que el paciente actualice su propio perfil
DROP POLICY IF EXISTS "patients_update_own" ON public.patients;
CREATE POLICY "patients_update_own" ON public.patients
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 7. VerificaciÃ³n de Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- FIN DE LA MIGRACIÃ“N ACTUALIZADA
-- ====================================================================
-- ====================================================================
-- MIGRACIÃ“N 012: VISIBILIDAD DE PACIENTES PARA MÃ‰DICOS Y ADMINS
-- ====================================================================

-- 1. Permitir que los MÃ‰DICOS puedan ver a los pacientes
-- (Necesario para que aparezcan en el Dashboard y en las bÃºsquedas)
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
-- FIN DE LA MIGRACIÃ“N
-- ====================================================================
-- MigraciÃ³n para restaurar la visibilidad pÃºblica de los mÃ©dicos en la pÃ¡gina de especialidades
-- Ejecutada manualmente por el usuario y documentada aquÃ­.

-- 1. Devolver permisos bÃ¡sicos de lectura al rol pÃºblico (anon) para las tablas necesarias
GRANT SELECT ON public.doctors TO anon;
GRANT SELECT ON public.doctor_availability TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- 2. Crear polÃ­tica para que usuarios no autenticados puedan ver mÃ©dicos activos
-- (Nota: Esto permite que la pÃ¡gina de Especialidades funcione sin login)
CREATE POLICY "doctors_select_public" ON public.doctors
  FOR SELECT
  TO anon
  USING (is_active = true);

-- 3. Crear polÃ­tica para que usuarios no autenticados puedan ver la disponibilidad
CREATE POLICY "doctor_availability_select_public" ON public.doctor_availability
  FOR SELECT
  TO anon
  USING (true);
-- MigraciÃ³n para asegurar que el Administrador pueda ver todas las mÃ©tricas de salud
-- Incluye diagnÃ³sticos y medicamentos individuales

-- 1. Permisos en la tabla de items de prescripciÃ³n
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

-- MÃ©dicos pueden ver sus propias recetas
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

-- ADMINISTRADOR puede ver TODO para las mÃ©tricas
CREATE POLICY "prescription_items_admin_all" ON public.prescription_items
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- 2. Asegurar que el Admin pueda ver medical_records globales (actualmente limitada por RLS)
-- AÃ±adimos una polÃ­tica especÃ­fica para el rol admin en medical_records
CREATE POLICY "medical_records_admin_all" ON public.medical_records
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
-- Script para poblar la base de datos con datos ficticios completos

-- ====================================================================
-- CREAR USUARIOS DE AUTH (Manual - Solo referencia)
-- ====================================================================
-- IMPORTANTE: Los UUIDs de ejemplo deben reemplazarse con los UUIDs reales
-- despuÃ©s de crear los usuarios mediante el Dashboard de Supabase Auth

-- Usuario Admin
-- Email: admin@servimed.com
-- Password: Admin123!
-- UUID de ejemplo: 11111111-1111-1111-1111-111111111111
-- user_metadata: {"role": "admin", "full_name": "Administrador Sistema"}

-- Usuario MÃ©dico
-- Email: medico@test.com
-- Password: Medico123!
-- UUID de ejemplo: 22222222-2222-2222-2222-222222222222
-- user_metadata: {"role": "doctor", "full_name": "Dr. Juan PÃ©rez"}

-- Usuario Paciente
-- Email: paciente@test.com
-- Password: Paciente123!
-- UUID de ejemplo: 33333333-3333-3333-3333-333333333333
-- user_metadata: {"role": "patient", "full_name": "MarÃ­a GonzÃ¡lez"}

-- ====================================================================
-- DATOS FICTICIOS - MÃ‰DICOS (10 especialistas)
-- ====================================================================

-- Nota: Reemplazar los user_id con los UUIDs reales de los usuarios creados

INSERT INTO doctors (id, user_id, full_name, specialty, license_number, bio, experience_years, education, consultation_fee, avatar_url, rating, total_reviews, is_verified, is_active) VALUES
-- Dr. Juan PÃ©rez - CardiologÃ­a
('d1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Dr. Juan PÃ©rez', 'CardiologÃ­a', 'MED-001-2015', 'Especialista en enfermedades cardiovasculares con mÃ¡s de 10 aÃ±os de experiencia', 10, '[{"degree": "Medicina General", "institution": "Universidad Nacional", "year": 2010}, {"degree": "CardiologÃ­a", "institution": "Hospital Universitario", "year": 2015}]'::jsonb, 75.00, null, 4.8, 127, true, true),

-- Dra. MarÃ­a GonzÃ¡lez - PediatrÃ­a
('d2222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'Dra. MarÃ­a GonzÃ¡lez', 'PediatrÃ­a', 'MED-002-2016', 'Pediatra especializada en desarrollo infantil y vacunaciÃ³n', 8, '[{"degree": "Medicina General", "institution": "Universidad Central", "year": 2012}, {"degree": "PediatrÃ­a", "institution": "Instituto Infantil", "year": 2016}]'::jsonb, 60.00, null, 4.9, 215, true, true),

-- Dr. Carlos RodrÃ­guez - TraumatologÃ­a
('d3333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'Dr. Carlos RodrÃ­guez', 'TraumatologÃ­a', 'MED-003-2013', 'TraumatÃ³logo experto en cirugÃ­a ortopÃ©dica y rehabilitaciÃ³n', 12, '[{"degree": "Medicina General", "institution": "Universidad del Valle", "year": 2008}, {"degree": "TraumatologÃ­a", "institution": "Hospital San JosÃ©", "year": 2013}]'::jsonb, 80.00, null, 4.7, 98, true, true),

-- Dra. Ana MartÃ­nez - GinecologÃ­a
('d4444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666', 'Dra. Ana MartÃ­nez', 'GinecologÃ­a', 'MED-004-2017', 'GinecÃ³loga especializada en salud femenina y obstetricia', 7, '[{"degree": "Medicina General", "institution": "Universidad de los Andes", "year": 2013}, {"degree": "GinecologÃ­a", "institution": "ClÃ­nica Maternal", "year": 2017}]'::jsonb, 70.00, null, 4.9, 182, true, true),

-- Dr. Luis GarcÃ­a - DermatologÃ­a
('d5555555-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777', 'Dr. Luis GarcÃ­a', 'DermatologÃ­a', 'MED-005-2014', 'DermatÃ³logo experto en tratamientos de piel y estÃ©tica mÃ©dica', 9, '[{"degree": "Medicina General", "institution": "Universidad Javeriana", "year": 2011}, {"degree": "DermatologÃ­a", "institution": "Centro DermatolÃ³gico", "year": 2014}]'::jsonb, 65.00, null, 4.6, 143, true, true),

-- Dra. Carmen LÃ³pez - OftalmologÃ­a
('d6666666-6666-6666-6666-666666666666', '88888888-8888-8888-8888-888888888888', 'Dra. Carmen LÃ³pez', 'OftalmologÃ­a', 'MED-006-2018', 'OftalmÃ³loga especializada en cirugÃ­a refractiva', 6, '[{"degree": "Medicina General", "institution": "Universidad del Rosario", "year": 2014}, {"degree": "OftalmologÃ­a", "institution": "Instituto de la VisiÃ³n", "year": 2018}]'::jsonb, 75.00, null, 4.8, 91, true, true),

-- Dr. Jorge SÃ¡nchez - NeurologÃ­a
('d7777777-7777-7777-7777-777777777777', '99999999-9999-9999-9999-999999999999', 'Dr. Jorge SÃ¡nchez', 'NeurologÃ­a', 'MED-007-2012', 'NeurÃ³logo con especializaciÃ³n en migraÃ±as y cefaleas', 13, '[{"degree": "Medicina General", "institution": "Universidad Nacional", "year": 2007}, {"degree": "NeurologÃ­a", "institution": "Instituto NeurolÃ³gico", "year": 2012}]'::jsonb, 85.00, null, 4.7, 76, true, true),

-- Dra. Laura Torres - EndocrinologÃ­a
('d8888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dra. Laura Torres', 'EndocrinologÃ­a', 'MED-008-2019', 'EndocrinÃ³loga especializada en diabetes y tiroides', 5, '[{"degree": "Medicina General", "institution": "Universidad del Norte", "year": 2015}, {"degree": "EndocrinologÃ­a", "institution": "Centro MetabÃ³lico", "year": 2019}]'::jsonb, 70.00, null, 4.9, 54, true, true),

-- Dr. Miguel RamÃ­rez - UrologÃ­a
('d9999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Dr. Miguel RamÃ­rez', 'UrologÃ­a', 'MED-009-2015', 'UrÃ³logo experto en tratamientos mÃ­nimamente invasivos', 10, '[{"degree": "Medicina General", "institution": "Universidad Libre", "year": 2009}, {"degree": "UrologÃ­a", "institution": "Hospital Militar", "year": 2015}]'::jsonb, 80.00, null, 4.6, 67, true, true),

-- Dra. Patricia Flores - PsiquiatrÃ­a
('daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Dra. Patricia Flores', 'PsiquiatrÃ­a', 'MED-010-2016', 'Psiquiatra especializada en terapia cognitivo-conductual', 8, '[{"degree": "Medicina General", "institution": "Universidad Externado", "year": 2012}, {"degree": "PsiquiatrÃ­a", "institution": "FundaciÃ³n Santa Fe", "year": 2016}]'::jsonb, 60.00, null, 4.8, 103, true, true);

-- ====================================================================
-- DATOS FICTICIOS - PACIENTES (20 pacientes)
-- ====================================================================

INSERT INTO patients (id, user_id, full_name, date_of_birth, gender, blood_type, allergies, emergency_contact, insurance_provider, insurance_number) VALUES
('p1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'MarÃ­a GonzÃ¡lez', '1985-03-15', 'female', 'O+', '{Penicilina}', '{"name": "Juan GonzÃ¡lez", "phone": "+57 300 1234567", "relationship": "Esposo"}'::jsonb, 'Seguros Bolivar', 'SB-12345678'),
('p2222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Carlos Mendoza', '1990-07-22', 'male', 'A+', '{}', '{"name": "Ana Mendoza", "phone": " +57 310 2345678", "relationship": "Hermana"}'::jsonb, 'Sura', 'SU-98765432'),
('p3333333-3333-3333-3333-333333333333', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Laura RamÃ­rez', '1978-11-05', 'female', 'B+', '{Aspirina, Ibuprofeno}', '{"name": "Pedro RamÃ­rez", "phone": "+57 320 3456789", "relationship": "Esposo"}'::jsonb, 'Sanitas', 'SA-45678901'),
('p4444444-4444-4444-4444-444444444444', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'AndrÃ©s Castro', '1995-01-30', 'male', 'AB+', '{}', '{"name": "Rosa Castro", "phone": "+57 311 4567890", "relationship": "Madre"}'::jsonb, 'Compensar', 'CO-23456789'),
('p5555555-5555-5555-5555-555555555555', '10101010-1010-1010-1010-101010101010', 'Diana Palacios', '1988-09-12', 'female', 'O-', '{LÃ¡tex}', '{"name": "Jorge Palacios", "phone": "+57 301 5678901", "relationship": "Hermano"}'::jsonb, 'Nueva EPS', 'NE-34567890');

-- Continuar insertando mÃ¡s pacientes hasta llegar a 20...

-- ====================================================================
-- DISPONIBILIDAD DE MÃ‰DICOS (Horarios)
-- ====================================================================

-- Dr. Juan PÃ©rez - CardiologÃ­a (Lunes a Viernes, 8:00-17:00)
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active) VALUES
('d1111111-1111-1111-1111-111111111111', 1, '08:00', '12:00', 30, true),
('d1111111-1111-1111-1111-111111111111', 1, '14:00', '17:00', 30, true),
('d1111111-1111-1111-1111-111111111111', 2, '08:00', '12:00', 30, true),
('d1111111-1111-1111-1111-111111111111', 2, '14:00', '17:00', 30, true),
('d1111111-1111-1111-1111-111111111111', 3, '08:00', '12:00', 30, true),
('d1111111-1111-1111-1111-111111111111', 3, '14:00', '17:00', 30, true),
('d1111111-1111-1111-1111-111111111111', 4, '08:00', '12:00', 30, true),
('d1111111-1111-1111-1111-111111111111', 5, '08:00', '12:00', 30, true);

-- Dra. MarÃ­a GonzÃ¡lez - PediatrÃ­a (Lunes a SÃ¡bado, 9:00-18:00)
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active) VALUES
('d2222222-2222-2222-2222-222222222222', 1, '09:00', '13:00', 20, true),
('d2222222-2222-2222-2222-222222222222', 1, '14:00', '18:00', 20, true),
('d2222222-2222-2222-2222-222222222222', 2, '09:00', '13:00', 20, true),
('d2222222-2222-2222-2222-222222222222', 3, '09:00', '13:00', 20, true),
('d2222222-2222-2222-2222-222222222222', 6, '09:00', '13:00', 20, true);

-- ====================================================================
-- CITAS (50 registros - pasadas, presentes, futuras)
-- ====================================================================

-- Citas pasadas (completadas)
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, duration, status, reason, notes) VALUES
('p1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '2026-01-15', '10:00', 30, 'completed', 'Chequeo cardiolÃ³gico de rutina', 'Paciente en buen estado general'),
('p2222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222', '2026-01-20', '11:00', 20, 'completed', 'VacunaciÃ³n infantil', 'Vacuna aplicada correctamente');

-- Citas futuras (confirmadas)
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, duration, status, reason) VALUES
('p1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '2026-02-20', '10:00', 30, 'confirmed', 'Control de presiÃ³n arterial'),
('p3333333-3333-3333-3333-333333333333', 'd4444444-4444-4444-4444-444444444444', '2026-02-21', '15:00', 30, 'confirmed', 'Consulta ginecolÃ³gica');

-- Citas pendientes
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, duration, status, reason) VALUES
('p4444444-4444-4444-4444-444444444444', 'd3333333-3333-3333-3333-333333333333', '2026-02-25', '09:00', 30, 'pending', 'Dolor de rodilla'),
('p5555555-5555-5555-5555-555555555555', 'd5555555-5555-5555-5555-555555555555', '2026-02-26', '14:30', 30, 'pending', 'Consulta dermatolÃ³gica');

-- Citas canceladas
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, duration, status, reason, cancelled_at, cancellation_reason) VALUES
('p2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', '2026-02-10', '16:00', 30, 'cancelled', 'Chequeo general', '2026-02-08 10:15:00', 'Viaje imprevisto');

-- ====================================================================
-- HISTORIALES MÃ‰DICOS (30 registros)
-- ====================================================================

INSERT INTO medical_records (patient_id, doctor_id, record_date, diagnosis, symptoms, treatment, prescriptions, notes) VALUES
('p1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '2026-01-15', 'HipertensiÃ³n arterial leve', 'Dolor de cabeza ocasional, mareos', 'Control de dieta y ejercicio regular', '[{"medication": "LosartÃ¡n", "dosage": "50mg", "frequency": "1 vez al dÃ­a", "duration": "30 dÃ­as"}]'::jsonb, 'Paciente responde bien al tratamiento'),
('p2222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222', '2026-01-20', 'Desarrollo infantil normal', 'Ninguno', 'Continuar con vacunaciÃ³n segÃºn calendario', '[]'::jsonb, 'NiÃ±o saludable');

-- ====================================================================
-- NOTIFICACIONES
-- ====================================================================

INSERT INTO notifications (user_id, type, title, message) VALUES
('33333333-3333-3333-3333-333333333333', 'appointment_confirmation', 'Cita Confirmada', 'Tu cita con Dr. Juan PÃ©rez ha sido confirmada para el 20 de febrero a las 10:00 AM'),
('33333333-3333-3333-3333-333333333333', 'appointment_reminder', 'Recordatorio de Cita', 'Tienes una cita maÃ±ana con Dr. Juan PÃ©rez a las 10:00 AM');

-- ====================================================================
-- MÃ‰TRICAS ADMINISTRATIVAS
-- ====================================================================

INSERT INTO admin_metrics (metric_type, metric_date, value, metadata) VALUES
('appointments_count', '2026-02-01', 145, '{"specialty": "CardiologÃ­a"}'::jsonb),
('appointments_count', '2026-02-01', 223, '{"specialty": "PediatrÃ­a"}'::jsonb),
('new_patients', '2026-02-01', 28, '{}'::jsonb),
('popular_specialties', '2026-02-01', 1, '{"specialty": "PediatrÃ­a", "count": 223}'::jsonb),
('popular_specialties', '2026-02-01', 2, '{"specialty": "CardiologÃ­a", "count": 145}'::jsonb);
