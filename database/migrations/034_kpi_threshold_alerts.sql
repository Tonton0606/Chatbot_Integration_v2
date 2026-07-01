-- Migration 034: KPI Threshold Alerts
-- Automatically creates in-app notifications when a KPI score drops below threshold.
-- Trigger fires on INSERT/UPDATE of kpi_individual_scores.

-- Ensure task_notifications table supports KPI alerts (task_id/task_title are nullable)
ALTER TABLE IF EXISTS public.task_notifications
  ALTER COLUMN task_id DROP NOT NULL,
  ALTER COLUMN task_title DROP NOT NULL;

-- Add index for workspace + type queries (used by notifications route)
CREATE INDEX IF NOT EXISTS idx_task_notifications_type
  ON public.task_notifications(type);

-- Trigger function: check KPI score against threshold and create alert notification
CREATE OR REPLACE FUNCTION public.kpi_threshold_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  threshold int;
  affected_user_id uuid;
  admin_ids uuid[];
BEGIN
  -- Only fire on scores below threshold
  threshold := current_setting('app.kpi_alert_threshold', true)::int;
  IF threshold IS NULL THEN threshold := 40; END IF;

  IF NEW.weighted_score >= threshold THEN
    RETURN NEW;
  END IF;

  -- Get the user this KPI belongs to (for manager notification)
  affected_user_id := NEW.user_id;

  -- Find workspace admins to notify
  SELECT array_agg(DISTINCT wm.user_id)
  INTO admin_ids
  FROM public.workspace_members wm
  WHERE wm.workspace_id = NEW.workspace_id
    AND wm.role IN ('admin', 'manager', 'owner');

  -- Notify the affected user themselves
  INSERT INTO public.task_notifications
    (workspace_id, user_id, type, priority, title, body, link, dedup_key)
  VALUES (
    NEW.workspace_id,
    affected_user_id,
    'kpi_alert',
    CASE WHEN NEW.weighted_score < 25 THEN 'critical' WHEN NEW.weighted_score < threshold THEN 'high' ELSE 'medium' END,
    'KPI score dropped to ' || NEW.weighted_score,
    'Your KPI score is now ' || NEW.weighted_score || '/100 — below the threshold of ' || threshold || '. Review your task completion and on-time rates.',
    '/admin/kpi?userId=' || affected_user_id,
    affected_user_id || ':kpi_alert:' || NEW.period_start
  )
  ON CONFLICT (dedup_key) DO NOTHING;

  -- Notify workspace admins
  IF array_length(admin_ids, 1) > 0 THEN
    INSERT INTO public.task_notifications
      (workspace_id, user_id, type, priority, title, body, link, dedup_key)
    SELECT
      NEW.workspace_id,
      aid,
      'kpi_alert',
      CASE WHEN NEW.weighted_score < 25 THEN 'critical' WHEN NEW.weighted_score < threshold THEN 'high' ELSE 'medium' END,
      'Team member KPI dropped: ' || (SELECT full_name FROM public.profiles WHERE id = affected_user_id),
      'KPI score for ' || COALESCE((SELECT full_name FROM public.profiles WHERE id = affected_user_id), 'Unknown') || ' is now ' || NEW.weighted_score || '/100.',
      '/admin/kpi?userId=' || affected_user_id,
      aid || ':kpi_alert:' || affected_user_id || ':' || NEW.period_start
    FROM unnest(admin_ids) AS aid
    ON CONFLICT (dedup_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply trigger to kpi_individual_scores
DROP TRIGGER IF EXISTS trg_kpi_threshold_alert ON public.kpi_individual_scores;
CREATE TRIGGER trg_kpi_threshold_alert
  AFTER INSERT OR UPDATE OF weighted_score
  ON public.kpi_individual_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.kpi_threshold_alert();