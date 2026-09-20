CREATE TABLE study_events (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  device_id text NOT NULL CHECK (length(device_id) > 0),
  payload_hash text NOT NULL CHECK (length(payload_hash) = 64 AND payload_hash NOT GLOB '*[^a-f0-9]*'),
  payload_json text NOT NULL CHECK (
    json_valid(payload_json) AND json_type(payload_json, '$.dependsOnEventIds') IS 'array' AND
    json_type(payload_json, '$.attempts') IS 'array' AND
    json_extract(payload_json, '$.eventId') IS id AND
    json_extract(payload_json, '$.deviceId') IS device_id AND
    json_extract(payload_json, '$.lineId') IS line_id AND
    json_extract(payload_json, '$.lineRevisionId') IS line_revision_id AND
    json_extract(payload_json, '$.studyDate') IS study_date AND
    json_extract(payload_json, '$.studyTimezone') IS study_timezone AND
    json_extract(payload_json, '$.startedAt') IS started_at AND
    json_extract(payload_json, '$.completedAt') IS completed_at AND
    json_extract(payload_json, '$.sessionRef.kind') IS session_ref_kind AND
    json_extract(payload_json, '$.sessionRef.id') IS session_ref_id AND
    json_extract(payload_json, '$.itemRef.kind') IS item_ref_kind AND
    json_extract(payload_json, '$.itemRef.id') IS item_ref_id AND
    json_extract(payload_json, '$.packageId') IS package_id
  ),
  line_id text NOT NULL,
  line_revision_id text NOT NULL,
  study_date text NOT NULL CHECK (length(study_date) = 10 AND study_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(study_date) IS study_date),
  study_timezone text NOT NULL CHECK (length(study_timezone) > 0),
  started_at text NOT NULL,
  completed_at text NOT NULL CHECK (completed_at >= started_at),
  session_ref_kind text NOT NULL CHECK (session_ref_kind IN ('canonical', 'local')),
  session_ref_id text NOT NULL CHECK (length(session_ref_id) > 0),
  item_ref_kind text NOT NULL CHECK (item_ref_kind IN ('canonical', 'local')),
  item_ref_id text NOT NULL CHECK (length(item_ref_id) > 0),
  package_id text,
  received_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  UNIQUE (user_id, id),
  FOREIGN KEY (line_id, line_revision_id) REFERENCES line_revisions(line_id, revision_id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX study_events_user_received_idx ON study_events(user_id, received_at);
--> statement-breakpoint
CREATE TRIGGER study_events_canonical_owner BEFORE INSERT ON study_events
WHEN (NEW.session_ref_kind = 'canonical' AND NOT EXISTS (
    SELECT 1 FROM study_sessions WHERE user_id = NEW.user_id AND id = NEW.session_ref_id
  )) OR (NEW.item_ref_kind = 'canonical' AND NOT EXISTS (
    SELECT 1 FROM study_items WHERE user_id = NEW.user_id AND id = NEW.item_ref_id
      AND (NEW.session_ref_kind <> 'canonical' OR session_id = NEW.session_ref_id)
      AND line_id = NEW.line_id AND line_revision_id = NEW.line_revision_id
  ))
BEGIN SELECT raise(ABORT, 'canonical event reference is not owned or does not match line'); END;
--> statement-breakpoint
CREATE TRIGGER study_events_immutable_update BEFORE UPDATE ON study_events
BEGIN SELECT raise(ABORT, 'frozen event cannot change'); END;
--> statement-breakpoint
CREATE TRIGGER study_events_immutable_delete BEFORE DELETE ON study_events
BEGIN SELECT raise(ABORT, 'frozen event cannot be deleted'); END;
--> statement-breakpoint
CREATE TABLE move_attempts (
  user_id text NOT NULL,
  event_id text NOT NULL,
  ply integer NOT NULL CHECK (ply > 0),
  played_san text NOT NULL CHECK (length(played_san) > 0),
  elapsed_ms integer NOT NULL CHECK (elapsed_ms >= 0),
  expected_san text,
  is_correct integer CHECK (is_correct IN (0, 1)),
  PRIMARY KEY (user_id, event_id, ply),
  CHECK ((expected_san IS NULL AND is_correct IS NULL) OR (expected_san IS NOT NULL AND length(expected_san) > 0 AND is_correct IS NOT NULL)),
  FOREIGN KEY (user_id, event_id) REFERENCES study_events(user_id, id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TRIGGER move_attempts_match_report BEFORE INSERT ON move_attempts
WHEN NOT EXISTS (
  SELECT 1 FROM study_events e, json_each(e.payload_json, '$.attempts') a
  WHERE e.user_id = NEW.user_id AND e.id = NEW.event_id
    AND json_extract(a.value, '$.ply') = NEW.ply
    AND json_extract(a.value, '$.playedSan') = NEW.played_san
    AND json_extract(a.value, '$.elapsedMs') = NEW.elapsed_ms
)
BEGIN SELECT raise(ABORT, 'verified attempt differs from frozen report'); END;
--> statement-breakpoint
CREATE TRIGGER move_attempts_no_update BEFORE UPDATE ON move_attempts
BEGIN SELECT raise(ABORT, 'verified attempt is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER move_attempts_no_delete BEFORE DELETE ON move_attempts
BEGIN SELECT raise(ABORT, 'verified attempt is immutable'); END;
--> statement-breakpoint
CREATE TABLE study_event_dependencies (
  user_id text NOT NULL,
  event_id text NOT NULL,
  depends_on_event_id text NOT NULL CHECK (length(depends_on_event_id) > 0),
  PRIMARY KEY (user_id, event_id, depends_on_event_id),
  CHECK (event_id <> depends_on_event_id),
  FOREIGN KEY (user_id, event_id) REFERENCES study_events(user_id, id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX study_event_dependencies_parent_idx ON study_event_dependencies(user_id, depends_on_event_id);
--> statement-breakpoint
CREATE TRIGGER study_event_dependencies_validate BEFORE INSERT ON study_event_dependencies
BEGIN
  SELECT raise(ABORT, 'dependency is not declared in event payload') WHERE NOT EXISTS (
    SELECT 1 FROM study_events e, json_each(e.payload_json, '$.dependsOnEventIds') d
    WHERE e.user_id = NEW.user_id AND e.id = NEW.event_id AND d.type = 'text' AND d.value = NEW.depends_on_event_id
  );
  SELECT raise(ABORT, 'dependency belongs to another account')
    WHERE EXISTS (SELECT 1 FROM study_events WHERE id = NEW.depends_on_event_id AND user_id <> NEW.user_id);
  SELECT raise(ABORT, 'event dependency cycle') WHERE EXISTS (
    WITH RECURSIVE ancestors(id) AS (
      SELECT NEW.depends_on_event_id
      UNION
      SELECT d.depends_on_event_id FROM study_event_dependencies d JOIN ancestors a ON d.event_id = a.id WHERE d.user_id = NEW.user_id
    ) SELECT 1 FROM ancestors WHERE id = NEW.event_id
  );
END;
--> statement-breakpoint
CREATE TRIGGER study_event_dependencies_no_update BEFORE UPDATE ON study_event_dependencies
BEGIN SELECT raise(ABORT, 'event dependencies are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER study_event_dependencies_no_delete BEFORE DELETE ON study_event_dependencies
BEGIN SELECT raise(ABORT, 'event dependencies are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER study_events_pending_dependency_owner BEFORE INSERT ON study_events
WHEN EXISTS (SELECT 1 FROM study_event_dependencies WHERE depends_on_event_id = NEW.id AND user_id <> NEW.user_id)
BEGIN SELECT raise(ABORT, 'pending dependency belongs to another account'); END;
--> statement-breakpoint
CREATE TRIGGER study_events_materialize_dependencies AFTER INSERT ON study_events
BEGIN
  SELECT raise(ABORT, 'dependency IDs must be text') WHERE EXISTS (
    SELECT 1 FROM json_each(NEW.payload_json, '$.dependsOnEventIds') WHERE type <> 'text'
  );
  INSERT INTO study_event_dependencies (user_id, event_id, depends_on_event_id)
    SELECT NEW.user_id, NEW.id, value FROM json_each(NEW.payload_json, '$.dependsOnEventIds');
END;
--> statement-breakpoint
CREATE TABLE study_session_mappings (
  user_id text NOT NULL,
  device_id text NOT NULL CHECK (length(device_id) > 0),
  local_id text NOT NULL CHECK (length(local_id) > 0),
  session_id text NOT NULL,
  PRIMARY KEY (user_id, device_id, local_id),
  UNIQUE (user_id, device_id, local_id, session_id),
  FOREIGN KEY (user_id, session_id) REFERENCES study_sessions(user_id, id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE study_item_mappings (
  user_id text NOT NULL,
  device_id text NOT NULL CHECK (length(device_id) > 0),
  local_id text NOT NULL CHECK (length(local_id) > 0),
  local_session_id text NOT NULL,
  session_id text NOT NULL,
  item_id text NOT NULL,
  PRIMARY KEY (user_id, device_id, local_id),
  FOREIGN KEY (user_id, device_id, local_session_id, session_id) REFERENCES study_session_mappings(user_id, device_id, local_id, session_id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id, session_id, item_id) REFERENCES study_items(user_id, session_id, id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TRIGGER study_session_mappings_no_update BEFORE UPDATE ON study_session_mappings
BEGIN SELECT raise(ABORT, 'session mapping is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER study_session_mappings_no_delete BEFORE DELETE ON study_session_mappings
BEGIN SELECT raise(ABORT, 'session mapping is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER study_item_mappings_no_update BEFORE UPDATE ON study_item_mappings
BEGIN SELECT raise(ABORT, 'item mapping is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER study_item_mappings_no_delete BEFORE DELETE ON study_item_mappings
BEGIN SELECT raise(ABORT, 'item mapping is immutable'); END;
--> statement-breakpoint
CREATE TABLE event_decisions (
  event_id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('applied', 'practice', 'invalid')),
  reason text NOT NULL CHECK (
    (outcome = 'applied' AND reason = 'ACCEPTED') OR
    (outcome = 'practice' AND reason IN ('STALE_CARD', 'RESET_GENERATION', 'CONTENT_CHANGED', 'CONTENT_RETIRED', 'REPERTOIRE_INACTIVE', 'DEPENDENCY_PRACTICE', 'OUTSIDE_DAILY_PLAN', 'DELIVERY_EXPIRED', 'OUTSIDE_PACKAGE_WINDOW')) OR
    (outcome = 'invalid' AND reason IN ('DEPENDENCY_INVALID', 'INVALID_ATTEMPTS', 'INVALID_DATE', 'UNSUPPORTED_VERSION'))
  ),
  session_id text,
  item_id text,
  grade text CHECK (grade IN ('bad', 'mid', 'good')),
  decision_json text NOT NULL CHECK (
    json_valid(decision_json) AND json_extract(decision_json, '$.eventId') IS event_id AND
    json_extract(decision_json, '$.outcome') IS outcome AND
    json_extract(decision_json, '$.reason') IS reason AND
    json_extract(decision_json, '$.sessionId') IS session_id AND
    json_extract(decision_json, '$.itemId') IS item_id AND
    json_extract(decision_json, '$.grade') IS grade AND
    json_extract(decision_json, '$.accountRevision') IS account_revision AND
    json_extract(decision_json, '$.decidedAt') IS decided_at
  ),
  account_revision text NOT NULL CHECK (length(account_revision) > 0 AND account_revision NOT GLOB '*[^0-9]*' AND (account_revision = '0' OR substr(account_revision, 1, 1) <> '0')),
  decided_at text NOT NULL,
  CHECK (outcome <> 'applied' OR (session_id IS NOT NULL AND item_id IS NOT NULL AND grade IS NOT NULL)),
  CHECK (outcome <> 'invalid' OR grade IS NULL),
  CHECK (item_id IS NULL OR session_id IS NOT NULL),
  FOREIGN KEY (user_id, event_id) REFERENCES study_events(user_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id, session_id) REFERENCES study_sessions(user_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id, session_id, item_id) REFERENCES study_items(user_id, session_id, id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE UNIQUE INDEX event_decisions_applied_item_idx ON event_decisions(user_id, item_id) WHERE outcome = 'applied';
--> statement-breakpoint
CREATE TRIGGER event_decisions_applied_line BEFORE INSERT ON event_decisions
WHEN NEW.outcome = 'applied' AND NOT EXISTS (
  SELECT 1 FROM study_events e JOIN study_items i ON i.user_id = NEW.user_id AND i.id = NEW.item_id
  WHERE e.user_id = NEW.user_id AND e.id = NEW.event_id AND e.line_id = i.line_id AND e.line_revision_id = i.line_revision_id
)
BEGIN SELECT raise(ABORT, 'applied event does not match item line'); END;
--> statement-breakpoint
CREATE TRIGGER event_decisions_no_update BEFORE UPDATE ON event_decisions
BEGIN SELECT raise(ABORT, 'original decision is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER event_decisions_no_delete BEFORE DELETE ON event_decisions
BEGIN SELECT raise(ABORT, 'original decision is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER study_items_repeat_parent BEFORE INSERT ON study_items
WHEN NEW.parent_event_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM event_decisions d JOIN study_items p
    ON p.user_id = d.user_id AND p.session_id = d.session_id AND p.id = d.item_id
  WHERE d.user_id = NEW.user_id AND d.event_id = NEW.parent_event_id AND d.outcome = 'applied'
    AND p.session_id = NEW.session_id AND p.card_id = NEW.card_id AND p.line_id = NEW.line_id
    AND p.origin_type = NEW.origin_type AND NEW.attempt_number = p.attempt_number + 1
)
BEGIN SELECT raise(ABORT, 'repeat does not follow an applied parent'); END;
