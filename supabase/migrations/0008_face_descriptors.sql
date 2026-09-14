-- Replaces the single averaged face descriptor with a multi-view model.
--
-- 0006 stored one row holding one 128-d descriptor, produced by averaging
-- three samples taken ~500ms apart. That was weak in both directions: three
-- frames of the same pose average to essentially the same vector, adding no
-- robustness at all, and had the poses actually differed the mean would land
-- between them and sit close to neither. The result was a single reference
-- view, so any change in angle or lighting at sign-in pushed the distance up
-- and the match failed.
--
-- Enrollment now walks through several head positions and stores every
-- sample as its own row. Sign-in compares against all of them and keeps the
-- closest, which is how face-api's own FaceMatcher/LabeledFaceDescriptors is
-- designed to work, and roughly what phone face unlock does when it builds a
-- model from multiple angles.
--
-- Same access posture as 0007: RLS on, no policies at all, so the table is
-- unreachable by every client-facing role and only trusted server code
-- holding the secret key can read or write it. A face can't be rotated the
-- way a password can, so nothing holding a browser session should be able to
-- read these descriptors back or plant new ones.

create table if not exists public.face_descriptors (
  id          uuid primary key default gen_random_uuid(),
  descriptor  real[] not null,
  pose        text,
  created_at  timestamptz not null default now(),
  constraint face_descriptors_length check (array_length(descriptor, 1) = 128)
);

alter table public.face_descriptors enable row level security;

drop table if exists public.face_credentials;
