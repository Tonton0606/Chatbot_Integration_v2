-- Add Market Research feature to Intelligence division sidebar nav

DO $$
DECLARE
  v_division_id UUID;
BEGIN
  SELECT id INTO v_division_id
  FROM public.erp_divisions
  WHERE division_key = 'intelligence'
  LIMIT 1;

  IF v_division_id IS NULL THEN
    RAISE NOTICE 'Intelligence division not found — skipping.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.erp_features
    WHERE division_id = v_division_id AND feature_key = 'market_research'
  ) THEN
    UPDATE public.erp_features
    SET
      label       = 'Market Research',
      icon        = 'Search',
      description = 'AI-powered market intelligence — industry analysis, competitor landscape, and strategic insights',
      admin_route = '/Admin/Intelligence/MarketResearch',
      status      = 'active',
      updated_at  = now()
    WHERE division_id = v_division_id AND feature_key = 'market_research';

    RAISE NOTICE 'Market Research feature updated.';
  ELSE
    INSERT INTO public.erp_features (
      division_id, feature_key, label, icon, description,
      admin_route, client_route,
      admin_visible, client_visible, status,
      auto_enable_with_division, order_index
    ) VALUES (
      v_division_id,
      'market_research',
      'Market Research',
      'Search',
      'AI-powered market intelligence — industry analysis, competitor landscape, and strategic insights',
      '/Admin/Intelligence/MarketResearch',
      NULL,
      true,
      false,
      'active',
      false,
      20
    );

    RAISE NOTICE 'Market Research feature inserted.';
  END IF;
END $$;
