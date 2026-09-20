CREATE TABLE openings (
  id text PRIMARY KEY NOT NULL,
  slug text NOT NULL UNIQUE CHECK (length(slug) > 0 AND slug NOT GLOB '*[^a-z0-9-]*'
    AND slug NOT LIKE '-%' AND slug NOT LIKE '%-' AND slug NOT LIKE '%--%'),
  name text NOT NULL CHECK (length(name) > 0),
  eco text NOT NULL CHECK (length(eco) = 3 AND substr(eco, 1, 1) GLOB '[A-E]' AND substr(eco, 2) GLOB '[0-9][0-9]'),
  playable_white integer NOT NULL CHECK (playable_white IN (0, 1)),
  playable_black integer NOT NULL CHECK (playable_black IN (0, 1)),
  created_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  CHECK (playable_white + playable_black > 0)
);
--> statement-breakpoint
CREATE TABLE lines (
  id text PRIMARY KEY NOT NULL,
  opening_id text NOT NULL REFERENCES openings(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(name) > 0),
  created_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);
--> statement-breakpoint
CREATE INDEX lines_opening_idx ON lines(opening_id);
--> statement-breakpoint
CREATE TABLE line_revisions (
  revision_id text PRIMARY KEY NOT NULL,
  line_id text NOT NULL REFERENCES lines(id) ON DELETE RESTRICT,
  moves_json text NOT NULL CHECK (json_valid(moves_json) AND json_type(moves_json) = 'array'),
  references_json text NOT NULL CHECK (json_valid(references_json) AND json_type(references_json) = 'array'),
  moves_hash text NOT NULL CHECK (length(moves_hash) = 64 AND moves_hash NOT GLOB '*[^a-f0-9]*'),
  content_hash text NOT NULL CHECK (length(content_hash) = 64 AND content_hash NOT GLOB '*[^a-f0-9]*'),
  sequence_generation integer NOT NULL CHECK (sequence_generation > 0),
  white_moves integer NOT NULL CHECK (white_moves >= 0),
  black_moves integer NOT NULL CHECK (black_moves >= 0),
  created_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  UNIQUE (line_id, revision_id)
);
--> statement-breakpoint
CREATE INDEX line_revisions_line_hash_idx ON line_revisions(line_id, content_hash);
--> statement-breakpoint
CREATE TRIGGER line_revisions_no_update BEFORE UPDATE ON line_revisions
BEGIN SELECT raise(ABORT, 'line revision is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER line_revisions_no_delete BEFORE DELETE ON line_revisions
BEGIN SELECT raise(ABORT, 'line revision is immutable'); END;
--> statement-breakpoint
CREATE TABLE catalog_manifests (
  id text PRIMARY KEY NOT NULL,
  status text NOT NULL DEFAULT 'staging' CHECK (status IN ('staging', 'validated', 'active', 'superseded')),
  expected_line_count integer NOT NULL CHECK (expected_line_count > 0),
  created_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);
--> statement-breakpoint
CREATE TABLE manifest_lines (
  manifest_id text NOT NULL REFERENCES catalog_manifests(id) ON DELETE RESTRICT,
  line_id text NOT NULL REFERENCES lines(id) ON DELETE RESTRICT,
  revision_id text NOT NULL,
  opening_sort_order integer NOT NULL DEFAULT 0 CHECK (opening_sort_order >= 0),
  sort_order integer NOT NULL CHECK (sort_order >= 0),
  active integer NOT NULL CHECK (active IN (0, 1)),
  PRIMARY KEY (manifest_id, line_id),
  FOREIGN KEY (line_id, revision_id) REFERENCES line_revisions(line_id, revision_id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX manifest_lines_order_idx ON manifest_lines(manifest_id, opening_sort_order, sort_order, line_id);
--> statement-breakpoint
CREATE TRIGGER manifest_lines_staging_insert BEFORE INSERT ON manifest_lines
WHEN (SELECT status FROM catalog_manifests WHERE id = NEW.manifest_id) <> 'staging'
BEGIN SELECT raise(ABORT, 'manifest is sealed'); END;
--> statement-breakpoint
CREATE TRIGGER manifest_lines_staging_update BEFORE UPDATE ON manifest_lines
WHEN (SELECT status FROM catalog_manifests WHERE id = OLD.manifest_id) <> 'staging'
  OR (SELECT status FROM catalog_manifests WHERE id = NEW.manifest_id) <> 'staging'
BEGIN SELECT raise(ABORT, 'manifest is sealed'); END;
--> statement-breakpoint
CREATE TRIGGER manifest_lines_staging_delete BEFORE DELETE ON manifest_lines
WHEN (SELECT status FROM catalog_manifests WHERE id = OLD.manifest_id) <> 'staging'
BEGIN SELECT raise(ABORT, 'manifest is sealed'); END;
--> statement-breakpoint
CREATE TRIGGER catalog_manifests_seal BEFORE UPDATE OF status ON catalog_manifests
WHEN (OLD.status = 'staging' AND NEW.status = 'validated' AND
      ((SELECT count(*) FROM manifest_lines WHERE manifest_id = OLD.id) <> OLD.expected_line_count
        OR NEW.expected_line_count <> OLD.expected_line_count
        OR EXISTS (
          SELECT 1 FROM manifest_lines ml JOIN lines l ON l.id = ml.line_id
          WHERE ml.manifest_id = OLD.id GROUP BY l.opening_id
          HAVING count(DISTINCT ml.opening_sort_order) > 1
        )))
  OR (OLD.status = 'staging' AND NEW.status <> 'validated')
  OR (OLD.status = 'validated' AND NEW.status NOT IN ('validated', 'active'))
  OR (OLD.status = 'active' AND NEW.status NOT IN ('active', 'superseded'))
  OR (OLD.status = 'superseded' AND NEW.status <> 'superseded')
BEGIN SELECT raise(ABORT, 'invalid manifest transition or count'); END;
--> statement-breakpoint
CREATE TRIGGER catalog_manifests_fixed_contents BEFORE UPDATE OF id, expected_line_count ON catalog_manifests
WHEN OLD.status <> 'staging'
BEGIN SELECT raise(ABORT, 'sealed manifest is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER catalog_manifests_head_state BEFORE UPDATE OF status ON catalog_manifests
WHEN NEW.status = 'superseded' AND EXISTS (SELECT 1 FROM catalog_head WHERE manifest_id = OLD.id)
BEGIN SELECT raise(ABORT, 'active head cannot be superseded'); END;
--> statement-breakpoint
CREATE TRIGGER catalog_manifests_no_delete BEFORE DELETE ON catalog_manifests
WHEN OLD.status <> 'staging'
BEGIN SELECT raise(ABORT, 'sealed manifest is immutable'); END;
--> statement-breakpoint
CREATE TABLE catalog_head (
  singleton integer PRIMARY KEY NOT NULL CHECK (singleton = 1),
  manifest_id text NOT NULL REFERENCES catalog_manifests(id) ON DELETE RESTRICT,
  updated_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);
--> statement-breakpoint
CREATE TRIGGER catalog_head_ready_insert BEFORE INSERT ON catalog_head
WHEN NOT EXISTS (
  SELECT 1 FROM catalog_manifests m WHERE m.id = NEW.manifest_id
    AND m.status IN ('validated', 'active')
    AND m.expected_line_count = (SELECT count(*) FROM manifest_lines WHERE manifest_id = m.id)
)
BEGIN SELECT raise(ABORT, 'manifest is not ready'); END;
--> statement-breakpoint
CREATE TRIGGER catalog_head_ready_update BEFORE UPDATE OF manifest_id ON catalog_head
WHEN NOT EXISTS (
  SELECT 1 FROM catalog_manifests m WHERE m.id = NEW.manifest_id
    AND m.status IN ('validated', 'active')
    AND m.expected_line_count = (SELECT count(*) FROM manifest_lines WHERE manifest_id = m.id)
)
BEGIN SELECT raise(ABORT, 'manifest is not ready'); END;
--> statement-breakpoint
CREATE TRIGGER catalog_head_no_delete BEFORE DELETE ON catalog_head
BEGIN SELECT raise(ABORT, 'catalog head cannot be deleted'); END;
