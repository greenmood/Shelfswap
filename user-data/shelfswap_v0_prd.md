# Shelfswap v0 — Pet Project PRD

**Scope:** weekend-buildable, solo-operated, < 100 users
**Status:** v0 shipping · v0.1 (matching) planned
**Last updated:** April 22, 2026

---

## What it is

A web app where I and a small cluster of friends can list books from our home shelves and arrange swaps. Start invite-based — trust comes from the social graph, not from a location filter.

---

## What's in

1. **Auth** — email magic link. No passwords to manage.
2. **Home library** — users add books manually: title, author, condition (Good / Worn), optional cover. Title autocomplete via Open Library if it's quick to wire up; plain text fields otherwise.
3. **Availability toggle** — each book is either _available to swap_ or _not_.
4. **Discovery** — feed of available books across all users. No location filter in v0 (product targets Ukraine, where zip codes aren't meaningful). Text search on title and author.
5. **Swap request** — requester picks one of their own books to offer in return. Owner sees the pair: "Alex wants _Klara and the Sun_ and is offering _Piranesi_."
6. **Mutual accept → handle reveal** — on accept, both users see each other's first name and whichever handles (WhatsApp / Telegram / Instagram) the counterparty chose to share. They coordinate handoff off-platform on the channel they already use. Email stays under the hood for auth and transactional notifications — never shown to other users.
7. **Close out** — either party taps "done." That's the whole lifecycle.

---

## What's explicitly out

- Borrow flow (return dates, reminders, disputes — too much)
- Native apps — mobile web only
- In-app chat — handle reveal instead (WhatsApp / Telegram / Instagram)
- Push notifications — transactional emails only
- Barcode scanning
- Maps or geocoding
- Ratings, reviews, moderation pipeline
- Recommendations, book clubs (see v0.1 for the lightweight wishlist / hearts cut)
- Shipping, payments, deposits

---

## Stack (boring + free)

- Next.js on Vercel — free tier
- Supabase for DB + auth — free tier
- Resend or Postmark for transactional email — free tier
- Open Library API for cover lookup — free

Estimated monthly cost at this scale: **$0.**

---

## Success = did it happen

Not metrics-driven. Three concrete checkpoints:

1. I can add 20 books to my own library in under 10 minutes.
2. At least 3 real humans (friends, neighbors) sign up and list books.
3. At least 1 real swap completes end-to-end.

If those hit, it's working. Decide what's next from there.

---

## v0.1 — Matching (next)

v0 works: friends list books, find each other's books, negotiate swaps. The live friction point is the Propose screen — the proposer has to guess which of their own books the owner actually wants. Matching removes the guesswork.

### What's in

1. **Hearts** — one-tap "Want this" on any book in Discover, the book detail screen, or another user's profile. That is the whole wishlist; no separate curation flow.
2. **Reciprocal match on Propose** — the requester's available books are sectioned and ranked:
   - **They want these** — books the owner hearted on your shelf (preselected)
   - **Likely matches** — books whose title or author they've hearted elsewhere
   - **Your other available books** — collapsed by default
3. **Wished-for badge** on incoming swap detail — the owner sees "You wished for this" on the offered book, making accept a no-brainer.
4. **My wishes** — a list of hearted books, each with a "Propose" shortcut when the owner has something swappable.
5. **Match banner** on Library when a two-sided match exists: _"Anna has 2 books you've hearted, and she wants 1 of yours."_

### Privacy model

Hearts inherit v0's anonymity pattern. Owners see **aggregate** heart counts on their books ("3 people want this") — never names. Identity is revealed only when a hearter proposes an actual swap, same gating as handle reveal.

### What's still out

- Genre/tag wants (keyword-level wishlist) — revisit only if hearts don't catch
- Collaborative-filtering recommendations
- Wanting books nobody has listed yet
- Email or push alerts for new-listing matches (defer — revisit for v0.2)
- Heart decay / "still want this?" prompts

### Success = one match-driven swap

Add one checkpoint to v0's three: at least one swap proposed from the "They want these" or "Likely matches" section. If nobody uses hearts in four weeks, kill the feature.

---

## Risks you just accept

- **No moderation.** If someone misbehaves, you manually remove them. Fine at this scale.
- **No location filter.** Everyone sees all available books. Fine until a second city cluster emerges; add `city` field then.
- **Cold start is the whole game.** If you can't get five friends to join, no product decision fixes that.

---

## Consciously deferred

Borrow, native apps, chat, ratings, moderation, deposits, push, maps, collaborative recommendations, clubs, shipping, any second city.

Add only when real usage demands it.
