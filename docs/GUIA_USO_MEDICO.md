# 🏥 GUÍA DE USO OPERATIVO - Portal Médico
**SERVIMED MINPPAL V1.0 - 17 de Febrero de 2026**

Este documento detalla el uso del nuevo sistema de gestión de citas y emisión de documentos.

---

## 📅 **1. GESTIÓN DE CITAS (NUEVO FLUJO)**

El Dashboard del médico ahora cuenta con un sistema visual de **Citas Pendientes**, **Confirmadas** y **Completadas**.

### **Estados Visuales (Badges):**
- 🟡 **Cita Pendiente:** Aparece en la sección izquierda ("Solicitudes Pendientes"). El paciente ha solicitado la cita pero aún no se ha confirmado.
- 🔵 **Confirmada ([Confirmada]):** Aparece en la Agenda Programada con un badge azul. Significa que la cita está programada pero **NO ATENDIDA**.
- 🟢 **Completada ([✓ Completada]):** Aparece en la Agenda Programada con un badge verde. Significa que **YA SE GENERÓ** el informe médico para esta cita.

### **Filtros de Agenda:**
- **[Hoy] / [Semana] / [Mes]:** Filtra las citas mostradas.
- **[ ] Mostrar citas completadas:** 
  - ✅ **Marcado:** Muestra el historial completo (citas confirmadas Y completadas).
  - ⬜ **Desmarcado (Default):** Muestra solo las citas pendientes por atender, manteniendo la agenda limpia.

---

## 📝 **2. ATENCIÓN AL PACIENTE Y REGISTRO MÉDICO**

El proceso de atención se ha optimizado:

1. **Desde la Agenda:** Haz clic en **"Ver Ficha"** en la cita del paciente.
2. **En la Ficha del Paciente:** Haz clic en **"➕ Nuevo Registro"**.
3. **Llenado del Formulario:**
   - Diagnóstico (Obligatorio)
   - Síntomas
   - Tratamiento (Continuo / Temporal)
   - Indicaciones (Lista numerada)
   - Requiere Reposo (Sí/No y días)
   - Prescripción
4. **Guardar Registro:**
   - ⚠️ **AUTOMATIZACIÓN:** Al guardar, el sistema **automáticamente** buscará la cita confirmada de ese paciente para el día de hoy y la marcará como **COMPLETADA** (🟢). Ya no es necesario hacerlo manualmente.

---

## 📄 **3. GENERACIÓN DE DOCUMENTOS OFICIALES (PDF)**

Una vez guardado el registro médico, se habilitan los botones de descarga en el historial del paciente:

### **a. Informe Médico (Formato MINPPAL)**
- **Contenido:** Diagnóstico completo, tratamiento (indicaciones numeradas), duración y tipo de tratamiento.
- **Formato:** Título "Informe Médico" subrayado. Datos del paciente. Firma con C.I. y Licencia.

### **b. Receta Médica**
- **Contenido:** Datos del médico (arriba y abajo), prescripción detallada y diagnóstico breve.
- **Formato:** Título "RECETA MÉDICA" subrayado. Diseño limpio sin líneas confusas.

### **c. Constancia de Asistencia**
- **Contenido:** Certificación de asistencia a consulta y reposo médico (si aplica).
- **Formato:** Título "CONSTANCIA DE ASISTENCIA..." subrayado. Texto legal formal.

### **Nota Importante sobre la Cédula:**
Para que su Cédula de Identidad aparezca correctamente en los documentos:
1. Vaya a **"Mi Perfil"** (icono de engranaje en el Dashboard).
2. Complete el campo **"Cédula de Identidad"**.
3. Guarde los cambios.

---

## 🚀 **RESUMEN DE NOVEDADES (17/02/2026)**
- ✅ **Cédula del Médico:** Ahora obligatoria en perfil y documentos.
- ✅ **Género:** Corrección de "Sexo" a "Género" (Masculino/Femenino).
- ✅ **Diseño PDF:** Eliminación de recuadros azules y líneas confusas.
- ✅ **Agenda Limpia:** Las citas atendidas se ocultan automáticamente (activable con toggle).

---
**Soporte Técnico:** Contactar al administrador del sistema.
