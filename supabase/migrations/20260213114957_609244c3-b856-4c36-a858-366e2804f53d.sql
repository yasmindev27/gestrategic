
-- Create storage bucket for LMS materials (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lms-materiais', 'lms-materiais', false)
ON CONFLICT (id) DO NOTHING;

-- Only authenticated users can upload
CREATE POLICY "Authenticated users can upload LMS materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lms-materiais');

-- Only authenticated users can view (signed URLs)
CREATE POLICY "Authenticated users can view LMS materials"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lms-materiais');

-- Only admins and uploaders can delete
CREATE POLICY "Users can delete own LMS materials"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lms-materiais' AND auth.uid()::text = (storage.foldername(name))[1]);
