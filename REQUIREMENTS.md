# Badminton Event Coordination App — Requirements Document

**Version:** 1.0 (Draft)
**Status:** Requirements Refinement Phase

---

## 1. Product Overview

A mobile-first web application for organizing badminton games. The app handles participant coordination, waiting list management, and UPI payment tracking via UTR numbers. Venue booking and venue payment are handled **outside** the app.

**Target event size:** 20–36 participants per event.

---

## 2. User Roles

### 2.1 Host
- Creates and manages events
- Monitors participant lists and payment statuses
- Manages refund lifecycle post-deadline

### 2.2 Participant (User)
- Views event details
- Joins events by submitting UTR payment confirmation or expressing waiting list interest
- Can withdraw from events (subject to deadline rules)

---

## 3. Functional Requirements

### 3.1 Event Creation (Host)

| Field | Description |
|---|---|
| Venue | Name/location of the badminton venue |
| Date | Date of the event |
| Timings | Start and end time |
| Max Main List Size | Number of confirmed participant slots (20–36) |
| Waiting List Capacity | Maximum number of users allowed on the waiting list |
| Payment Per Head | Amount each main list participant must pay |
| UPI ID | Host's UPI ID displayed to participants for payment |
| Deadline | Cutoff datetime after which drops, additions, and refunds follow stricter rules |

### 3.2 Joining an Event (Participant)

1. Participant opens the app and views event details (venue, date, time, payment amount, UPI ID).
2. Participant makes payment **externally** via any UPI app to the displayed UPI ID.
3. Participant enters the **UTR (Unique Transaction Reference)** number in the app.
4. The **server-side timestamp** of UTR submission determines the participant's position in the main list.
5. If the main list is full at the time of UTR submission, the participant is **not** added and must be informed (see open question Q3 below).

### 3.3 Waiting List

1. Once the main list is full, additional users can **express interest** to join the waiting list.
2. Waiting list members do **not** pay upfront — they only register interest.
3. Waiting list order is determined by the **server-side timestamp** of interest registration.
4. Waiting list is capped at the host-defined waiting list capacity.

### 3.4 Main List Drop & Waiting List Promotion (Pre-Deadline)

1. A main list participant may **withdraw** before the deadline.
2. The **first person on the waiting list** is notified of the open slot.
3. The promoted waiting list member must pay and submit their UTR within a defined window (see open question Q5).
4. Upon UTR confirmation, the waiting list member is added to the main list.
5. The main list order updates to reflect the new member's confirmed position.
6. The withdrawn participant becomes eligible for a refund (processed post-deadline — see 3.6).

### 3.5 Post-Deadline Rules

- **No new drops allowed** — participants who withdraw post-deadline do **not** receive refunds.
- **No waiting list promotions** — the main list is frozen after the deadline.
- Post-deadline, if the main list is not full (due to pre-deadline drops that were not backfilled), remaining spots are simply unfilled.

### 3.6 Refund Rules

- Refunds for pre-deadline withdrawals are processed **only after**:
  1. The deadline has passed, **AND**
  2. All main list players are confirmed (i.e., every slot is either filled or explicitly unfillable)
- Refund processing is managed by the host **outside the app** (see open question Q7).
- The app tracks refund status: `pending` → `refunded`.

### 3.7 List Visibility

- Both the main list and waiting list (with ordering) should be visible to all participants.
- Payment status of each main list member should be visible to the host.

---

## 4. Participant State Transitions

```
[New User]
    │
    ├──(Main list has space + UTR submitted)──► MAIN_LIST_CONFIRMED
    │
    └──(Main list full + interest registered)──► WAITING_LIST
                                                     │
                          (Slot opens, notified)─────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
          (Pays within window)    (Does not pay in time)
                    │                       │
                    ▼                       ▼
          MAIN_LIST_CONFIRMED        WAITING_LIST_EXPIRED
                                    (next person notified)

MAIN_LIST_CONFIRMED
    │
    ├──(Withdraws pre-deadline)──► DROPPED_REFUND_PENDING ──► REFUNDED
    │
    └──(Withdraws post-deadline)──► DROPPED_NO_REFUND
```

---

## 5. Payment Status Tracking

| Status | Meaning |
|---|---|
| `not_required` | Waiting list member — no payment needed yet |
| `pending` | Waiting list member promoted — payment expected |
| `confirmed` | UTR submitted and accepted |
| `refund_pending` | Dropped pre-deadline — refund owed but not yet processed |
| `refunded` | Refund completed |
| `forfeited` | Dropped post-deadline — no refund |

---

## 6. Business Rules Summary

| # | Rule |
|---|---|
| BR-1 | Main list order is determined by server-side timestamp of UTR submission |
| BR-2 | Waiting list order is determined by server-side timestamp of interest registration |
| BR-3 | Waiting list members do not pay upfront |
| BR-4 | When a main list member drops pre-deadline, the first waiting list member is notified |
| BR-5 | Promoted waiting list member must pay within a defined time window |
| BR-6 | Post-deadline: no drops with refund, no waiting list promotions |
| BR-7 | Refunds are processed only after deadline passes AND all slots are confirmed |
| BR-8 | Event capacity is between 20 and 36 participants |

---

## 7. Open Questions & Gaps

These items need clarification before moving to design/technical phases:

### Participant Flow
**Q1.** Is there any **authentication/login** requirement, or can users join events via a shared link without accounts?

**Q2.** Can a host **edit event details** (venue, time, payment amount) after creation? If so, until when?

**Q3.** If the main list is full and a participant has **already made a UPI payment** but tries to submit a UTR — what happens? They've already paid externally. Does the app warn them before UTR entry that the list is full? Or are they auto-added to the waiting list with their UTR recorded?

**Q4.** Can a participant be on the **waiting list for multiple events** simultaneously? Can they be on the **main list of multiple events**?

### Waiting List Promotion
**Q5.** When a waiting list member is promoted, how long do they have to **complete payment**? Is there a configurable time window (e.g., 1 hour, 2 hours)? What happens if they don't pay in time — does the slot go to the next person?

**Q6.** How is the promoted waiting list member **notified**? (Push notification, SMS, WhatsApp, in-app only?)

### Payments & Refunds
**Q7.** Are refunds processed **within the app** (automated UPI refund) or **manually by the host** outside the app? If manual, does the app just track refund status?

**Q8.** Is there any **UTR validation** — does the app verify the UTR against actual UPI transaction records, or is it trust-based (participant self-reports)?

**Q9.** What prevents a participant from entering a **fake/duplicate UTR**? Is duplicate UTR detection needed?

### Event Lifecycle
**Q10.** What happens **after the event date passes**? Is there an archive/history view? Does the event auto-close?

**Q11.** Can a host **cancel an entire event**? If so, what is the refund policy for all confirmed participants?

**Q12.** Can there be **multiple hosts / co-hosts** for a single event?

### Edge Cases
**Q13.** If a waiting list member is promoted but the **deadline passes** before they can pay — what happens? Is their promotion voided?

**Q14.** What if **multiple main list members drop simultaneously** — are multiple waiting list members notified at once, or sequentially?

**Q15.** Is there a minimum number of participants required for an event to proceed? If too many drop and the event becomes unviable, is there a cancellation flow?

**Q16.** Can a **waiting list member voluntarily leave** the waiting list?

---

## 8. Out of Scope (Confirmed)

- Venue booking and venue payment
- In-app UPI payment processing (payments happen externally)
- Chat/messaging between participants
- Recurring/repeating event scheduling (unless specified)

---

*This document captures requirements as understood. All items in Section 7 (Open Questions) should be resolved before proceeding to technical design.*
