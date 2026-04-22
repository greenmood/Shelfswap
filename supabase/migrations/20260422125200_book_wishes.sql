-- book_wishes: hearts / "Want this" signal (v0.1 — Matching).
--
-- Privacy: a wish row is readable only by the wisher. Counts per book are
-- exposed separately via a SECURITY DEFINER view so owners see demand
-- without identities. No update path — hearts toggle via insert/delete.

create table public.book_wishes (
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

-- PK leading on user_id covers "my wishes" lookups; add a book-side index
-- for the aggregate count view.
create index book_wishes_book_id_idx on public.book_wishes (book_id);

alter table public.book_wishes enable row level security;

create policy book_wishes_select_own on public.book_wishes
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy book_wishes_insert_own on public.book_wishes
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy book_wishes_delete_own on public.book_wishes
  for delete to authenticated
  using (user_id = (select auth.uid()));
