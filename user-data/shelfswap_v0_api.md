# Shelfswap v0 — API Routes & Queries

Next.js route handlers + Supabase. The guiding rule: **read paths go direct from the client via Supabase + RLS; writes and anything privacy-sensitive go through server routes.**

---

## Route map

| Method | Path | Who handles it | Why |
|---|---|---|---|
| POST | (Supabase magic link) | Supabase | Auth is solved |
| GET | `/api/me` | Server | Merge auth + profile cleanly |
| PATCH | `/api/me` | Server | Validate handles, require at least one |
| — | `books` table reads/writes | Client direct | RLS is sufficient |
| GET | `/api/book-lookup?q=` | Server | Proxy Open Library (avoid CORS, cache) |
| POST | `/api/swaps` | Server | Creates row + triggers email |
| GET | `swap_requests` (my incoming/outgoing) | Client direct | RLS scopes to me |
| PATCH | `/api/swaps/:id` | Server | State machine + emails + book flip |
| GET | `/api/swaps/:id/counterparty` | Server | Gatekeeps email reveal |

That's the whole surface. Nine endpoints, most trivial.

---

## Client-direct queries (via Supabase JS)

### My library
```ts
const { data } = await supabase
  .from('books')
  .select('id, title, author, cover_url, condition, is_available, created_at')
  .eq('owner_id', user.id)
  .order('created_at', { ascending: false });
```

### Add a book
```ts
await supabase.from('books').insert({
  owner_id: user.id,
  title, author, cover_url, condition: 'good', is_available: true,
});
```

RLS policy (`insert`) ensures `owner_id = auth.uid()`. Don't trust the client to set it honestly — enforce in the policy.

### Discovery feed (not mine, available)
v0 has no location filter, so the view is a thin convenience layer that joins `users` for the owner's first name.

```sql
create view discoverable_books as
select b.id, b.title, b.author, b.cover_url, b.condition,
       b.owner_id, u.first_name as owner_first_name
from books b
join users u on u.id = b.owner_id
where b.is_available = true;
```

Then from the client:
```ts
const { data } = await supabase
  .from('discoverable_books')
  .select('*')
  .neq('owner_id', user.id)
  .order('created_at', { ascending: false })
  .limit(50);
```

### Search (title or author)
```ts
const { data } = await supabase
  .from('discoverable_books')
  .select('*')
  .neq('owner_id', user.id)
  .or(`title.ilike.%${q}%,author.ilike.%${q}%`);
```

At a few thousand rows, `ilike` is fine. Add a trigram index only when it starts feeling slow.

### My swap requests
```ts
// incoming (people asking for my books)
await supabase
  .from('swap_requests')
  .select(`
    id, status, created_at,
    requested_book:requested_book_id ( title, author ),
    offered_book:offered_book_id ( title, author ),
    requester:requester_id ( first_name )
  `)
  .eq('owner_id', user.id)
  .order('created_at', { ascending: false });

// outgoing — same query with eq('requester_id', user.id)
```

---

## Server routes

### POST `/api/swaps` — create a swap request

```ts
// pseudocode
const { requested_book_id, offered_book_id } = body;

// 1. Verify offered book belongs to requester
// 2. Verify requested book does NOT belong to requester
// 3. Verify both books are is_available = true
// 4. Verify no existing pending request for this pair
// 5. Insert row with status='pending', denormalize requester_id + owner_id
// 6. Email the owner
// 7. Log to email_log
```

Validations 1–4 prevent the obvious abuse: requesting your own book, proposing a book you don't own, double-requests.

### PATCH `/api/swaps/:id` — state transitions

One endpoint, action in the body:

```ts
// body: { action: 'accept' | 'decline' | 'cancel' | 'complete' }
```

Allowed transitions (server enforces):

| From | Action | By | To |
|---|---|---|---|
| `pending` | `accept` | owner | `accepted` |
| `pending` | `decline` | owner | `declined` |
| `pending` | `cancel` | requester | `cancelled` |
| `accepted` | `complete` | either party | `completed` |

On `accept`: send email to requester with "it's a match, check the app for their contact."
On `complete`: inside a transaction, set status to `completed` **and** flip `is_available = false` on both books.

```sql
begin;
update swap_requests
  set status = 'completed', updated_at = now()
  where id = $1
    and status = 'accepted'
    and (requester_id = $user or owner_id = $user)
  returning requested_book_id, offered_book_id;

update books
  set is_available = false
  where id in ($requested_book_id, $offered_book_id);
commit;
```

If `update swap_requests` returns zero rows, abort — either the swap isn't in the right state or the caller isn't a party to it.

### GET `/api/swaps/:id/counterparty` — the email reveal

This is the single most security-sensitive route in the app. Everything else can be screwed up and recovered; leaking emails cannot.

```sql
select
  case when sr.requester_id = $caller then u_owner.first_name     else u_req.first_name     end as first_name,
  case when sr.requester_id = $caller then u_owner.email          else u_req.email          end as email
from swap_requests sr
join users u_req on u_req.id = sr.requester_id
join users u_owner on u_owner.id = sr.owner_id
where sr.id = $swap_id
  and sr.status in ('accepted', 'completed')
  and (sr.requester_id = $caller or sr.owner_id = $caller);
```

If zero rows: return 404. Never return a differentiated error ("not accepted yet" vs "not your swap") — that's an oracle.

### GET `/api/book-lookup?q=` — Open Library proxy

```ts
const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=5`);
const json = await res.json();
return json.docs.map(d => ({
  title: d.title,
  author: d.author_name?.[0],
  cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
}));
```

Cache in memory or Vercel KV for a day. Open Library is generous but don't hammer it.

---

## RLS policies — the minimum set

```sql
-- users
create policy "read limited profile" on users
  for select using (true);  -- first_name only exposed via views/columns; email and handles server-only

create policy "update own profile" on users
  for update using (id = auth.uid());

-- books
create policy "read available books" on books
  for select using (is_available = true or owner_id = auth.uid());

create policy "insert own books" on books
  for insert with check (owner_id = auth.uid());

create policy "modify own books" on books
  for update using (owner_id = auth.uid());

create policy "delete own books" on books
  for delete using (owner_id = auth.uid());

-- swap_requests
create policy "read my swaps" on swap_requests
  for select using (requester_id = auth.uid() or owner_id = auth.uid());

-- no insert/update policies on swap_requests —
-- server routes use the service role key to bypass RLS for writes
```

The last line matters: **don't let the client write to `swap_requests` directly.** That table's state machine is too easy to corrupt with a cleverly crafted client call. Server-only writes.

For the `users` table, because `email` is a column, you have two options: (1) hide `email` from the base table via a view that omits it, or (2) accept that RLS on `users.email` is complex and keep `email` out of any client query. Option 2 is simpler.

---

## Gotchas I'd expect to hit

- **Handle normalization.** Strip leading `@` on Telegram/Instagram; accept/reject `whatsapp` against E.164 (`^\+[1-9]\d{7,14}$`) after stripping spaces and dashes. Users will paste with and without prefixes.
- **Double-accepts.** Owner accepts, then `PATCH` fires again before UI updates. The `and status = 'pending'` guard in the SQL handles it; just make sure the client treats "zero rows updated" as success (already done) rather than error.
- **Orphaned swap requests.** If a book is deleted while a swap is pending, the FK cascade nukes the swap. That's probably fine — but consider a soft-delete on books if it starts mattering.
- **Email bounces.** With email as the whole coordination channel, a bad email address silently breaks the flow. Postmark/Resend both expose webhooks for bounces — log them to `email_log` and surface in the UI later.

---

## What I did NOT sketch

No webhook handlers, no background jobs, no rate limits, no CSRF specifics. All reasonable to skip at pet-project scale; revisit if you open it up beyond friends-and-neighbors.
