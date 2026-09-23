-- Subscribers bulk-imported from the org's XLSX (admin panel "ייבוא מנויים
-- מקובץ") come with no gender information — nobody knows which of the ~900
-- rows are men and which are women. They're still created with a
-- placeholder gender_track (the column stays NOT NULL, so every lesson/RLS
-- lookup keeps working unchanged), but flagged track_confirmed = false so
-- the app asks the person to pick their own track on first entry.
--
-- Default true: every existing profile, and every self-registered one
-- (who already chose a track on the sign-up form), is unaffected.
alter table profiles add column track_confirmed boolean not null default true;

-- Users pick/confirm their own track from the app — extend the column
-- grant from 20260713000017 so they can flip this flag alongside
-- gender_track itself.
grant update (track_confirmed) on profiles to authenticated;
