# 🏥 VISIÓN DEL PROYECTO - SISTEMA DE SALUD INSTITUCIONAL MINPPAL

**Gestión Integral de Servicios Médicos**

---

## 🎯 **OBJETIVO GENERAL**
Desarrollar una plataforma Web robusta, segura y escalable para la gestión integral de los servicios médicos del **SISTEMA DE SALUD INSTITUCIONAL MINPPAL**. El sistema digitaliza el flujo completo de atención al paciente, desde la solicitud de citas hasta la generación de documentos médicos oficiales, centralizando la información clínica y optimizando la operatividad del personal médico.

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

## 🛠️ **NOTAS DE TRANSICIÓN: DESARROLLO A PRODUCCIÓN**

### **Proceso de Entrega y Traspaso Administrativo**
Para garantizar una transición segura y limpia al finalizar la fase de desarrollo, se seguirá el siguiente protocolo:

1.  **Sanitización de Datos:**
    *   Se realizará un `TRUNCATE` o limpieza total de las tablas de datos (`patients`, `appointments`, `medical_records`, `prescription_items`) para eliminar registros de prueba.
    *   La estructura de la base de datos (Esquema, Tablas, Funciones) se mantendrá intacta.

2.  **Migración de Control Administrativo (RBAC):**
    *   Durante el desarrollo, el acceso administrativo está vinculado al correo de prueba del desarrollador principal.
    *   En producción, el sistema utilizará un sistema de **Roles basado en Base de Datos**. El acceso se validará mediante una columna `role` en la tabla de perfiles, eliminando la dependencia de correos específicos en el código fuente.
    *   Se designará una **Variable de Entorno** para el "Admin Maestro" inicial.

3.  **Habilitación del Nuevo Administrador:**
    *   El administrador institucional registrará su cuenta oficial.
    *   Se le asignará el rol `admin` mediante consola por única vez.
    *   A partir de ese momento, el Administrador tendrá autonomía total para crear usuarios del rol "Secretaría" y gestionar la plataforma sin intervención técnica externa.

4.  **Ajuste de Políticas de Seguridad (RLS):**
    *   Las políticas de Supabase se actualizarán para permitir el acceso total al rol `admin` de forma genérica, garantizando que el nuevo administrador tenga visibilidad sobre todos los KPIs e indicadores del sistema.

## 💻 ENTORNO DE DESARROLLO LOCAL Y MIGRACIÓN (PRÓXIMAMENTE)

Con el fin de garantizar la soberanía tecnológica y la independencia de servicios en la nube, se ha preparado el entorno para una migración transparente a un servidor local.

### **Estado Actual: Infraestructura Lista**
- **Docker & Docker Desktop:** Instalado y configurado como motor de contenedores.
- **Supabase CLI:** Integrado en el proyecto para gestionar la base de datos, autenticación y almacenamiento localmente.
- **PostgreSQL 18:** Disponible en el sistema local para soporte y herramientas adicionales.
- **Scripts de Automatización:** Añadidos al `package.json` (`supabase:start`, `supabase:stop`, `supabase:status`).

### **Plan de Migración (Cloud → Local)**
Cuando se decida realizar el cambio definitivo, el proceso será:
1.  **Sincronización:** Ejecutar `npm run supabase:start` para levantar los servicios locales.
2.  **Despliegue de Esquema:** Las migraciones locales (en `supabase/migrations`) se aplicarán automáticamente, replicando la estructura exacta de la nube.
3.  **Población de Datos:** Se utilizará el archivo `seed.sql` para cargar los datos base y de prueba necesarios.
4.  **Cambio de Variables:** Se actualizará el archivo `.env.local` con las credenciales locales (obtenidas mediante `npm run supabase:status`).
5.  **Validación:** Pruebas de flujo completo (Citas -> Historia -> PDF) en el entorno local antes de dar de baja el servicio en la nube.

---
**SISTEMA DE SALUD INSTITUCIONAL MINPPAL** - *Tecnología al servicio de la salud.*

> [!NOTE]
> **PENDIENTE PARA PRODUCCIÓN:** Actualmente, la creación de nuevos usuarios (Médicos/Secretarías) desde el Dashboard de Administrador solo añade registros a las tablas de datos. Para el despliegue final, se debe implementar una **Edge Function** con el `service_role` de Supabase para automatizar la creación de la cuenta en `supabase.auth`, evitando el registro manual en el Dashboard de Supabase.

