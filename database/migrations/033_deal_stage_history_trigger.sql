-- Migration 033: Auto-record deal_stage_history on stage change
-- Trigger function: when crm_opportunities.stage_id changes,
-- close the previous stage entry and open a new one.

CREATE OR REPLACE FUNCTION public.record_deal_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If stage_id changed (or this is an insert with a stage)
  IF TG_OP = 'INSERT' AND NEW.stage_id IS NOT NULL THEN
    -- New deal: insert first stage entry
    INSERT INTO public.deal_stage_history (opportunity_id, stage_id, workspace_id, entered_at)
    VALUES (NEW.id, NEW.stage_id, NEW.workspace_id, now());
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (OLD.stage_id IS DISTINCT FROM NEW.stage_id) THEN
    -- Close the most recent open entry for this opportunity
    UPDATE public.deal_stage_history
    SET exited_at = now()
    WHERE opportunity_id = NEW.id
      AND exited_at IS NULL
      AND workspace_id = NEW.workspace_id;

    -- If new stage is not null, open a new entry
    IF NEW.stage_id IS NOT NULL THEN
      INSERT INTO public.deal_stage_history (opportunity_id, stage_id, workspace_id, entered_at)
      VALUES (NEW.id, NEW.stage_id, NEW.workspace_id, now());
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply trigger to crm_opportunities
DROP TRIGGER IF EXISTS trg_deal_stage_change ON public.crm_opportunities;
CREATE TRIGGER trg_deal_stage_change
  AFTER INSERT OR UPDATE OF stage_id
  ON public.crm_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.record_deal_stage_change();