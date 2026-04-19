# Shelfswap v0 — Pet Project PRD

**Scope:** weekend-buildable, solo-operated, < 100 users
**Status:** Draft
**Last updated:** April 18, 2026

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
- Wishlists, recommendations, book clubs
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

## Risks you just accept

- **No moderation.** If someone misbehaves, you manually remove them. Fine at this scale.
- **No location filter.** Everyone sees all available books. Fine until a second city cluster emerges; add `city` field then.
- **Cold start is the whole game.** If you can't get five friends to join, no product decision fixes that.

---

## Consciously deferred

Borrow, native apps, chat, ratings, moderation, deposits, push, maps, recommendations, clubs, shipping, any second city.

Add only when real usage demands it.
