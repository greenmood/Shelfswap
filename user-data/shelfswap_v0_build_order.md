# Shelfswap v0 — Build Order Checklist

Three scope updates from the prior docs:

**Tab bar: 3 tabs.** Library · Discover · Swaps. Profile and settings live behind a gear icon on the Library tab. No standalone "Me" tab.

**Handle reveal instead of email.** Users add WhatsApp, Telegram, and/or Instagram to their profile (at least one required). On accepted swap, the counterparty sees whichever handles they chose to share. Email stays under the hood for auth and transactional notifications — never shown to other users.

This is actually a better coordination model than email. People reply on WhatsApp in 5 minutes and on email in 3 days. Trade-off you accept: zero visibility into how coordination goes, and WhatsApp handles are phone numbers, which are sensitive. Telegram and Instagram usernames are safer defaults — maybe order them that way in the UI.

**No zip code / location filter in v0.** Product targets Ukraine, where zip codes aren't a meaningful locality signal. Discovery shows every available book across all users. If a second city cluster emerges organically, revisit with a `city` field — but don't pre-build it.

---

## Data model delta

Add nullable text columns to `users`:
- `whatsapp` — E.164 phone, e.g. `+14155551234`
- `telegram` — username without `@`
- `instagram` — username without `@`

Validation: at least one non-null at profile save. Enforce in the server route, not via a DB check constraint — it's simpler to evolve.

The `counterparty` API route now returns handle fields instead of `email`. Everything else in the prior API doc stands.

---

## Week 1 — Foundation

**Goal:** you can sign in, save a profile with handles, and land on an empty library.

- [x] Next.js (App Router) project, deployed blank to Vercel
- [x] Supabase project created, env vars wired
- [x] Schema: `users`, `books`, `swap_requests`, `email_log` (+ handle fields)
- [x] RLS policies per the API doc
- [x] Magic link auth: `/login` → email → `/app`
- [x] Auth guard redirecting unauthenticated users
- [x] Profile page: first name, three handle inputs, save
- [x] Gear icon in Library top-right opens profile

**Don't:** write any book code, any swap code, any UI polish. Get auth solid before anything else — it's the load-bearing beam.

---

## Week 2 — My Library

**Goal:** you personally can build a real catalog. If you stop here, you have a working personal book tracker.

- [x] `/api/book-lookup` proxy to Open Library (cache 24h)
- [x] Add book: search → pick result → set condition → save
- [x] Manual entry fallback path
- [x] Library list: covers, titles, author, availability pill
- [ ] One-tap availability toggle
- [ ] Edit and delete
- [ ] Empty state with "Add your first book" CTA

**Don't:** Discover, requests, any notification work.

**Checkpoint:** catalog 20 of your own books in under 10 minutes. If the flow is painful at 20, it'll be poison at 50. Fix it here before moving on.

---

## Week 3 — Discover

**Goal:** you can see what's nearby, not just what's yours.

- [ ] `discoverable_books` Postgres view
- [ ] Discover feed: not-mine + available, paginated
- [ ] Search: `ilike` on title/author
- [ ] Two filter chips: all / fiction (don't overthink)
- [ ] Book detail screen: cover, title, author, condition, owner first name
- [ ] Owner profile click-through shows first name + handle previews (no email)

**Don't:** propose-swap flow yet. Discover should feel solid on its own. Bugs you catch now (wrong books appearing, slow search, broken covers) are cheaper to fix without a swap flow sitting on top.

---

## Week 4 — Swap

The complicated week. Budget it accordingly — this is where half the interesting bugs live.

- [ ] `POST /api/swaps` with all five validations from the API doc
- [ ] Propose-swap screen: radio list of my available books, "You want / Offer in return" layout
- [ ] Transactional email to owner on new request
- [ ] My Swaps tab: incoming/outgoing segmented control, status pills
- [ ] Swap detail screen (pending state)
- [ ] `PATCH /api/swaps/:id` with accept/decline/cancel state machine
- [ ] Transactional email on status change
- [ ] Handle reveal via `/api/swaps/:id/counterparty` — only when status in (`accepted`, `completed`)
- [ ] Swap detail (accepted state): handles with tap-to-open deep links
- [ ] Mark complete: transactional status flip + both books to `is_available = false`

Deep link patterns:
- WhatsApp: `https://wa.me/14155551234` (phone, no plus, no spaces)
- Telegram: `https://t.me/username`
- Instagram: `https://instagram.com/username`

**Don't:** edit a swap, counter-propose, chat, return dates, ratings.

---

## Week 5 — Ship

The week that separates projects from products.

- [ ] Empty states on every list (library, discover, swaps × 2)
- [ ] Loading states on every async action
- [ ] Error states on contested state transitions (accepting a cancelled swap)
- [ ] Email deliverability test: Gmail, Outlook, iCloud, Proton
- [ ] Tap-to-open handle links verified on iOS and Android mobile web
- [ ] Open Graph meta tags so shared links preview well
- [ ] Custom domain
- [ ] Ship link to 3 friends with a short "here's why" note

---

## Ship criteria

You're done when all three are true:

1. You cataloged **20 books in under 10 minutes**.
2. **Three real humans** have accounts and at least 5 books each.
3. **One real swap** completed end-to-end without you hotfixing anything.

If all three: you made a thing. Decide what's next based on real usage, not speculation.

---

## Explicitly not in v0 — resist each one

Borrow flow · in-app chat · ratings · counter-proposals · multi-book swaps · push notifications · native apps · wishlists · recommendations · maps · shipping · city filtering · moderation tooling · analytics beyond Vercel's built-ins.

All reasonable eventually. None is the thing blocking your first real swap.

---

## After ship — observe for 4 weeks before adding anything

What you *think* users want and what they *actually ask for* diverge fast. Sit with the data.

Rough rules for what deserves build time later:

- **"I'd lend but not give away" →** borrow flow
- **"I don't want to share my WhatsApp" →** in-app messaging (you'll regret this; build it only when repeatedly asked)
- **"Is this person trustworthy?" →** ratings
- **"Tell me when someone nearby lists X" →** wishlist + email alerts
- **"I want to use this in [other city]" →** add a `city` field and per-city filter; the moment a second cluster emerges organically, lean in

If nobody asks for any of these — that's also a signal. Maybe v0 is the right shape of product and what it needs is more users, not more features.
