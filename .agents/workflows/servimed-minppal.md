---
description: 
---

Diseñar y desarrollar una aplicación web para control de citas y expedientes médicos, toda la visual e interfaz de usuario en idioma español.

Workflow:

Objetivo
Construir una aplicación web enfocada en la gestión de citas médicas y expedientes clínicos, con prioridad en seguridad, trazabilidad, usabilidad operativa y cumplimiento de privacidad. 

Paso 1: Definir alcance
- Identificar: Médicos, Servicios, especialidades, usuarios.
- Identificar roles del sistema: administrador, médico, paciente
- Habrá una sola clínica

Paso 2: Modelar módulos
  - Agenda de citas
  - Pacientes
  - Expedientes médicos
  - Consultas
  - Recetas e indicaciones
  - Órdenes y resultados
  - Reportes
  - Configuración y permisos

Paso 3: Diseñar flujo clínico
  - Registro del paciente.
  - Registro del médico
  - Programación de cita
  - Confirmación y recordatorio
  - Check-in
  - Atención médica
  - Registro clínico
  - Cierre de consulta
  - Seguimiento o nueva cita

Paso 4: Diseñar datos mínimos
- Para citas: paciente, médico, fecha, hora, tipo, estado, motivo breve.
- Para expediente: datos demográficos, antecedentes, alergias, diagnósticos, tratamientos, evolución, documentos.

Paso 5: Diseñar UX operativa
- Usar layout de dashboard con sidebar y barra superior.
- Priorizar tablas, filtros, formularios validados y paneles de detalle.
- Mantener tipografía compacta y lenguaje corto.
- Mostrar siempre estados: cargando, vacío, error, actualizado.

Paso 6: Aplicar seguridad
- Implementar roles y permisos por módulo y acción.
- Aplicar principio de mínimo dato necesario.
- No mostrar PHI sensible en recordatorios o vistas inseguras.
- Registrar logs de auditoría en acciones críticas.

Restricciones
- No desviar el proyecto hacia branding innecesario.
- No inventar módulos sin relación clínica u operativa.
- No sacrificar privacidad por conveniencia de UX.
- No usar texto ambiguo: cada campo, estado y acción debe tener nombre claro.


