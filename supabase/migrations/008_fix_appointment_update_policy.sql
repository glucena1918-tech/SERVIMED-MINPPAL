-- Corregir la política de actualización de citas para permitir que los pacientes cancelen sus propias citas
-- Anteriormente solo se permitía a los doctores actualizar citas.

DROP POLICY IF EXISTS "policy_update_appointments" ON "public"."appointments";

CREATE POLICY "policy_update_appointments" ON "public"."appointments"
FOR UPDATE
TO authenticated
USING (
  (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())) 
  OR 
  (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
);
