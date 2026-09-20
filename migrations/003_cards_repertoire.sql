CREATE UNIQUE INDEX lines_id_opening_idx ON lines(id, opening_id);
--> statement-breakpoint
CREATE TABLE user_openings (
  user_id text NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  opening_id text NOT NULL REFERENCES openings(id) ON DELETE RESTRICT,
  color text NOT NULL CHECK (color IN ('white', 'black')),
  active integer NOT NULL CHECK (active IN (0, 1)),
  version text NOT NULL CHECK (length(version) > 0 AND version NOT GLOB '*[^0-9]*' AND (version = '0' OR substr(version, 1, 1) <> '0')),
  created_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  PRIMARY KEY (user_id, opening_id),
  UNIQUE (user_id, opening_id, color)
);
--> statement-breakpoint
CREATE INDEX user_openings_active_idx ON user_openings(user_id, active);
--> statement-breakpoint
CREATE TRIGGER user_openings_playable_insert BEFORE INSERT ON user_openings
WHEN NOT EXISTS (SELECT 1 FROM openings WHERE id = NEW.opening_id AND
  ((NEW.color = 'white' AND playable_white = 1) OR (NEW.color = 'black' AND playable_black = 1)))
BEGIN SELECT raise(ABORT, 'opening does not allow color'); END;
--> statement-breakpoint
CREATE TRIGGER user_openings_playable_update BEFORE UPDATE OF opening_id, color ON user_openings
WHEN NOT EXISTS (SELECT 1 FROM openings WHERE id = NEW.opening_id AND
  ((NEW.color = 'white' AND playable_white = 1) OR (NEW.color = 'black' AND playable_black = 1)))
BEGIN SELECT raise(ABORT, 'opening does not allow color'); END;
--> statement-breakpoint
CREATE TRIGGER user_openings_no_delete BEFORE DELETE ON user_openings
BEGIN SELECT raise(ABORT, 'repertoire history must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER user_openings_version_monotonic BEFORE UPDATE OF version ON user_openings
WHEN length(NEW.version) < length(OLD.version)
  OR (length(NEW.version) = length(OLD.version) AND NEW.version < OLD.version)
BEGIN SELECT raise(ABORT, 'repertoire version cannot decrease'); END;
--> statement-breakpoint
CREATE TABLE cards (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  opening_id text NOT NULL,
  line_id text NOT NULL,
  color text NOT NULL CHECK (color IN ('white', 'black')),
  generation text NOT NULL CHECK (length(generation) > 0),
  content_generation text NOT NULL CHECK (length(content_generation) > 0),
  version text NOT NULL CHECK (length(version) > 0 AND version NOT GLOB '*[^0-9]*' AND (version = '0' OR substr(version, 1, 1) <> '0')),
  state text NOT NULL CHECK (state IN ('new', 'review')),
  unlocked_moves integer NOT NULL CHECK (unlocked_moves > 0),
  interval_days text NOT NULL CHECK (
    length(interval_days) >= 4 AND substr(interval_days, -3, 1) = '.' AND
    substr(interval_days, -2) NOT GLOB '*[^0-9]*' AND
    substr(interval_days, 1, length(interval_days) - 3) NOT GLOB '*[^0-9]*' AND
    (substr(interval_days, 1, 1) <> '0' OR length(interval_days) = 4)
  ),
  due_date text NOT NULL CHECK (length(due_date) = 10 AND due_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  reps integer NOT NULL CHECK (reps >= 0),
  lapses integer NOT NULL CHECK (lapses >= 0),
  last_grade text CHECK (last_grade IN ('bad', 'mid', 'good')),
  created_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  UNIQUE (user_id, line_id),
  UNIQUE (user_id, id),
  FOREIGN KEY (line_id, opening_id) REFERENCES lines(id, opening_id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id, opening_id, color) REFERENCES user_openings(user_id, opening_id, color) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
);
--> statement-breakpoint
CREATE INDEX cards_due_idx ON cards(user_id, state, due_date);
--> statement-breakpoint
CREATE TRIGGER cards_version_monotonic BEFORE UPDATE OF version ON cards
WHEN length(NEW.version) < length(OLD.version)
  OR (length(NEW.version) = length(OLD.version) AND NEW.version < OLD.version)
BEGIN SELECT raise(ABORT, 'card version cannot decrease'); END;
