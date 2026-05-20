# Database schema notes (observed from app usage)

This document summarizes what the app currently expects from Supabase based on repository code usage.

> This is **not** authoritative SQL. Where schema details are incomplete, this document records **Observed app usage**.

## profiles

- **Purpose**: Member profile metadata linked to auth users.
- **Key fields currently used by the app**:
  - `id`
  - `email`
  - `display_name`
  - `global_role` (validated as `administrator | member | guest` for display and permissions fallback logic)
- **Likely object type**: Likely a **table**.
- **Observed app usage**:
  - Dashboard account display reads `profiles` and falls back safely when profile rows/table are unavailable.
  - The permissions layer reads `global_role` to decide global account authority.
- **Recommended constraint**:
  - `check (global_role in ('administrator', 'member', 'guest'))`

## ward_memberships

- **Purpose**: Ward-scoped team membership and ward leadership assignments.
- **Key fields currently used by the app**:
  - `id`
  - `user_id`
  - `ward_code`
  - `ward_role` (validated as `ward_leader | member`)
  - `created_at`
- **Likely object type**: **Table**.
- **Observed app usage**:
  - The permissions layer reads `ward_memberships` by `user_id` and `ward_code` to determine whether the current user is a leader or member for a ward.
  - A user can be ward leader for more than one ward by having multiple rows with `ward_role = 'ward_leader'`.
- **Recommended constraints**:
  - `unique (user_id, ward_code)`
  - `check (ward_role in ('ward_leader', 'member'))`

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
- **Likely object type**: **Table**.
- **Observed app usage**:
  - Ward pages read street rows by `ward_code`.
  - Server actions update `status`, `notes`, and `updated_at` after permission checks.
  - Server actions verify that the submitted street belongs to the submitted ward before update.

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
- **Observed app usage**:
  - The app reads only (`select`, `order`, `single`) and does not mutate.

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
- **Observed app usage**:
  - The app reads via `.maybeSingle()` by `ward_code`.

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
- **Observed app usage**:
  - The app is read-only (`select`, `order`) with ward filtering.

## flyer_logs

- **Purpose**: Activity log for street status updates and recent dashboard activity.
- **Key fields currently used by the app**:
  - `id`
  - `ward_code`
  - `street_id`
  - `action`
  - `user_id`
  - `created_at`
- **Likely object type**: **Table**.
- **Observed app usage**:
  - App inserts records after successful street updates.
  - `user_id` now comes from an explicitly authenticated user in the permissions layer.
  - App still probes table existence before inserting for compatibility with incomplete local schema.

## ward_messages

- **Purpose**: Ward-level message board posts.
- **Key fields currently used by the app**:
  - `id`
  - `ward_code`
  - `user_id`
  - `message`
  - `created_at`
- **Likely object type**: **Table**.
- **Observed app usage**:
  - App inserts messages after permission checks.
  - App lists recent messages by ward.
  - App still probes table existence before read path for compatibility with incomplete local schema.

## ward_census_2021_characteristics

- **Purpose**: Imported wide 2021 Census table at ward level.
- **Likely object type**: **Table** (external import process).
- **App usage**:
  - The app does **not** query this table directly for mapping.
  - It is treated as the source for transformation into a map-friendly long-form view.

## ward_intelligence_metrics

- **Purpose**: Map-friendly long-form ward intelligence metrics used for choropleth layers.
- **Likely object type**: **View** (`public.ward_intelligence_metrics`).
- **Expected columns queried by the app**:
  - `ward_code text`
  - `ward_name text`
  - `metric_key text`
  - `metric_label text`
  - `metric_value numeric`
  - `metric_unit text`
  - `source_year integer`
- **App usage**:
  - Ward Intelligence page queries this object server-side, orders by metric then ward, and passes plain rows to the client shell.
  - Client-side selector and map shading are driven by `metric_key`/`metric_label` plus ward-level numeric values.
  - Empty/error states are handled in-app when the view is missing or returns no rows.
