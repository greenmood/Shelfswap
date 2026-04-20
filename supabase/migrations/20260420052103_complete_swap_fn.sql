-- complete_swap(p_swap_id, p_user_id)
--
-- Atomic "mark complete" for an accepted swap:
--   1. Flip swap_requests.status = 'completed' (CAS: only if currently
--      'accepted' AND caller is a party).
--   2. Flip both referenced books to is_available = false.
--
-- Both happen in one transaction because plpgsql functions run as a single
-- transactional unit by default. Returns the new status on success, null if
-- the CAS missed (state already changed, caller not a party, swap not found).
--
-- Called from /api/swaps/[id]/route.ts via the admin client (service_role).
-- SECURITY DEFINER so it can run regardless of callers' RLS; the query's own
-- WHERE clause enforces the party check.

create or replace function public.complete_swap(
  p_swap_id uuid,
  p_user_id uuid
)
returns swap_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested_book_id uuid;
  v_offered_book_id uuid;
begin
  update public.swap_requests
  set status = 'completed'
  where id = p_swap_id
    and status = 'accepted'
    and (requester_id = p_user_id or owner_id = p_user_id)
  returning requested_book_id, offered_book_id
  into v_requested_book_id, v_offered_book_id;

  if v_requested_book_id is null then
    -- CAS missed: either the swap isn't in 'accepted', the caller isn't a
    -- party, or the row doesn't exist. Return null so the caller can 409.
    return null;
  end if;

  update public.books
  set is_available = false
  where id in (v_requested_book_id, v_offered_book_id);

  return 'completed'::swap_status;
end;
$$;

grant execute on function public.complete_swap(uuid, uuid) to service_role;
