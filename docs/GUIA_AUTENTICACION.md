# Guía de Autenticación y Gestión de Usuarios
## Servimed Minppal - Sistema de Roles

---

## 📋 Resumen del Sistema

El sistema tiene **3 roles de usuario**:
1. **Paciente** (`patient`)
2. **Médico** (`doctor`)
3. **Administrador** (`admin`)

---

## ✅ Usuarios Activos

### Usuario de Prueba (Paciente)
- **Email:** `maria.gonzalez@gmail.com`
- **Contraseña:** `Paciente123!`
- **Rol:** `patient`
- **Portal:** http://localhost:3000/patient/dashboard

---

## 🔐 Cómo Crear Nuevos Usuarios

### 1️⃣ Crear Paciente
**Proceso:** Usar el formulario de registro público

1. Ve a: http://localhost:3000/register o clic en "Registrarse como Paciente" en la landing page
2. Selecciona la pestaña **"Paciente"**
3. Completa el formulario:
   - Nombre Completo
   - Correo Electrónico (usar dominio válido como `@gmail.com`)
   - Contraseña (mínimo 6 caracteres)
4. Haz clic en **"Crear Cuenta"**
5. El usuario se creará automáticamente con rol `patient`

### 2️⃣ Crear Médico
**Proceso:** Usar el formulario de registro público

1. Ve a: http://localhost:3000/register o clic en "Registrarse como Médico" en la landing page
2. Selecciona la pestaña **"Médico"**
3. Completa el formulario:
   - Nombre Completo
   - Especialidad
   - Número de Licencia
   - Correo Electrónico (usar dominio válido como `@gmail.com`)
   - Contraseña (mínimo 6 caracteres)
4. Haz clic en **"Crear Cuenta"**
5. El usuario se creará automáticamente con rol `doctor`

### 3️⃣ Crear Administrador
**Proceso:** Registro + Cambio Manual de Rol

**Paso A: Crear Usuario Base**
1. Ve a: http://localhost:3000/register
2. Crea un usuario como **Paciente** (el rol no importa, se cambiará después)
3. Usa un email como `admin.nombre@gmail.com`
4. Recuerda la contraseña que uses

**Paso B: Cambiar Rol a Admin (Ejecutar en Supabase SQL Editor)**
```sql
-- Cambiar el rol del usuario a admin
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"')
WHERE email = 'TU_EMAIL_AQUI@gmail.com';

-- Verificar el cambio
SELECT email, raw_user_meta_data->>'role' as rol 
FROM auth.users 
WHERE email = 'TU_EMAIL_AQUI@gmail.com';
```

---

## 🚪 Cómo Iniciar Sesión

### Para Pacientes y Médicos
1. Ve a: http://localhost:3000/login
2. Ingresa tu email y contraseña
3. Serás redirigido automáticamente a tu portal según tu rol

### Para Administradores
**Opción A:** Botón "Admin" en la landing page (http://localhost:3000)
**Opción B:** Directamente en http://localhost:3000/login

---

## ⚠️ Limitaciones Actuales

### 1. Confirmación de Email
**Problema:** Supabase requiere que los usuarios confirmen su email.

**Solución Temporal:** Desactivar la confirmación de email en Supabase o confirmar manualmente:
```sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'usuario@gmail.com';
```

### 2. Rate Limiting de Registro
**Problema:** Supabase limita la cantidad de registros desde la misma IP en un período corto.

**Solución:** 
- Esperar 10 minutos entre registros con emails similares
- Usar emails muy diferentes (ej: `maria@gmail.com` vs `doctor.lopez@outlook.com`)

### 3. Formulario de Registro para Pacientes
**Campos Faltantes:** El formulario actual NO solicita:
- Fecha de Nacimiento
- Género

Estos campos se guardan con valores por defecto en la base de datos y pueden ser editados después en el perfil del usuario.

---

## 🔧 Comandos Útiles de SQL

### Ver Todos los Usuarios
```sql
SELECT 
  email, 
  raw_user_meta_data->>'role' as rol,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC;
```

### Cambiar Rol de Usuario
```sql
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"NUEVO_ROL"')
WHERE email = 'usuario@ejemplo.com';
-- NUEVO_ROL puede ser: patient, doctor, o admin
```

### Confirmar Email de Usuario
```sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'usuario@ejemplo.com';
```

### Crear Perfil de Médico Manualmente
```sql
INSERT INTO doctors (user_id, full_name, specialty, license_number, is_verified, is_active)
VALUES (
  'USER_ID_AQUI',
  'Dr. Nombre Apellido',
  'Especialidad',
  'NUM-LICENCIA',
  true,
  true
);
```

---

## 📝 Notas Importantes

1. **Usar Emails Válidos:** Siempre usar dominios reales como `@gmail.com`, `@outlook.com`, etc.
2. **No Usar `@test.com` o `@servimed.com`:** Estos dominios causan problemas con Supabase Auth.
3. **Contraseñas Seguras:** Supabase requiere contraseñas de al menos 6 caracteres.
4. **Cliente SSR:** El proyecto usa `@supabase/ssr` para manejar cookies correctamente en Next.js.

---

## 🏗️ Próximos Pasos (Mejoras Futuras)

1. **Desactivar Confirmación de Email:** Configurar Supabase para desarrollo sin confirmación
2. **Agregar Campos al Registro:** Incluir fecha de nacimiento y género en el formulario de pacientes
3. **Panel de Admin para Crear Usuarios:** Interface web para que admins creen doctores y otros admins
4. **Recuperación de Contraseña:** Implementar flujo de reset de contraseña

---

**Última actualización:** 17 de Febrero de 2026
**Estado del Sistema:** ✅ Autenticación funcional para los 3 roles
