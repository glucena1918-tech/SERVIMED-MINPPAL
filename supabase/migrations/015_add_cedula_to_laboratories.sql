-- Agregar columnas cedula y specialty a la tabla laboratories
ALTER TABLE public.laboratories 
ADD COLUMN IF NOT EXISTS cedula TEXT;

ALTER TABLE public.laboratories
ADD COLUMN IF NOT EXISTS specialty TEXT DEFAULT 'Bioanalista Clínico';
