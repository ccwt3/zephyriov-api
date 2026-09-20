CREATE TABLE user (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified integer NOT NULL DEFAULT 0,
  image text,
  created_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);
--> statement-breakpoint
CREATE TABLE session (
  id text PRIMARY KEY NOT NULL,
  expires_at integer NOT NULL,
  token text NOT NULL UNIQUE,
  created_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at integer NOT NULL,
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX session_userId_idx ON session(user_id);
--> statement-breakpoint
CREATE TABLE account (
  id text PRIMARY KEY NOT NULL,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at integer,
  refresh_token_expires_at integer,
  scope text,
  password text,
  created_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX account_userId_idx ON account(user_id);
--> statement-breakpoint
CREATE TABLE verification (
  id text PRIMARY KEY NOT NULL,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at integer NOT NULL,
  created_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);
--> statement-breakpoint
CREATE INDEX verification_identifier_idx ON verification(identifier);
--> statement-breakpoint
CREATE TABLE profiles (
  user_id text PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  settings_version text NOT NULL CHECK (length(settings_version) > 0 AND settings_version NOT GLOB '*[^0-9]*' AND (settings_version = '0' OR substr(settings_version, 1, 1) <> '0')),
  timezone text NOT NULL CHECK (length(timezone) > 0),
  new_lines_per_day integer NOT NULL CHECK (new_lines_per_day BETWEEN 1 AND 12),
  moves_per_block integer NOT NULL CHECK (moves_per_block BETWEEN 2 AND 10),
  onboarded_at integer,
  created_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);
--> statement-breakpoint
CREATE TABLE settings_revisions (
  user_id text NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  version text NOT NULL CHECK (length(version) > 0 AND version NOT GLOB '*[^0-9]*' AND (version = '0' OR substr(version, 1, 1) <> '0')),
  timezone text NOT NULL CHECK (length(timezone) > 0),
  new_lines_per_day integer NOT NULL CHECK (new_lines_per_day BETWEEN 1 AND 12),
  moves_per_block integer NOT NULL CHECK (moves_per_block BETWEEN 2 AND 10),
  created_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  PRIMARY KEY (user_id, version)
);
--> statement-breakpoint
CREATE TABLE account_revisions (
  user_id text PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  revision text NOT NULL DEFAULT '0' CHECK (length(revision) > 0 AND revision NOT GLOB '*[^0-9]*' AND (revision = '0' OR substr(revision, 1, 1) <> '0')),
  updated_at integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);
--> statement-breakpoint
CREATE TRIGGER settings_revisions_no_update BEFORE UPDATE ON settings_revisions
BEGIN SELECT raise(ABORT, 'settings revision is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER settings_revisions_no_delete BEFORE DELETE ON settings_revisions
BEGIN SELECT raise(ABORT, 'settings revision is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER account_revisions_monotonic BEFORE UPDATE OF revision ON account_revisions
WHEN length(NEW.revision) < length(OLD.revision)
  OR (length(NEW.revision) = length(OLD.revision) AND NEW.revision < OLD.revision)
BEGIN SELECT raise(ABORT, 'account revision cannot decrease'); END;
