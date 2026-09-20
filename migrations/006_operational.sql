CREATE TABLE offline_packages (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  device_id text NOT NULL CHECK (length(device_id) > 0),
  issued_at integer NOT NULL,
  expires_at integer NOT NULL CHECK (expires_at = issued_at + 604800000),
  submit_until integer NOT NULL CHECK (submit_until = expires_at + 604800000),
  base_account_revision text NOT NULL CHECK (length(base_account_revision) > 0 AND base_account_revision NOT GLOB '*[^0-9]*' AND (base_account_revision = '0' OR substr(base_account_revision, 1, 1) <> '0')),
  manifest_id text NOT NULL REFERENCES catalog_manifests(id) ON DELETE RESTRICT,
  srs_version text NOT NULL CHECK (length(srs_version) > 0),
  content_hash text NOT NULL CHECK (length(content_hash) = 64 AND content_hash NOT GLOB '*[^a-f0-9]*'),
  payload_json text NOT NULL CHECK (
    json_valid(payload_json) AND
    json_extract(payload_json, '$.id') IS id AND
    json_extract(payload_json, '$.deviceId') IS device_id AND
    json_extract(payload_json, '$.contentHash') IS content_hash
  ),
  UNIQUE (user_id, id)
);
--> statement-breakpoint
CREATE INDEX offline_packages_user_device_issued_idx ON offline_packages(user_id, device_id, issued_at DESC);
--> statement-breakpoint
CREATE TRIGGER offline_packages_immutable_update BEFORE UPDATE ON offline_packages
BEGIN SELECT raise(ABORT, 'issued package is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER offline_packages_immutable_delete BEFORE DELETE ON offline_packages
BEGIN SELECT raise(ABORT, 'issued package must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER study_events_package_owner BEFORE INSERT ON study_events
WHEN NEW.package_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM offline_packages WHERE id = NEW.package_id AND user_id = NEW.user_id AND device_id = NEW.device_id
)
BEGIN SELECT raise(ABORT, 'event package belongs to another account or device'); END;
--> statement-breakpoint
CREATE TABLE activity_days (
  user_id text NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  study_date text NOT NULL CHECK (length(study_date) = 10 AND study_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(study_date) IS study_date),
  completed_blocks integer NOT NULL CHECK (completed_blocks > 0),
  distinct_lines integer NOT NULL CHECK (distinct_lines > 0 AND distinct_lines <= completed_blocks),
  updated_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  PRIMARY KEY (user_id, study_date)
);
--> statement-breakpoint
CREATE INDEX activity_days_user_date_idx ON activity_days(user_id, study_date DESC);
--> statement-breakpoint
CREATE TRIGGER activity_days_monotonic BEFORE UPDATE ON activity_days
WHEN NEW.user_id IS NOT OLD.user_id OR NEW.study_date IS NOT OLD.study_date OR
  NEW.completed_blocks < OLD.completed_blocks OR NEW.distinct_lines < OLD.distinct_lines
BEGIN SELECT raise(ABORT, 'activity day cannot move or decrease'); END;
--> statement-breakpoint
CREATE TABLE rate_limit_buckets (
  scope text NOT NULL CHECK (length(scope) > 0),
  subject_key text NOT NULL CHECK (length(subject_key) > 0),
  user_id text REFERENCES user(id) ON DELETE RESTRICT,
  window_start integer NOT NULL,
  window_end integer NOT NULL CHECK (window_end > window_start),
  used integer NOT NULL CHECK (used >= 0 AND used <= limit_count),
  limit_count integer NOT NULL CHECK (limit_count > 0),
  PRIMARY KEY (scope, subject_key, window_start),
  CHECK ((scope IN ('read', 'study', 'batch', 'ticket') AND user_id IS NOT NULL AND subject_key = user_id)
    OR (scope NOT IN ('read', 'study', 'batch', 'ticket') AND user_id IS NULL))
);
--> statement-breakpoint
CREATE INDEX rate_limit_buckets_user_window_idx ON rate_limit_buckets(user_id, window_end);
--> statement-breakpoint
CREATE TRIGGER rate_limit_buckets_monotonic BEFORE UPDATE ON rate_limit_buckets
WHEN NEW.scope IS NOT OLD.scope OR NEW.subject_key IS NOT OLD.subject_key OR
  NEW.user_id IS NOT OLD.user_id OR NEW.window_start IS NOT OLD.window_start OR
  NEW.window_end IS NOT OLD.window_end OR NEW.limit_count IS NOT OLD.limit_count OR NEW.used < OLD.used
BEGIN SELECT raise(ABORT, 'rate bucket cannot change identity, window, limit or reset count'); END;
--> statement-breakpoint
CREATE TABLE realtime_tickets (
  ticket_hash text PRIMARY KEY NOT NULL CHECK (length(ticket_hash) = 64 AND ticket_hash NOT GLOB '*[^a-f0-9]*'),
  user_id text NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  auth_session_id text NOT NULL,
  issued_at integer NOT NULL,
  expires_at integer NOT NULL CHECK (expires_at = issued_at + 30000),
  consumed_at integer CHECK (consumed_at IS NULL OR (consumed_at >= issued_at AND consumed_at < expires_at))
);
--> statement-breakpoint
CREATE INDEX realtime_tickets_user_expiry_idx ON realtime_tickets(user_id, expires_at);
--> statement-breakpoint
CREATE TRIGGER realtime_tickets_session_owner BEFORE INSERT ON realtime_tickets
WHEN NOT EXISTS (SELECT 1 FROM session WHERE id = NEW.auth_session_id AND user_id = NEW.user_id)
BEGIN SELECT raise(ABORT, 'ticket Auth session is not owned by account'); END;
--> statement-breakpoint
CREATE TRIGGER realtime_tickets_immutable_update BEFORE UPDATE ON realtime_tickets
WHEN NEW.ticket_hash IS NOT OLD.ticket_hash OR NEW.user_id IS NOT OLD.user_id OR
  NEW.auth_session_id IS NOT OLD.auth_session_id OR NEW.issued_at IS NOT OLD.issued_at OR
  NEW.expires_at IS NOT OLD.expires_at OR OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL
BEGIN SELECT raise(ABORT, 'ticket may only be consumed once'); END;
--> statement-breakpoint
CREATE TRIGGER realtime_tickets_no_delete BEFORE DELETE ON realtime_tickets
BEGIN SELECT raise(ABORT, 'ticket history must be retained'); END;
