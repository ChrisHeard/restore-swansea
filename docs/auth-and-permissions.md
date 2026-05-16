# Auth and permissions design (pre-implementation)

This document describes the intended permissions model for upcoming work. It is a design baseline and does **not** imply completed role enforcement yet.

## Roles model

### Global roles

- `admin`
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
- `global_role` (`admin | member | guest`)

### ward_memberships

- `id`
- `user_id`
- `ward_code`
- `ward_role` (`ward_leader | member`)

## Intended permissions

### admin

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

- Restricted access
- No authority to alter production campaign data unless explicitly permitted later

## Enforcement requirements

When implemented, permission checks should be enforced in both:

1. **Supabase RLS policies**
2. **Server actions / server-side handlers**

UI-only restrictions are insufficient on their own.
