# Auth and permissions design (pre-implementation)

This document describes the intended permissions model for upcoming work. It is a design baseline and does **not** imply completed role enforcement yet.

## Current branch scope

This branch only adds account-type display groundwork in the dashboard header.

- No feature permissions are enforced yet.
- No role-based UI hiding is implemented yet.
- No Supabase RLS policy changes are implemented in this branch.

Role enforcement is intentionally deferred until team policy is agreed.

## Roles model

### Global roles

- `administrator`
- `member`
- `guest`

### Ward-scoped role

- `ward_leader`

`ward_leader` is **not** a global role. It should be attached to one or more wards via membership records.

## Recommended schema shape

### profiles

- `id`
- `email`
- `display_name`
- `global_role` (`administrator | member | guest`)

### ward_memberships

- `id`
- `user_id`
- `ward_code`
- `ward_role` (`ward_leader | member`)

## Intended permissions (future)

### administrator

- Manage all wards
- Manage users
- Edit authoritative data
- Approve/apply major changes

### ward_leader

- Manage assigned wards
- Review or apply member-submitted updates for their ward
- Coordinate local activity

### member

- Use dashboard
- Use mission planner
- Submit or record delivery updates (subject to final policy)

### guest

- Demonstration/review access for senior organisers or people from other branches evaluating a potential branch deployment
- No authority to alter production campaign data unless explicitly permitted later

## SQL note (intended eventual profile role field)

```sql
-- Intended eventual shape for profiles.global_role (documentation only)
global_role text not null default 'member'
check (global_role in ('administrator', 'member', 'guest'))
```

## Enforcement requirements

When implemented, permission checks should be enforced in both:

1. **Supabase RLS policies**
2. **Server actions / server-side handlers**

UI-only restrictions are insufficient on their own.
