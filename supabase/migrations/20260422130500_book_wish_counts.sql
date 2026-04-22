-- book_wish_counts: aggregate hearts per book, safe to expose publicly.
-- Default (DEFINER) security so the view can aggregate all book_wishes rows
-- regardless of the caller's RLS. No identity is surfaced — just the count.
--
-- discoverable_books is rebuilt to carry wish_count on each row so clients
-- can render "N people want this" without a second round trip.

create view public.book_wish_counts as
select book_id, count(*) as wish_count
from public.book_wishes
group by book_id;

grant select on public.book_wish_counts to authenticated, anon;

drop view if exists public.discoverable_books;

create view public.discoverable_books
with (security_invoker = true) as
select
  b.id,
  b.title,
  b.author,
  b.cover_url,
  b.condition,
  b.is_available,
  b.created_at,
  b.owner_id,
  p.first_name as owner_first_name,
  coalesce(w.wish_count, 0) as wish_count
from public.books b
join public.public_profiles p on p.id = b.owner_id
left join public.book_wish_counts w on w.book_id = b.id
where b.is_available = true;
