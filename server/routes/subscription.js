/**
 * Subscription Management Routes
 * Stripe-based subscription billing for workspace plans
 */

const express = require('express');
const { safeError } = require('../utils/safeError');
const { supabase } = require('../config/supabase');

const router = express.Router();

// ── Plan definitions ────────────────────────────────────────

const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    interval: 'month',
    limits: { workspaces: 1, users: 3, invoices: 20, storage: '500MB' },
  },
  starter: {
    name: 'Starter',
    price: 499,
    interval: 'month',
    limits: { workspaces: 3, users: 10, invoices: 200, storage: '5GB' },
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
  },
  professional: {
    name: 'Professional',
    price: 1499,
    interval: 'month',
    limits: { workspaces: 10, users: 50, invoices: 1000, storage: '50GB' },
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
  },
  enterprise: {
    name: 'Enterprise',
    price: 4999,
    interval: 'month',
    limits: { workspaces: Infinity, users: Infinity, invoices: Infinity, storage: '500GB' },
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  },
};

// ── Get current subscription ────────────────────────────────

router.get('/current', async (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

    const { data, error } = await supabase
      .from('workspace_subscriptions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    const plan = PLANS[data?.plan || 'free'] || PLANS.free;
    return res.json({
      success: true,
      data: {
        ...data,
        plan_details: plan,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: safeError(err) });
  }
});

// ── Get available plans ─────────────────────────────────────

router.get('/plans', (_req, res) => {
  return res.json({ success: true, data: PLANS });
});

// ── Create Stripe checkout session ──────────────────────────

router.post('/checkout', async (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'];
    const { plan } = req.body;
    if (!workspaceId || !plan) return res.status(400).json({ error: 'workspaceId and plan required' });

    const planDef = PLANS[plan];
    if (!planDef) return res.status(400).json({ error: 'Invalid plan' });
    if (!planDef.stripePriceId) return res.status(400).json({ error: 'Stripe not configured for this plan' });

    // Stripe checkout would be initialized here
    // For now, return a placeholder — integrate with Stripe SDK when keys are available
    const checkoutSession = {
      id: `cs_${Date.now()}`,
      url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/checkout?plan=${plan}`,
      plan,
      price: planDef.price,
    };

    return res.json({ success: true, data: checkoutSession });
  } catch (err) {
    return res.status(500).json({ error: safeError(err) });
  }
});

// ── Stripe webhook handler ──────────────────────────────────

router.post('/webhook', async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const IS_PROD = process.env.NODE_ENV === 'production';
    let event;

    if (webhookSecret) {
      // Signature header is required whenever a secret is configured — in both
      // dev and prod. An absent or invalid sig means the request is forged.
      if (!sig) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
      }
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      try {
        event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, webhookSecret);
      } catch (err) {
        return res.status(400).json({ error: 'Webhook signature verification failed' });
      }
    } else if (IS_PROD) {
      // Production without a configured secret is a misconfiguration — reject.
      return res.status(400).json({ error: 'Stripe webhook secret not configured' });
    } else {
      // Local dev with no secret configured: accept unsigned events for testing only.
      event = req.body;
    }
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const workspaceId = session.metadata?.workspace_id;
        if (workspaceId) {
          await supabase.from('workspace_subscriptions').insert({
            workspace_id: workspaceId,
            plan: session.metadata?.plan || 'starter',
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (subId) {
          await supabase
            .from('workspace_subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subId);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await supabase
          .from('workspace_subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);
        break;
      }
      default:
        break;
    }

    return res.json({ received: true });
  } catch (err) {
    return res.status(500).json({ error: safeError(err) });
  }
});

// ── Cancel subscription ─────────────────────────────────────

router.post('/cancel', async (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'];
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

    const { data, error } = await supabase
      .from('workspace_subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .select('*')
      .single();

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: safeError(err) });
  }
});

// ── Usage stats ─────────────────────────────────────────────

router.get('/usage', async (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'];
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

    const [users, invoices, storage] = await Promise.allSettled([
      supabase.from('workspace_members').select('*', { count: 'exact' }).eq('workspace_id', workspaceId),
      supabase.from('invoices').select('*', { count: 'exact' }).eq('workspace_id', workspaceId),
      supabase.from('workspace_storage').select('used_bytes').eq('workspace_id', workspaceId).maybeSingle(),
    ]);

    const { data: sub } = await supabase
      .from('workspace_subscriptions')
      .select('plan')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .limit(1)
      .single();

    const plan = PLANS[sub?.plan || 'free'] || PLANS.free;

    return res.json({
      success: true,
      data: {
        plan: sub?.plan || 'free',
        limits: plan.limits,
        usage: {
          users: users.status === 'fulfilled' ? users.value.count : 0,
          invoices: invoices.status === 'fulfilled' ? invoices.value.count : 0,
          storage: storage.status === 'fulfilled' ? storage.value?.used_bytes || 0 : 0,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ error: safeError(err) });
  }
});

module.exports = router;