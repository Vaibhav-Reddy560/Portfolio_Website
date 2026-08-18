-- Small, separately-stored preview images for the admin designs list.
--
-- Designs are stored full-resolution and uncompressed (by design — see
-- src/lib/images.ts), which is right for what the portfolio serves but
-- means the admin list page was downloading the same multi-megabyte
-- originals just to render small management thumbnails, which was slow.
-- thumb_path points at a small, separately-generated derivative used only
-- in the admin UI; the original file at image_path is untouched.
alter table public.designs add column if not exists thumb_path text;
