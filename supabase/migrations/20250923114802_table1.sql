INSERT INTO storage.buckets (id, name, public)
VALUES ('logo', 'logo', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Give users access to own folder 1zbfv_0" ON storage.objects;
CREATE POLICY "Give users access to own folder 1zbfv_0"
ON storage.objects
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (
	bucket_id = 'logo'
	AND (SELECT auth.uid()::text) = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "image 1zbfv_0" ON storage.objects;
CREATE POLICY "image 1zbfv_0"
ON storage.objects
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logo');

DROP POLICY IF EXISTS "image 1zbfv_1" ON storage.objects;
CREATE POLICY "image 1zbfv_1"
ON storage.objects
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (bucket_id = 'logo');

DROP POLICY IF EXISTS "image 1zbfv_2" ON storage.objects;
CREATE POLICY "image 1zbfv_2"
ON storage.objects
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (bucket_id = 'logo');

DROP POLICY IF EXISTS "img 16wiy3a_0" ON storage.objects;
CREATE POLICY "img 16wiy3a_0"
ON storage.objects
AS PERMISSIVE
FOR SELECT
TO public
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "img 16wiy3a_1" ON storage.objects;
CREATE POLICY "img 16wiy3a_1"
ON storage.objects
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "img 16wiy3a_2" ON storage.objects;
CREATE POLICY "img 16wiy3a_2"
ON storage.objects
AS PERMISSIVE
FOR DELETE
TO public
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "insertion image 1zbfv_0" ON storage.objects;
CREATE POLICY "insertion image 1zbfv_0"
ON storage.objects
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logo');



