# Shelfswap v0 — Data Model

Postgres via Supabase. Minimal schema — five tables, no premature abstraction.

---

## `users`

Managed mostly by Supabase Auth; this table holds app-level profile data keyed to the auth user.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Matches `auth.users.id` |
| `email` | text, unique | Synced from auth |
| `first_name` | text | Shown to counterparty after mutual accept |
| `zip_code` | text | Used for discovery filter. Text, not int — leading zeros matter |
| `created_at` | timestamptz | Default `now()` |

No last name, no avatar, no bio. Add later if needed.

---

## `books`

One row per physical book a user owns. If someone has two copies, two rows — keeps the swap logic trivial.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `owner_id` | uuid (FK → users.id) | On delete cascade |
| `title` | text, not null | |
| `author` | text | |
| `cover_url` | text | From Open Library if available, else null |
| `condition` | enum (`good`, `worn`) | Default `good` |
| `is_available` | boolean | Default `true`. Flipped to `false` when a swap completes |
| `created_at` | timestamptz | |

**Indexes:** `owner_id`, and a trigram or `ilike` index on `title` + `author` for search. Don't over-engineer it; Postgres `ilike '%foo%'` is fine at this scale.

No ISBN column in v0 — it's nice to have but not load-bearing. Add when you wire up barcode scanning.

---

## `swap_requests`

The core transaction. One row per proposed swap.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `requested_book_id` | uuid (FK → books.id) | The book the requester wants |
| `offered_book_id` | uuid (FK → books.id) | The book the requester is offering in return |
| `requester_id` | uuid (FK → users.id) | Denormalized — equals `offered_book.owner_id` but makes queries easier |
| `owner_id` | uuid (FK → users.id) | Denormalized — equals `requested_book.owner_id` |
| `status` | enum | `pending`, `accepted`, `declined`, `completed`, `cancelled` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**State machine:**

```
pending ──accept──▶ accepted ──complete──▶ completed
   │                   │
   ├──decline──▶ declined
   └──cancel───▶ cancelled (requester backs out)
```

Only `accepted` triggers the email reveal. Only `completed` flips both books' `is_available` to `false`.

**Indexes:** `(owner_id, status)` and `(requester_id, status)` — these power the "my requests" and "requests for me" views.

---

## `email_log`

Not strictly needed, but at pet-project scale it's your only record of what happened if something goes wrong. Debugging lifesaver.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `to_user_id` | uuid (FK → users.id) | |
| `kind` | text | e.g. `swap_request`, `swap_accepted`, `swap_declined` |
| `swap_request_id` | uuid (FK → swap_requests.id, nullable) | |
| `sent_at` | timestamptz | |

---

## What I deliberately didn't add

- **`sessions` / `tokens`** — Supabase Auth handles it.
- **`conversations` / `messages`** — no chat.
- **`ratings`** — no ratings.
- **`exchanges` as a separate concept** — swap_requests already is the exchange. Collapsing the two is one of the bigger simplifications vs. the original PRD.
- **`wishlist`** — later.
- **`locations` table** — zip code on user is enough.

---

## Row-level security (Supabase)

A few RLS policies worth getting right early, because retrofitting them is painful:

- `books`: anyone authenticated can `SELECT` where `is_available = true`; only the owner can `INSERT`, `UPDATE`, `DELETE` their own rows.
- `users`: anyone authenticated can `SELECT` `id`, `first_name`, `zip_code` (not email); full row visible only to self and to the counterparty of an `accepted` swap.
- `swap_requests`: visible to `requester_id` and `owner_id` only. Status transitions enforced server-side, not via RLS — too much logic for a policy.

The email-reveal rule is the one piece of business logic that must live server-side (in a Supabase Edge Function or API route), because it's how you prevent scraping emails via the client.

---

## Rough sizing

At 100 users with 50 books each and 10 requests each:

- `users`: 100 rows
- `books`: 5,000 rows
- `swap_requests`: 1,000 rows
- `email_log`: ~3,000 rows

Postgres laughs at this. You're not going to hit a scaling wall with the data model — you'll hit one with people showing up, which is the correct problem to have.
