-- Crear bucket 'avatars' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS en objetos de storage (por si no lo está)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden VER los avatares (público)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Política: Usuarios autenticados pueden SUBIR avatares
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- Política: Usuarios pueden ACTUALIZAR sus propios avatares
-- Asumimos que el owner es el usuario que lo subió
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid() = owner );

-- Política: Usuarios pueden BORRAR sus propios avatares
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid() = owner );
