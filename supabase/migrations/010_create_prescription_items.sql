-- Tabla para los items del Recipe (Medicamentos individuales para KPIs)
CREATE TABLE IF NOT EXISTS prescription_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    medical_record_id UUID REFERENCES medical_records(id) ON DELETE CASCADE NOT NULL,
    medicine_name TEXT NOT NULL, -- Nombre del medicamento (KPI clave)
    dosage TEXT,                 -- Ej: 500mg
    frequency TEXT,              -- Ej: Cada 8 horas
    duration TEXT,               -- Ej: Por 5 días
    quantity TEXT,               -- Ej: 1 Caja / 10 Tabletas
    instructions TEXT,           -- Indicaciones adicionales específicas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad (RLS)

-- 1. Lectura: Ver items si tienes acceso a la historia médica (Doctor o Paciente)
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
            d.user_id = auth.uid() -- Es el doctor que la creó
            OR 
            p.user_id = auth.uid() -- Es el paciente dueño de la historia
        )
    )
);

-- 2. Inserción: Solo el doctor que crea la historia puede añadir items
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

-- Índices para reportes y KPIs rápidos
CREATE INDEX IF NOT EXISTS idx_prescription_items_medicine_name ON prescription_items(medicine_name);
CREATE INDEX IF NOT EXISTS idx_prescription_items_created_at ON prescription_items(created_at);
