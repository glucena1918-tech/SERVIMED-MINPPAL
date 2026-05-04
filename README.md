# 🏥 SERVIMED - SISTEMA DE SALUD INSTITUCIONAL MINPPAL

![SERVIMED MINPPAL](https://raw.githubusercontent.com/glucena1918-tech/SERVIMED-MINPPAL/main/public/images/logo.png) <!-- Asegúrate de que la ruta del logo sea correcta o usa un placeholder -->

## 📝 Descripción
**SERVIMED MINPPAL** es una plataforma web integral diseñada para la gestión de servicios médicos institucionales. El sistema permite digitalizar todo el flujo de atención al paciente, desde la solicitud de citas hasta la generación de documentos médicos oficiales (Informes, Recetas y Constancias), centralizando la información clínica bajo estándares de seguridad y eficiencia.

---

## 🚀 Guía de Inicio para Desarrolladores

Para colaborar en este proyecto, sigue estos pasos para configurar tu entorno local:

### 1. Clonar el Repositorio
```bash
git clone https://github.com/glucena1918-tech/SERVIMED-MINPPAL.git
cd SERVIMED-MINPPAL
```

### 2. Instalar Dependencias
Asegúrate de tener [Node.js](https://nodejs.org/) instalado (se recomienda v18 o superior).
```bash
npm install
```

### 3. Configurar Variables de Entorno ⚠️
Crea un archivo llamado `.env.local` en la raíz del proyecto. Este archivo **no se incluye en el repositorio** por razones de seguridad. Debes solicitar las credenciales de Supabase al administrador del proyecto y añadirlas de la siguiente forma:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_llave_anon_de_supabase
```

### 4. Ejecutar en Desarrollo
```bash
npm run dev
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Stack Tecnológico
- **Framework:** [Next.js 15](https://nextjs.org) (App Router)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com)
- **Backend:** [Supabase](https://supabase.com) (PostgreSQL + Auth + RLS)
- **Documentación:** [jsPDF](https://github.com/parallax/jsPDF) para reportes médicos.

---

## 🏗️ Estructura del Proyecto
- `/app`: Rutas y lógica de páginas (Next.js App Router).
- `/components`: Componentes de UI reutilizables (Botones, Modales, Layouts).
- `/lib`: Configuraciones de clientes (Supabase) y utilidades.
- `/docs`: Documentación detallada del flujo médico y técnico.
- `/supabase`: Migraciones y esquemas de base de datos.
- `/public`: Activos estáticos (Imágenes, Logos).

---

## 🛡️ Seguridad
El sistema implementa **Row Level Security (RLS)** en Supabase, garantizando que:
- Los **Pacientes** solo puedan ver su propio historial.
- Los **Médicos** solo accedan a sus citas y registros asignados.
- El acceso se gestione mediante roles definidos en la base de datos.

---

## 📄 Licencia
Este proyecto es de uso exclusivo institucional para **MINPPAL**. Todos los derechos reservados.

---
**SISTEMA DE SALUD INSTITUCIONAL MINPPAL** - *Tecnología al servicio de la salud.*
