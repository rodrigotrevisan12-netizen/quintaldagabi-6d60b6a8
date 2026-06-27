
-- Stories
CREATE TABLE public.dog_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('photo','video')),
  caption text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX idx_dog_stories_dog ON public.dog_stories(dog_id, created_at DESC);
CREATE INDEX idx_dog_stories_expires ON public.dog_stories(expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dog_stories TO authenticated;
GRANT ALL ON public.dog_stories TO service_role;

ALTER TABLE public.dog_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stories staff manage" ON public.dog_stories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));

CREATE POLICY "stories tutor read own" ON public.dog_stories
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dogs d
      JOIN public.tutors t ON t.id = d.tutor_id
      WHERE d.id = dog_stories.dog_id AND t.user_id = auth.uid()
    )
  );

-- Realtime for arrivals
ALTER PUBLICATION supabase_realtime ADD TABLE public.arrival_notifications;
ALTER TABLE public.arrival_notifications REPLICA IDENTITY FULL;
