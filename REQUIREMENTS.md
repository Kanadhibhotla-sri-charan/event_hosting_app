# Badminton Event Coordination App — Requirements Document

**Version:** 1.1
**Status:** Requirements Refinement Phase — Open Questions Resolved

---

## 1. Product Overview

A mobile-first web application for organizing badminton games. The app handles participant coordination, waiting list management, and UPI payment tracking via UTR numbers. Venue booking and venue payment are handled **outside** the app.

**Target event size:** 20–36 participants per event.

---

## 2. User Roles

### 2.1 Host (& Co-Hosts)
- Creates and manages events
- Can assign co-hosts with equivalent management permissions
- Monitors participant lists and payment statuses
- Manages refund lifecycle post-deadline
- Can edit event details anytime **before the deadline**
- Can cancel an entire event (triggers refunds for all confirmed participants)
- Sets event auto-close time at event creation

### 2.2 Participant (User)
- Views event details
- Joins events by submitting UTR payment confirmation or expressing waiting list interest
- Can withdraw from events (subject to deadline rules)
- Can participate in multiple events simultaneously (main list or waiting list)
- Can voluntarily leave the waiting list at any time

---

## 3. Authentication

Two authentication modes are supported:

### 3.1 Regular Account
- One-time registration with phone number + OTP verification
- Password-based login for returning sessions
- Persistent profile across all events
- Recommended for frequent players

### 3.2 Temporary (Guest) Account
- Phone number + OTP verification per session
- Lightweight — no persistent profile
- Suitable for one-time or infrequent participants

**Suggestion:** For both modes, phone number + OTP should be the primary auth method (since UPI payments are phone-linked, this creates a natural identity anchor). Passwords can be optional for regular accounts as a convenience for returning users. This keeps onboarding friction low while maintaining identity linkage to payments.

---

## 4. Functional Requirements

### 4.1 Event Creation (Host)

| Field | Description |
|---|---|
| Venue | Name/location of the badminton venue |
| Date | Date of the event |
| Timings | Start and end time |
| Max Main List Size | Number of confirmed participant slots (20–36) |
| Waiting List Capacity | Maximum number of users allowed on the waiting list |
| Payment Per Head | Amount each main list participant must pay |
| UPI ID | Host's UPI ID displayed to participants for payment |
| Deadline | Cutoff datetime for drops/promotions (typically consistent across game days so users learn the pattern) |
| Event Auto-Close Time | Datetime after which event is automatically archived (set by host at creation) |
| Co-Hosts | Optional list of users with host-level permissions for this event |

**Editability:** Host can edit all event details **anytime before the deadline**. Post-deadline, event details are frozen.

### 4.2 Joining an Event (Participant)

1. Participant opens the app and views event details (venue, date, time, payment amount, UPI ID).
2. Participant makes payment **externally** via any UPI app to the displayed UPI ID.
3. Participant enters the **UTR (Unique Transaction Reference)** number in the app.
4. The **server-side timestamp** of UTR submission determines the participant's position in the main list.
5. **Slot reservation:** If the main list is nearly full (e.g., last few slots), when a participant initiates UTR entry, a slot is **reserved for 10 minutes**. If UTR is not submitted within 10 minutes, the reservation expires and the slot reopens.

### 4.3 Waiting List

1. Once the main list is full (and no reserved slots available), additional users can **express interest** to join the waiting list.
2. Waiting list members do **not** pay upfront — they only register interest.
3. Waiting list order is determined by the **server-side timestamp** of interest registration.
4. Waiting list is capped at the host-defined waiting list capacity.
5. A waiting list member can **voluntarily leave** at any time; the list re-orders automatically.

### 4.4 Main List Drop & Waiting List Promotion (Pre-Deadline)

1. A main list participant may **withdraw** before the deadline.
2. If multiple members drop simultaneously, **all corresponding waiting list members are notified at once**, but strict waiting list order is maintained (first in line gets first slot, second gets second, etc.).
3. The promoted waiting list member must pay and submit their UTR within a **dynamic time window** (see Section 4.5).
4. If the promoted member does **not** pay within the window, their promotion expires and the **next waiting list member** is notified.
5. Upon UTR confirmation, the waiting list member is added to the main list.
6. The withdrawn participant becomes eligible for a refund (processed post-deadline — see 4.7).

### 4.5 Promotion Payment Window (Dynamic)

The time given to a promoted waiting list member to complete payment scales based on how close the event is:

| Time Until Event Start | Payment Window |
|---|---|
| > 24 hours | 2 hours |
| 6–24 hours | 1 hour |
| 2–6 hours | 30 minutes |
| < 2 hours | 15 minutes |

**Suggestion:** These are recommended defaults. Could be made host-configurable in a future version. The key principle is: the closer the event, the shorter the window, to avoid slots going empty.

### 4.6 Post-Deadline Rules

- **No new drops with refund** — participants who withdraw post-deadline do **not** receive refunds.
- **No waiting list promotions** — the main list is frozen after the deadline.
- **Promotion-in-progress at deadline:** Left to the host's discretion. Host can manually approve or void the in-progress promotion.
- Post-deadline, if the main list is not full (due to pre-deadline drops that were not backfilled), remaining spots are simply unfilled.

### 4.7 Refund Rules

- Refunds for pre-deadline withdrawals are processed **only after**:
  1. The deadline has passed, **AND**
  2. All main list players are confirmed (i.e., every slot is either filled or explicitly unfillable)
- **Event cancellation by host:** All confirmed participants receive refunds (same conditions apply).
- **Phase 1 (MVP):** Refunds tracked in-app, processed manually by host outside the app. App tracks status: `refund_pending` → `refunded`.
- **Phase 2 (Future):** Automated in-app UPI refund processing (pending complexity assessment).

### 4.8 UTR Validation

- **Phase 1 (MVP):** Trust-based with **duplicate detection**.
  - Participant self-reports the UTR number.
  - App checks for **duplicate UTR entries** across all events — rejects duplicates.
  - UTR format validation (standard UTR is 12-digit alphanumeric).
  - Host can flag/dispute suspicious UTRs manually.
- **Phase 2 (Future):** Automated UTR verification against UPI transaction records via payment gateway API (pending feasibility and cost assessment).

**Suggestion:** Duplicate detection + format validation covers the most common abuse vectors at low complexity. Full UPI verification requires payment gateway integration which adds significant scope — better suited for a later phase.

### 4.9 List Visibility

- Both the main list and waiting list (with ordering) should be visible to all participants.
- Payment status of each main list member should be visible to the host (and co-hosts).

### 4.10 Notifications

- **Push notifications** for: slot promotion, payment window reminders, event updates, deadline reminders.
- WhatsApp communication is handled **externally** by the host/group — not part of the app.

### 4.11 Event Lifecycle

1. **Created** → Host sets up event, visible to participants.
2. **Open** → Participants join main list / waiting list.
3. **Deadline Passed** → Main list frozen, refund processing begins.
4. **In Progress** → Event is happening.
5. **Auto-Closed** → Event auto-closes at the host-defined auto-close time.
6. **Archived** → Event moves to history view, accessible by all past participants and host.
7. **Cancelled** → Host cancels event at any point; triggers refund flow for all confirmed participants.

---

## 5. Participant State Transitions

```
[New User]
    │
    ├──(Main list has space)──► SLOT_RESERVED (10 min to submit UTR)
    │                               │
    │                    ┌──────────┴──────────┐
    │                    │                     │
    │          (UTR submitted in time)  (10 min expires)
    │                    │                     │
    │                    ▼                     ▼
    │          MAIN_LIST_CONFIRMED      RESERVATION_EXPIRED
    │                                   (slot reopens)
    │
    └──(Main list full + interest registered)──► WAITING_LIST
                                                     │
                    (Slot opens, notified)────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
          (Pays within window)    (Does not pay in time)
                    │                       │
                    ▼                       ▼
          MAIN_LIST_CONFIRMED        PROMOTION_EXPIRED
                                    (next person notified)

WAITING_LIST
    │
    └──(Voluntarily leaves)──► REMOVED (list re-orders)

MAIN_LIST_CONFIRMED
    │
    ├──(Withdraws pre-deadline)──► DROPPED_REFUND_PENDING ──► REFUNDED
    │
    └──(Withdraws post-deadline)──► DROPPED_NO_REFUND

EVENT_CANCELLED (by host)
    │
    └──(All confirmed members)──► REFUND_PENDING ──► REFUNDED
```

---

## 6. Payment Status Tracking

| Status | Meaning |
|---|---|
| `not_required` | Waiting list member — no payment needed yet |
| `awaiting_utr` | Slot reserved or promoted — UTR submission expected within time window |
| `confirmed` | UTR submitted and accepted |
| `refund_pending` | Dropped pre-deadline or event cancelled — refund owed but not yet processed |
| `refunded` | Refund completed |
| `forfeited` | Dropped post-deadline — no refund |

---

## 7. Business Rules Summary

| # | Rule |
|---|---|
| BR-1 | Main list order is determined by server-side timestamp of UTR submission |
| BR-2 | Waiting list order is determined by server-side timestamp of interest registration |
| BR-3 | Waiting list members do not pay upfront |
| BR-4 | When a main list member drops pre-deadline, the first waiting list member is notified |
| BR-5 | Promoted waiting list member must pay within a dynamic time window based on proximity to event |
| BR-6 | Post-deadline: no drops with refund, no waiting list promotions |
| BR-7 | Refunds are processed only after deadline passes AND all slots are confirmed |
| BR-8 | Event capacity is between 20 and 36 participants |
| BR-9 | Slot reservation lasts 10 minutes for UTR submission when main list is nearly full |
| BR-10 | Duplicate UTR numbers are rejected across all events |
| BR-11 | Host can edit event details anytime before the deadline |
| BR-12 | Multiple simultaneous drops notify multiple waiting list members at once, in strict order |
| BR-13 | Waiting list auto-reorders when a member voluntarily leaves |
| BR-14 | Events auto-close at host-defined time and move to archive |
| BR-15 | Host can cancel an event at any time; all confirmed participants receive refunds |
| BR-16 | Participants can be on main/waiting lists of multiple events simultaneously |

---

## 8. Resolved Questions

| # | Question | Resolution |
|---|---|---|
| Q1 | Authentication | Two modes: Regular (persistent account, phone+OTP+password) and Temporary (phone+OTP per session) |
| Q2 | Host editing | Allowed anytime before deadline; frozen after deadline |
| Q3 | Full list + payment already made | 10-minute slot reservation when initiating UTR entry prevents race condition |
| Q4 | Multi-event participation | Yes — participants can be on main/waiting lists of multiple events; order based on timestamps |
| Q5 | Promotion payment window | Dynamic: 2hr / 1hr / 30min / 15min based on time until event. Expires → next person notified |
| Q6 | Notification channels | Push notifications + WhatsApp for critical alerts |
| Q7 | Refund processing | Phase 1: manual (tracked in-app). Phase 2: automated in-app UPI refunds |
| Q8 | UTR validation | Phase 1: trust-based + duplicate detection + format validation. Phase 2: UPI gateway verification |
| Q9 | Fake/duplicate UTR | Duplicate detection across all events + format validation in Phase 1 |
| Q10 | Post-event lifecycle | Host sets auto-close time at creation; event auto-closes and archives |
| Q11 | Event cancellation | Yes, host can cancel; all confirmed participants get refunds |
| Q12 | Co-hosts | Yes, multiple co-hosts supported with equivalent permissions |
| Q13 | Promotion vs deadline | Left to host discretion for in-progress promotions at deadline |
| Q14 | Simultaneous drops | All corresponding WL members notified at once, strict order maintained |
| Q15 | Minimum participants | No enforced minimum; host can manually cancel if event becomes unviable |
| Q16 | WL voluntary leave | Yes, list auto-reorders |

---

## 9. Out of Scope (Confirmed)

- Venue booking and venue payment
- In-app UPI payment processing (Phase 1 — payments happen externally)
- Chat/messaging between participants
- WhatsApp integration (handled externally by host/group)
- Automated UTR verification via payment gateway (Phase 1 — deferred to Phase 2)
- Automated in-app refund processing (Phase 1 — deferred to Phase 2)

---

## 10. Resolved New Considerations

| # | Consideration | Resolution |
|---|---|---|
| NC-1 | Co-Host Permission Model | Co-hosts have **identical permissions** as the host. No tiered permission levels — keep it simple. |
| NC-2 | WhatsApp Integration | WhatsApp is **completely independent** of the app. Not integrated — handled externally by the host/group. No technical scope for the app. |
| NC-3 | Slot Reservation Visibility | Yes — all main list and waiting list slots with their **confirmation status** are visible to all users (transparent model). |
| NC-4 | Host Discretion UX | Simple approve/void controls for in-progress promotions at deadline. UI should surface required features cleanly — no over-engineering. |
| NC-5 | Event Recurrence / Templates | **Yes** — recurring event template feature is valuable. Hosts can create templates (e.g., "Every Saturday, same venue, same deadline offset") to quickly spin up recurring game days. |
| NC-6 | Minimum Payment Window Floor | Not a concern in practice — **deadline closes well before event time** (20+ min buffer is the agreed norm). Post-deadline, everything is frozen. Edge cases at deadline boundary are handled by host discretion (NC-4 / Q13). |

---

## 11. Additional Business Rules (from NC resolutions)

| # | Rule |
|---|---|
| BR-17 | Co-hosts have identical permissions to the host (no tiered access) |
| BR-18 | WhatsApp notifications are out of app scope — managed externally |
| BR-19 | All slot statuses (main list + waiting list + confirmation state) are visible to all participants |
| BR-20 | Hosts can create recurring event templates with pre-filled venue, deadline offset, and defaults |

---

*All open questions and new considerations have been resolved. This document is ready for technical design phase.*
