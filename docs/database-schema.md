# Database schema notes (observed from app usage)

This document summarizes what the app currently expects from Supabase based on repository code usage.

> This is **not** authoritative SQL. Where schema details are incomplete, this document records **Observed app usage**.

## profiles

- **Purpose**: Intended member profile metadata linked to auth users.
- **Key fields currently used by the app**:
  - `id`
  - `email`
  - `display_name`
  - `global_role` (validated as `administrator | member | guest` for display fallback logic)
- **Likely object type**: Likely a **table** (based on historical setup docs and naming convention).
- **Uncertainty / Observed app usage**:
  - Observed app usage now attempts to read `profiles` for dashboard account display, but falls back safely when profile rows/table are unavailable.
  - Schema details remain intended design unless confirmed directly from the live database.
- **Intended design note (not authoritative SQL)**:
  - Intended eventual role column shape: `global_role text not null default 'member'`
  - Intended eventual role constraint: `check (global_role in ('administrator', 'member', 'guest'))`

## streets

- **Purpose**: Core street-level campaign delivery records.
- **Key fields currently used by the app**:
  - `id`
  - `street_name`
  - `road_type`
  - `ward_code`
  - `status`
  - `notes`
  - `updated_at`
- **Likely object type**: **Table** (queried for row updates).
- **Uncertainty / Observed app usage**:
  - Observed app usage performs `.update(...)` and `.eq('id', ...)`, confirming mutable row records.
  - Additional fields may exist but are not required by currently checked-in pages/actions.

## ward_progress

- **Purpose**: Ward-level aggregated progress shown on dashboard and ward pages.
- **Key fields currently used by the app**:
  - `ward_code`
  - `ward_name`
  - `total`
  - `delivered`
  - `needs_revisit`
  - `not_started`
  - `latest_updated_at`
  - `delivered_pct`
- **Likely object type**: Likely a **view** (aggregate-style naming and usage), but not guaranteed.
- **Uncertainty / Observed app usage**:
  - Observed app usage reads only (`select`, `order`, `single`) and does not mutate.
  - Could be a table maintained by jobs/triggers, but code alone does not prove this.

## ward_summaries

- **Purpose**: Additional ward context (population/electorate/seats/turnout/election summary fields).
- **Key fields currently used by the app**:
  - `ward_code`
  - `ward_name`
  - `population_2024`
  - `electorate_2022`
  - `seats`
  - `avg_turnout_pct`
  - `election_2022_turnout_pct`
  - `election_2022_winners`
  - `election_2022_winner_parties`
  - `election_2022_last_elected_candidate`
  - `election_2022_last_elected_party`
  - `election_2022_last_elected_votes`
  - `election_2022_parties_contesting`
- **Likely object type**: Likely a **view** (summary naming and read-only usage), but not guaranteed.
- **Uncertainty / Observed app usage**:
  - Observed app usage reads via `.maybeSingle()` by `ward_code`.
  - Exact derivation/source tables are not visible from application code alone.

## ward_election_results_2022

- **Purpose**: Per-candidate election results for ward display.
- **Key fields currently used by the app**:
  - `id`
  - `ward_code`
  - `seat_number`
  - `candidate_name`
  - `party`
  - `votes`
  - `vote_share_pct`
- **Likely object type**: Could be a **table** or **view**.
- **Uncertainty / Observed app usage**:
  - Observed app usage is read-only (`select`, `order`) with ward filtering.
  - No writes observed, so mutability/type cannot be concluded definitively.

## flyer_logs

- **Purpose**: Activity log for street status updates and recent dashboard activity.
- **Key fields currently used by the app**:
  - `id`
  - `ward_code`
  - `street_id`
  - `action`
  - `user_id` (write path)
  - `created_at`
- **Likely object type**: **Table** (app inserts records).
- **Uncertainty / Observed app usage**:
  - Observed app usage first probes existence (`select head`) and conditionally inserts.
  - `street_id` type may differ from page-local TypeScript assumptions; confirm directly in DB.

## ward_messages

- **Purpose**: Ward-level message board posts.
- **Key fields currently used by the app**:
  - `id`
  - `ward_code`
  - `user_id`
  - `message`
  - `created_at`
- **Likely object type**: **Table** (app inserts and lists messages).
- **Uncertainty / Observed app usage**:
  - Observed app usage probes table existence before read path.
  - Exact constraints/permissions are not inferable from app code alone.
