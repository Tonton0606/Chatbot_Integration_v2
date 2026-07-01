-- Migration 030: Task Aging Detection + In-App Notifications
-- Aging rules: overdue, stale_todo, stale_in_progress, no_activity
-- Notifications are workspace-scoped and user-targeted (RLS enforced)

-- ── Aging configuration per workspace ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_aging_config (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Days thresholds (0 = disabled)
  overdue_alert_days       INTEGER NOT NULL DEFAULT 0,   -- alert N days after due_date passes
  stale_todo_days          INTEGER NOT NULL DEFAULT 3,   -- todo with no update for N days
  stale_in_progress_days   INTEGER NOT NULL DEFAULT 5,   -- in_progress with no update for N days
  no_activity_days         INTEGER NOT NULL DEFAULT 7,   -- any non-done task untouched for N days

  -- Who gets notified
  notify_assignee          BOOLEAN NOT NULL DEFAULT TRUE,
  notify_manager           BOOLEAN NOT NULL DEFAULT TRUE,
  notify_workspace_admin   BOOLEAN NOT NULL DEFAULT FALSE,

  -- Email vs in-app
  channel_in_app   BOOLEAN NOT NULL DEFAULT TRUE,
  channel_email    BOOLEAN NOT NULL DEFAULT FALSE,

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id)
);

ALTER TABLE task_aging_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members manage aging config"
  ON task_aging_config FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- ── In-app notifications table ────────────────────────────────────────────────
-- Used by aging engine AND other future system events.
CREATE TABLE IF NOT EXISTS task_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,                         -- recipient

  -- Classification
  type            TEXT NOT NULL CHECK (type IN (
    'task_overdue',
    'task_stale_todo',
    'task_stale_in_progress',
    'task_no_activity',
    'task_assigned',
    'task_completed',
    'task_reopened',
    'task_due_soon'
  )),
  priority        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high','critical')),

  -- Content
  title           TEXT NOT NULL,
  body            TEXT,
  link            TEXT,                                  -- e.g. /Admin/Tasks?task=<id>

  -- Linked entity
  task_id         UUID,
  task_title      TEXT,
  assignee_id     UUID,

  -- State
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  dismissed       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Dedup: prevent repeat notifications for same task+type within a window
  dedup_key       TEXT,                                  -- '{task_id}:{type}:{YYYY-WW}'
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(dedup_key)                                      -- silent ON CONFLICT DO NOTHING
);

ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;

-- Users see only their own notifications
CREATE POLICY "users see own notifications"
  ON task_notifications FOR SELECT
  USING (user_id = auth.uid());

-- System (service role) inserts notifications
CREATE POLICY "service role inserts notifications"
  ON task_notifications FOR INSERT
  WITH CHECK (TRUE);                                     -- service role bypasses RLS anyway

-- Users can update (mark read/dismissed) their own
CREATE POLICY "users update own notifications"
  ON task_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own
CREATE POLICY "users delete own notifications"
  ON task_notifications FOR DELETE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_notif_user_unread
  ON task_notifications(workspace_id, user_id, is_read, created_at DESC)
  WHERE dismissed = FALSE;

CREATE INDEX IF NOT EXISTS idx_task_notif_task
  ON task_notifications(task_id) WHERE task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_notif_dedup
  ON task_notifications(dedup_key) WHERE dedup_key IS NOT NULL;

-- ── Aging scan audit log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_aging_scan_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID,
  scanned_at      TIMESTAMPTZ DEFAULT NOW(),
  tasks_scanned   INTEGER DEFAULT 0,
  notifications_created INTEGER DEFAULT 0,
  duration_ms     INTEGER,
  error           TEXT
);

-- Keep last 30 scan records per workspace
CREATE INDEX IF NOT EXISTS idx_aging_scan_log_ws
  ON task_aging_scan_log(workspace_id, scanned_at DESC);

-- ── Default aging config for existing workspaces ──────────────────────────────
INSERT INTO task_aging_config (workspace_id)
SELECT id FROM workspaces
ON CONFLICT (workspace_id) DO NOTHING;
