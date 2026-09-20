CREATE UNIQUE INDEX cards_user_id_line_idx ON cards(user_id, id, line_id);
--> statement-breakpoint
CREATE TABLE study_sessions (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  study_date text NOT NULL CHECK (length(study_date) = 10 AND study_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(study_date) IS study_date),
  settings_version text NOT NULL CHECK (length(settings_version) > 0 AND settings_version NOT GLOB '*[^0-9]*' AND (settings_version = '0' OR substr(settings_version, 1, 1) <> '0')),
  timezone text NOT NULL CHECK (length(timezone) > 0),
  new_lines_per_day integer NOT NULL CHECK (new_lines_per_day BETWEEN 1 AND 12),
  moves_per_block integer NOT NULL CHECK (moves_per_block BETWEEN 2 AND 10),
  plan_seed text NOT NULL CHECK (length(plan_seed) > 0),
  status text NOT NULL CHECK (status IN ('in_progress', 'completed')),
  created_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  UNIQUE (user_id, study_date),
  UNIQUE (user_id, id)
);
--> statement-breakpoint
CREATE TRIGGER study_sessions_snapshot_immutable BEFORE UPDATE OF user_id, study_date, settings_version, timezone, new_lines_per_day, moves_per_block, plan_seed ON study_sessions
BEGIN SELECT raise(ABORT, 'session plan and pedagogy are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER study_sessions_no_delete BEFORE DELETE ON study_sessions
BEGIN SELECT raise(ABORT, 'session history must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER study_sessions_complete_guard BEFORE UPDATE OF status ON study_sessions
WHEN (OLD.status = 'completed' AND NEW.status <> 'completed') OR
  (NEW.status = 'completed' AND EXISTS (SELECT 1 FROM study_items WHERE user_id = NEW.user_id AND session_id = NEW.id AND status = 'pending'))
BEGIN SELECT raise(ABORT, 'session cannot complete with pending items or reopen'); END;
--> statement-breakpoint
CREATE TABLE study_items (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  session_id text NOT NULL,
  card_id text NOT NULL,
  line_id text NOT NULL,
  line_revision_id text NOT NULL,
  logical_key text NOT NULL CHECK (length(logical_key) > 0),
  origin_type text NOT NULL CHECK (origin_type IN ('new', 'review')),
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  parent_event_id text,
  status text NOT NULL CHECK (status IN ('pending', 'graded', 'cancelled')),
  sort_order integer NOT NULL CHECK (sort_order >= 0),
  base_card_json text NOT NULL CHECK (json_valid(base_card_json) AND json_extract(base_card_json, '$.id') IS card_id AND json_extract(base_card_json, '$.lineId') IS line_id),
  effective_moves integer NOT NULL CHECK (effective_moves > 0),
  settings_version text NOT NULL CHECK (length(settings_version) > 0 AND settings_version NOT GLOB '*[^0-9]*' AND (settings_version = '0' OR substr(settings_version, 1, 1) <> '0')),
  moves_per_block integer NOT NULL CHECK (moves_per_block BETWEEN 2 AND 10),
  srs_version text NOT NULL CHECK (length(srs_version) > 0),
  created_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  CHECK ((attempt_number = 1 AND parent_event_id IS NULL) OR (attempt_number > 1 AND parent_event_id IS NOT NULL)),
  UNIQUE (user_id, id),
  UNIQUE (user_id, session_id, id),
  UNIQUE (user_id, session_id, logical_key),
  UNIQUE (user_id, session_id, sort_order),
  UNIQUE (user_id, session_id, line_id, attempt_number),
  FOREIGN KEY (user_id, session_id) REFERENCES study_sessions(user_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id, card_id, line_id) REFERENCES cards(user_id, id, line_id) ON DELETE RESTRICT,
  FOREIGN KEY (line_id, line_revision_id) REFERENCES line_revisions(line_id, revision_id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX study_items_pending_idx ON study_items(user_id, session_id, status, sort_order);
--> statement-breakpoint
CREATE TRIGGER study_items_snapshot_immutable BEFORE UPDATE OF user_id, session_id, card_id, line_id, line_revision_id, logical_key, origin_type, attempt_number, parent_event_id, sort_order, base_card_json, effective_moves, settings_version, moves_per_block, srs_version ON study_items
BEGIN SELECT raise(ABORT, 'item origin and snapshots are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER study_items_no_delete BEFORE DELETE ON study_items
BEGIN SELECT raise(ABORT, 'item history must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER study_items_status_guard BEFORE UPDATE OF status ON study_items
WHEN OLD.status <> 'pending' AND NEW.status <> OLD.status
BEGIN SELECT raise(ABORT, 'resolved item cannot change status'); END;
--> statement-breakpoint
CREATE TRIGGER study_items_completed_session_guard BEFORE INSERT ON study_items
WHEN EXISTS (SELECT 1 FROM study_sessions WHERE user_id = NEW.user_id AND id = NEW.session_id AND status = 'completed')
BEGIN SELECT raise(ABORT, 'completed session cannot receive items'); END;
