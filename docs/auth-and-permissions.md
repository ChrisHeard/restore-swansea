# Auth and permissions design

This document describes the app permissions model used by the checked-in server-side permissions helpers.

## Roles model

### Global account roles

Global account roles live on `profiles.global_role`:

- `administrator`
- `member`
- `guest`

Global roles answer the question: what kind of account is this user across the platform?

### Ward team roles

Ward team roles live on `ward_memberships.ward_role`:

- `ward_leader`
- `member`

Ward roles answer the question: what can this user do for this specific ward?

A user can have multiple `ward_memberships` rows, so a single person can lead or belong to more than one ward team.

## Recommended schema shape

### profiles

- `id` uuid primary key; should match `auth.users.id`
- `email` text
- `display_name` text
- `global_role` text, one of `administrator | member | guest`

### ward_memberships

- `id` uuid primary key
- `user_id` uuid, references `auth.users.id`
- `ward_code` text, matching the app ward code values
- `ward_role` text, one of `ward_leader | member`
- `created_at` timestamptz

Recommended uniqueness constraint:

```sql
unique (user_id, ward_code)
```

This allows one row per user per ward, while still allowing the same user to be attached to several wards.

## Current server-side enforcement

Server-side permission helpers live in:

- `lib/domain/permissions.ts`

Current helper responsibilities:

- `requireUser(...)` rejects unauthenticated users.
- `requireCampaignWriteAccess(...)` allows only administrators or assigned ward team members to change ward campaign data.
- `requireWardLeaderAccess(...)` allows only administrators or ward leaders for the relevant ward.

Current campaign write rule:

- `administrator`: can write to any ward.
- `ward_leader`: can write to their assigned ward.
- ward `member`: can write to their assigned ward.
- global `member` without ward membership: cannot write to ward data.
- `guest`: cannot write to campaign data.

## Current action coverage

The ward server actions now call the permissions layer before writing:

- Street status / notes updates
- Ward message board posts

Street updates also verify that the submitted `streetId` belongs to the submitted `wardCode` before updating.

## Intended permissions

### administrator

- Manage all wards
- Manage users
- Edit authoritative data
- Approve/apply major changes

### ward_leader

- Manage assigned wards
- Review or apply member-submitted updates for their ward
- Coordinate local activity

### ward member

- Use assigned ward tools
- Use mission planner
- Submit or record delivery updates for assigned wards

### global member

- Use general member dashboard areas
- No ward write access unless assigned to a ward team

### guest

- Demonstration/review access
- No authority to alter production campaign data

## SQL note

Suggested role constraints:

```sql
alter table profiles
  add constraint profiles_global_role_check
  check (global_role in ('administrator', 'member', 'guest'));

alter table ward_memberships
  add constraint ward_memberships_ward_role_check
  check (ward_role in ('ward_leader', 'member'));
```

## Enforcement requirements

Permissions should be enforced in both:

1. Supabase RLS policies
2. Server actions / server-side handlers

UI-only restrictions are insufficient on their own.
