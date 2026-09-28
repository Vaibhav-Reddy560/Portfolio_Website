-- The repository behind a project, shown as a second button beside the live-site
-- link on its case study.
--
-- Kept separate from href rather than folded into it: href points at the running
-- product for someone who wants to use it, repo_url at the source for someone who
-- wants to read it, and most projects have both. A project with only source (no
-- deployed site) leaves href null and still gets its repo button.
alter table public.projects add column if not exists repo_url text;
