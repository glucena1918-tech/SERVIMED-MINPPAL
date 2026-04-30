-- Extensiones necesarias para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear enum para roles de usuario
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');

-- Crear enum para géneros
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');

-- Crear enum para estados de cita
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- Crear enum para tipos de job
CREATE TYPE job_type AS ENUM ('send_email', 'generate_pdf', 'send_notification');

-- Crear enum para estados de job
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
