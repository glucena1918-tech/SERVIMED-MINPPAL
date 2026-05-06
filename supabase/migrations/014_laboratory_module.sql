-- ====================================================================
-- MIGRACIÓN 014: MÓDULO DE LABORATORIO (SISTEMA DE SALUD MINPPAL)
-- ====================================================================

-- 1. Enums para Categorías y Estados
DO $$ BEGIN
    CREATE TYPE lab_order_category AS ENUM ('sangre', 'heces', 'orina');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lab_order_status AS ENUM ('pendiente', 'muestra_tomada', 'en_proceso', 'completado', 'cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabla de Personal de Laboratorio (Bioanalistas / Especialistas)
CREATE TABLE IF NOT EXISTS public.laboratories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    license_number TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Órdenes de Laboratorio
CREATE TABLE IF NOT EXISTS public.laboratory_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE SET NULL,
    category lab_order_category NOT NULL,
    test_name TEXT NOT NULL, -- Ej: "Perfil 20", "Perfil Lipídico", "Coproanálisis"
    status lab_order_status DEFAULT 'pendiente',
    qr_code_id UUID DEFAULT uuid_generate_v4(),
    notes_from_doctor TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Resultados de Laboratorio
CREATE TABLE IF NOT EXISTS public.laboratory_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.laboratory_orders(id) ON DELETE CASCADE,
    specialist_id UUID REFERENCES public.laboratories(id) ON DELETE SET NULL,
    results_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Estructura flexible para campos de plantillas
    observations TEXT,
    is_finalized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Índices para Optimización de Búsqueda
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_id ON public.laboratory_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_doctor_id ON public.laboratory_orders(doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON public.laboratory_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_orders_category ON public.laboratory_orders(category);
CREATE INDEX IF NOT EXISTS idx_lab_results_order_id ON public.laboratory_results(order_id);

-- 6. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.laboratories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laboratory_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laboratory_results ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de RLS (Basadas en auth.jwt() -> app_metadata -> role)

-- LABORATORIES (Personal de Lab)
-- Admin tiene acceso total
CREATE POLICY "laboratories_admin_all" ON public.laboratories FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Personal de lab puede ver su propio perfil
CREATE POLICY "laboratories_select_own" ON public.laboratories FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- LABORATORY_ORDERS (Órdenes)
-- Admin tiene acceso total
CREATE POLICY "orders_admin_all" ON public.laboratory_orders FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Médicos pueden ver y crear órdenes (solo las que ellos ordenaron)
CREATE POLICY "orders_doctor_manage" ON public.laboratory_orders FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM doctors WHERE doctors.id = laboratory_orders.doctor_id AND doctors.user_id = auth.uid()));

-- Personal de Lab puede ver todas las órdenes y actualizar estado
CREATE POLICY "orders_lab_manage" ON public.laboratory_orders FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'laboratory');

-- Pacientes pueden ver sus propias órdenes
CREATE POLICY "orders_patient_select" ON public.laboratory_orders FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM patients WHERE patients.id = laboratory_orders.patient_id AND patients.user_id = auth.uid()));

-- LABORATORY_RESULTS (Resultados)
-- Admin tiene acceso total
CREATE POLICY "results_admin_all" ON public.laboratory_results FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Personal de Lab puede gestionar resultados
CREATE POLICY "results_lab_manage" ON public.laboratory_results FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'laboratory');

-- Médicos pueden ver resultados FINALIZADOS de sus pacientes
CREATE POLICY "results_doctor_select" ON public.laboratory_results FOR SELECT TO authenticated
    USING (is_finalized = true AND EXISTS (
        SELECT 1 FROM laboratory_orders WHERE laboratory_orders.id = order_id AND 
        EXISTS (SELECT 1 FROM doctors WHERE doctors.id = laboratory_orders.doctor_id AND doctors.user_id = auth.uid())
    ));

-- Pacientes pueden ver sus propios resultados FINALIZADOS
CREATE POLICY "results_patient_select" ON public.laboratory_results FOR SELECT TO authenticated
    USING (is_finalized = true AND EXISTS (
        SELECT 1 FROM laboratory_orders WHERE laboratory_orders.id = order_id AND 
        EXISTS (SELECT 1 FROM patients WHERE patients.id = laboratory_orders.patient_id AND patients.user_id = auth.uid())
    ));

-- 8. Habilitar Realtime para Órdenes (Actualización instantánea en panel de laboratorio)
-- Nota: Asegúrate de que la publicación 'supabase_realtime' existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE laboratory_orders;
