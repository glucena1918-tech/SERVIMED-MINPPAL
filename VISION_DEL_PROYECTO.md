# 🏥 VISIÓN DEL PROYECTO - SERVIMED MINPPAL

**Sistema Integral de Gestión de Servicios Médicos**

---

## 🎯 **OBJETIVO GENERAL**
Desarrollar una plataforma Web robusta, segura y escalable para la gestión integral de los servicios médicos de **SERVIMED MINPPAL**. El sistema digitaliza el flujo completo de atención al paciente, desde la solicitud de citas hasta la generación de documentos médicos oficiales, centralizando la información clínica y optimizando la operatividad del personal médico.

---

## 🏗️ **ARQUITECTURA DEL SISTEMA**

### **Stack Tecnológico**
- **Frontend:** [Next.js 15](https://nextjs.org) (App Router) + React 19
- **Estilos:** [Tailwind CSS](https://tailwindcss.com) (Diseño responsivo y moderno)
- **Backend & Base de Datos:** [Supabase](https://supabase.com) (PostgreSQL)
- **Autenticación:** Supabase Auth (Email/Password)
- **Almacenamiento:** Supabase Storage (para futuros adjuntos)
- **Generación de Documentos:** `jspdf` (Creación de PDFs en cliente)

### **Modelo de Datos Relacional**
El sistema se basa en un esquema relacional optimizado en PostgreSQL:

1. **`users`**: Base de usuarios (auth) vinculada a perfiles.
2. **`doctors`**: Perfiles de especialistas (Especialidad, Cédula, Licencia).
3. **`patients`**: Historia base del paciente, datos demográficos.
4. **`appointments`**: Gestión de citas con ciclo de vida completo (`pending`, `confirmed`, `completed`, `cancelled`).
5. **`medical_records`**: Historias clínicas detalladas (Diagnósticos, Tratamientos, Reposos).
   - *Relación:* Un `medical_record` pertenece a un `patient` y a un `doctor`.
   - *Relación:* Una `appointment` completada se vincula a un `medical_record`.

---

## 🔄 **FLUJOS DE TRABAJO PRINCIPALES**

### **1. Flujo de Atención Médica (Core)**
El corazón del sistema es el ciclo de vida de la atención médica, diseñado para ser fluido y automático:

1. **Solicitud:** El Paciente solicita una cita (Estado: `pending`).
2. **Confirmación:** El Médico revisa y confirma la cita (Estado: `confirmed`).
   - *Visual:* Badge Azul en Dashboard.
3. **Atención:** El Médico realiza la consulta y llena la Historia Clínica.
   - *Automatización:* Al guardar la historia, la cita del día pasa automáticamente a estado `completed`.
   - *Visual:* Badge Verde en Dashboard.
4. **Documentación:** El sistema genera instantáneamente los documentos oficiales necesarios.

### **2. Generación de Documentos Oficiales**
El sistema estandariza la salida documental siguiendo normativas estrictas:

- **Informe Médico (Formato MINPPAL):** Documento legal completo con diagnóstico, tratamiento y reposo.
- **Receta Médica:** Prescripción farmacéutica clara y formal.
- **Constancia de Asistencia:** Certificación simple para fines laborales/académicos.

*Características:*
- Títulos normalizados y subrayados.
- Firma digitalizada con nombre, especialidad, C.I. y Licencia del médico.
- Logo oficial institucional.

---

## 🛡️ **SEGURIDAD Y PRIVACIDAD**

- **Autenticación Robusta:** Gestión de sesiones segura vía Supabase.
- **RLS (Row Level Security):** Políticas a nivel de fila en la base de datos.
  - *Médicos:* Solo pueden ver/editar citas y registros asignados a ellos (o globales según rol).
  - *Pacientes:* Solo pueden acceder a su propia información.
- **Validación de Datos:** Tipado estricto con TypeScript en todo el proyecto.

---
## 🚀 **FUTURO Y ESCALABILIDAD**

El sistema está construido modularmente para permitir futuras expansiones:
- **Telemedicina:** Integración de videollamadas para consultas remotas.
- **Farmacia:** Módulo de inventario y despacho de medicamentos.
- **Analítica:** Dashboard gerencial con estadísticas de salud poblacional.
- **App Móvil:** API lista para ser consumida por una futura aplicación nativa.

---
**SERVIMED MINPPAL** - *Tecnología al servicio de la salud.*
