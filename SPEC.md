# Crumb — Product Spec

Crumb is a local-first companion app for home sourdough bakers. It tracks your starter,
adapts recipes to how you actually bake, models how long each step of a bake takes, and can
schedule a bake backwards from a target time or forwards from "right now." All data is
stored on-device (IndexedDB via Dexie) — there is no account and no server.

This spec covers product behavior only. It intentionally says nothing about UI layout or
visual design.

---

## 1. Starter Tracking

Goal: let the user log what they actually did when feeding their starter, see that history,
and get a recommendation for what to do next.

### 1.1 Logging a feeding

- A feeding record captures: timestamp, ratio of starter:flour:water (e.g. 1:1:1, 1:5:5),
  flour type(s) used (e.g. whole wheat, white bread flour, rye — multiple flours with
  proportions allowed), and resulting hydration percentage.
- Hydration is derived from the ratio, not entered separately: `hydration % = water weight /
  flour weight * 100`. If the user enters absolute weights instead of a ratio, hydration is
  computed the same way.
- The user can optionally record where the starter is being stored after this feeding:
  counter (room temperature) or fridge.
- A feeding can be edited or deleted after the fact. Editing recalculates derived fields
  (hydration) rather than leaving them stale.

### 1.2 Recording peak

- The user can mark when a starter peaked relative to a specific feeding (i.e., "this
  feeding peaked at this timestamp").
- From a peak timestamp and its feeding's timestamp, the app computes and stores
  **time-to-peak** for that feeding.
- Time-to-peak observations accumulate per starter and are the primary signal for
  starter activity/strength used elsewhere (e.g. the timing engine, section 3).

### 1.3 Feeding history

- The user can view a chronological list of past feedings for a starter, each showing its
  ratio, flour type(s), hydration, storage location, and time-to-peak if recorded.
- The history is filterable/sortable by date at minimum.
- If a starter has no feedings yet, the app states that clearly rather than showing an
  empty list with no explanation.

### 1.4 Next feeding recommendation

- Given a starter's current state, the app recommends: **when** to feed next and **what
  ratio** to feed.
- Inputs to the recommendation:
  - **Storage**: a counter-stored starter is recommended a sooner next feeding than a
    fridge-stored one (fridge slows fermentation and extends the safe interval between
    feedings).
  - **Intended next use**: the user indicates what they want to do with the starter next —
    bake soon (e.g. "I want to bake tomorrow morning"), maintain only (no near-term bake),
    or build up a larger quantity (need more total starter weight). Each intent changes the
    recommended ratio:
    - Bake soon: ratio sized to have enough active starter at peak, timed so peak aligns
      with when the user wants to mix dough.
    - Maintain only: a small maintenance ratio (e.g. 1:1:1) that's cheap on flour and gives
      a flexible peak window.
    - Build up: a larger ratio that increases total starter mass.
  - **Observed time-to-peak history** (section 1.2): a starter that has been peaking faster
    or slower than the recommendation's assumption shifts the recommended next-feed timing
    accordingly.
- The recommendation is re-computed any time a new feeding or peak observation is logged —
  it is never a one-time static answer.
- If there isn't enough history to personalize a recommendation (e.g. brand-new starter,
  no peak observations yet), the app falls back to a clearly-labeled generic default rather
  than fabricating false confidence.

---

## 2. Personalized Recipes

Goal: a recipe is not a fixed document — it adapts its quantities and instructions to the
specific user and what they have available.

### 2.1 User baking profile

The app maintains a baking profile per user covering:
- **Skill level**: beginner, intermediate, or advanced.
- **Available flours**: the set of flour types the user keeps on hand.
- **Hydration comfort level**: a range or ceiling of dough hydration the user is comfortable
  handling (beginners default to a lower/narrower range than advanced bakers).
- **Equipment**: which of Dutch oven, banneton (and how many/what size), loaf tin (and size)
  the user owns.
- **Active starter on hand**: how much active (recently fed, unpeaked-or-peaked-as-specified)
  starter the user currently has available, pulled from starter tracking (section 1) rather
  than re-entered.

The profile is editable at any time and changes apply to future recipe personalization
immediately (existing saved/baked recipe instances are not silently rewritten).

### 2.2 Recipe adaptation rules

A recipe definition is a base formula (baker's-percentage style: flour, water, salt, starter,
plus any inclusions) that gets adapted per bake:

- **By skill level**: instructions for the same recipe differ in granularity and technique
  by skill level — e.g. an advanced baker sees a condensed step list and is offered options
  like stretch-and-fold vs. coil-fold, while a beginner sees more explicit step-by-step
  guidance and is steered toward fewer simultaneous technique choices. The underlying
  formula doesn't have to change for skill level, the instructions do.
- **By available flours**: the recipe's flour component(s) are restricted to flours the user
  has on hand (section 2.1). If a recipe calls for a flour the user doesn't have, the app
  either substitutes from the user's available flours or flags the gap — it does not
  silently assume the user owns an ingredient they haven't listed.
- **By hydration comfort**: if a recipe's default hydration exceeds the user's comfort
  ceiling, the app adjusts the water quantity down to fit within the user's range and
  reflects that adjustment to the user (it does not silently serve a harder dough than
  requested without saying so).
- **By equipment**: the bake method and shaping/proofing instructions depend on what
  equipment is selected for this bake (Dutch oven vs. loaf tin vs. open bake on a stone/sheet
  with a banneton for proofing only). The recipe only offers methods the user's equipment
  profile supports.
- **By active starter on hand**: the recipe's total flour/water/salt quantities scale to use
  the amount of active starter the user actually has (section 2.1), rather than assuming a
  fixed starter quantity the user may not have available. If the user doesn't have enough
  active starter for even a scaled-down version of the recipe, the app says so rather than
  generating an instruction set that calls for starter the user can't provide.

### 2.3 Output of personalization

Personalizing a recipe for a given bake produces a concrete, scaled ingredient list and an
ordered step list — this becomes the input to the timing engine (section 3) and reverse
scheduler (section 4).

---

## 3. Timing Engine

Goal: model how long each step of a bake actually takes, so total bake duration isn't a
fixed guess.

### 3.1 Step model

A bake is modeled as an ordered sequence of steps (e.g. mix, autolyse, bulk ferment,
shape, cold proof, bake, cool). Each step has:
- A duration, which is either fixed (e.g. bake time for a given vessel/loaf size) or
  variable/fermentation-based (e.g. bulk ferment, proof).
- Any constraints on what must precede it (steps are ordered; some steps cannot start until
  a prior step completes, e.g. shaping requires bulk ferment to have finished).

### 3.2 Fermentation-adjusted durations

For fermentation-based steps (bulk ferment, proof, etc.), estimated duration is adjusted by:
- **Ambient/dough temperature**: warmer temperature shortens estimated fermentation time;
  colder lengthens it. The relationship is monotonic and the app uses a temperature input
  (user-entered or defaulted) for every fermentation step it estimates.
- **Starter activity**: a starter with a faster observed time-to-peak (section 1.2)
  shortens estimated bulk ferment/proof time relative to a sluggish starter, all else equal.
  A starter with no recorded activity history falls back to a generic activity assumption,
  clearly distinguished from a personalized one.
- **Hydration**: higher-hydration doughs ferment differently than stiffer doughs; the engine
  accounts for the recipe's actual hydration (from section 2) when estimating fermentation
  steps, not just temperature and starter activity alone.

### 3.3 Step duration output

For a given personalized recipe (section 2.3) plus a temperature input, the timing engine
produces, for every step: an estimated duration (or a range, where uncertainty is real,
e.g. bulk ferment "4-5 hours"), and the cumulative elapsed time at the end of that step.

### 3.4 Re-estimation

If the user updates temperature or logs that fermentation is progressing faster/slower than
estimated mid-bake, the timing engine re-estimates remaining step durations rather than
keeping stale estimates fixed from the start of the bake.

---

## 4. Reverse Scheduling

Goal: let the user plan around a real-world deadline (a meal, an event) instead of doing
the time math themselves.

### 4.1 Backward scheduling ("I need it ready by...")

- The user enters a target time: either "bake by" (loaf comes out of the oven by this time)
  or "eat by" (accounting for minimum cool time before slicing).
- The app uses the timing engine's step durations (section 3) for the user's personalized
  recipe (section 2) to back-calculate:
  - The exact start time (when to begin the first step, e.g. feeding the starter or mixing
    dough — whichever is first in the relevant plan).
  - A step-by-step timeline: for every step, its scheduled start and end clock time.
- If the back-calculated start time is in the past (i.e. there isn't enough time left before
  the target), the app says so explicitly and either offers the earliest achievable
  target time or suggests adjustments (e.g. a faster proofing method, warmer fermentation
  temperature) rather than silently producing an impossible schedule.

### 4.2 Forward scheduling ("if I start now...")

- The user can instead indicate "I'm starting now" (or at a specified start time) and the
  app runs the same per-step durations forward to produce: the step-by-step timeline from
  that start time, and the resulting bake-ready / eat-ready clock time.

### 4.3 Shared timeline behavior

- Both directions produce the same shape of output: an ordered list of steps, each with a
  concrete start and end clock time, plus a single headline time (the target or the
  resulting ready-time, depending on direction).
- A schedule is tied to the recipe and temperature inputs used to generate it. If the user
  changes the recipe, equipment, or temperature after generating a schedule, the schedule is
  recalculated rather than left stale.
- The timeline accounts for starter readiness if the plan starts from feeding an unfed/
  unpeaked starter (section 1) — i.e. "start" can mean "start feeding the starter," not just
  "start mixing dough," when the user's current starter isn't active enough to bake with
  yet.
