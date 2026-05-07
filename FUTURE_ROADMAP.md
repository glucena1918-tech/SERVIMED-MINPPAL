# 🚀 HOJA DE RUTA FUTURA - SERVIMED MINPPAL

## 💻 Migración a Entorno Local (Preparado / En Espera)

Este módulo ya cuenta con toda la infraestructura técnica instalada y configurada. Se encuentra en pausa hasta la autorización final para el "switch" oficial.

*   **Estado:** Infraestructura 100% configurada.
*   **Requisitos Completados:** Docker activo, Supabase CLI instalado, scripts de automatización listos.
*   **Acción Pendiente:** Ejecutar `npm run supabase:start` y actualizar variables de entorno.

---

## 🩻 Módulo de Radiología / Rayos X (En Planificación)

Basado en los nuevos requerimientos del Servicio Médico, se implementará un flujo para la gestión de imágenes diagnósticas básicas.

*   **Objetivo:** Digitalizar el proceso de solicitud y entrega de resultados de Rayos X.
*   **Componentes Principales:**
    - **Panel del Radiólogo:** Interfaz para que el especialista visualice la imagen (JPG/Digitalizada) e informe los hallazgos.
    - **Generador de Informes:** Creación de documentos PDF oficiales con el diagnóstico radiológico.
    - **Integración con Historia Clínica:** Acceso directo desde la ficha del paciente a sus placas e informes.
*   **Estado:** En espera de levantamiento de información técnica.

---

## 📱 Conversión a Aplicación Móvil (Pendiente por autorizar)

### Opción Seleccionada: El Camino Rápido (PWA - Progressive Web App)
Basado en nuestra conversación del 03 de Mayo, este es el plan para permitir que la web sea instalable como una App:

*   **Descripción:** Configurar Next.js para que el navegador detecte la aplicación como instalable.
*   **Funcionamiento:** Aparecerá un botón de "Instalar" en el móvil. Se creará un icono en la pantalla de inicio y la aplicación se abrirá sin barras de navegación, ocupando toda la pantalla.
*   **Ventajas:** 
    - No requiere descarga de APK.
    - Actualización instantánea (cada vez que actualicemos la web, la App se actualiza sola).
    - Mantiene el diseño premium y la conexión segura actual.

---
**NOTA:** Estos módulos están en pausa y NO se iniciará su desarrollo/migración hasta que el usuario dé su autorización.

---
*Documento actualizado el 07/05/2026 tras la configuración del entorno local.*

