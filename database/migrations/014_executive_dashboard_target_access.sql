-- Migration: Executive Dashboard target access
-- Allows Executive dashboard users to read and update dashboard configuration targets.

DROP POLICY IF EXISTS "Admins can manage executive targets" ON public.executive_targets;

CREATE POLICY "Executive users can manage executive targets" ON public.executive_targets
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin', 'SuperAdmin', 'Executive', 'admin', 'superadmin', 'executive')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin', 'SuperAdmin', 'Executive', 'admin', 'superadmin', 'executive')
    )
  );
