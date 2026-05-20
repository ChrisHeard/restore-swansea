import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  updateDisplayNameAction,
  updatePasswordAction,
  requestWardLeadershipAction,
} from './actions'

type Profile = {
  user_id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: 'administrator' | 'member' | 'guest'
}

type Ward = {
  ward_code: string
  ward_name: string
}

type Activity = {
  id: string
  street_name: string | null
  ward_code: string | null
  status: string | null
  notes: string | null
  created_at: string
}

type LeadershipRequest = {
  id: string
  ward_code: string
  status: string
  reason: string | null
  created_at: string
}

export default async function AccountPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id,email,display_name,avatar_url,role')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: wards } = await supabase
    .from('wards')
    .select('ward_code,ward_name')
    .order('ward_name', { ascending: true })

  const { data: activity } = await supabase
    .from('flyer_logs')
    .select('id,street_name,ward_code,status,notes,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: requests } = await supabase
    .from('ward_leadership_requests')
    .select('id,ward_code,status,reason,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const profileRow = profile as Profile | null
  const isGuest = profileRow?.role === 'guest'
  const wardRows = (wards ?? []) as Ward[]
  const activityRows = (activity ?? []) as Activity[]
  const requestRows = (requests ?? []) as LeadershipRequest[]

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <Link href="/dashboard" className="text-sm text-blue-300 hover:underline">
          ← Back to dashboard
        </Link>

        <h1 className="mt-4 text-3xl font-semibold text-white">Account</h1>
        <p className="mt-1 text-sm text-zinc-300">{user.email}</p>
      </div>

    {!isGuest && (
  <>
 <section className="surface p-4">
        <h2 className="text-lg font-medium">Profile</h2>

        <form action={updateDisplayNameAction} className="mt-4 space-y-3">
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="email" value={user.email ?? ''} />

          <label className="block space-y-1">
            <span className="text-sm text-zinc-600">Display name</span>
            <input
              name="displayName"
              defaultValue={profileRow?.display_name ?? ''}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="Your name"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-zinc-600">Profile image URL</span>
            <input
              name="avatarUrl"
              defaultValue={profileRow?.avatar_url ?? ''}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </label>

          <p className="text-sm text-zinc-500">
            Role: <strong>{profileRow?.role ?? 'member'}</strong>
          </p>

          <button className="rounded bg-[#051b3a] px-4 py-2 text-sm text-white">
            Save profile
          </button>
        </form>
      </section>
 <section className="surface p-4">
        <h2 className="text-lg font-medium">Change password</h2>

        <form action={updatePasswordAction} className="mt-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-sm text-zinc-600">New password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </label>

          <button className="rounded bg-[#051b3a] px-4 py-2 text-sm text-white">
            Update password
          </button>
        </form>
      </section>

      <section className="surface p-4">
        <h2 className="text-lg font-medium">Request ward leadership</h2>

        <form action={requestWardLeadershipAction} className="mt-4 space-y-3">
          <select name="wardCode" required className="w-full rounded border px-3 py-2 text-sm">
            <option value="">Select ward</option>
            {wardRows.map((ward) => (
              <option key={ward.ward_code} value={ward.ward_code}>
                {ward.ward_name}
              </option>
            ))}
          </select>

          <textarea
            name="reason"
            rows={3}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Optional note for administrators"
          />

          <button className="rounded bg-[#051b3a] px-4 py-2 text-sm text-white">
            Submit request
          </button>
        </form>

        {requestRows.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm">
            {requestRows.map((request) => (
              <li key={request.id} className="rounded bg-zinc-50 p-3">
                <p>
                  Ward: <strong>{request.ward_code}</strong>
                </p>
                <p>Status: {request.status}</p>
                <p className="text-xs text-zinc-500">
                  {formatDate(request.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface p-4">
        <h2 className="text-lg font-medium">Recent activity</h2>

        {activityRows.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {activityRows.map((item) => (
              <li key={item.id} className="rounded bg-zinc-50 p-3">
                <p>
                  <strong>{item.street_name ?? 'Street update'}</strong>{' '}
                  {item.status ? `→ ${item.status}` : ''}
                </p>
                <p className="text-xs text-zinc-500">
                  Ward {item.ward_code ?? 'n/a'} · {formatDate(item.created_at)}
                </p>
                {item.notes && <p className="mt-1 text-zinc-600">{item.notes}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">No activity yet.</p>
        )}
      </section>
  </>
)}
     {isGuest && (
  <section className="surface p-4">
    <h2 className="text-lg font-medium">Guest access</h2>
    <p className="mt-2 text-sm text-zinc-600">
      This account has read-only guest access. Profile editing, password changes,
      and ward leadership requests are disabled.
    </p>
  </section>
)}
     
    </main>
  )
}

function formatDate(value: string | null) {
  if (!value) return 'No date'
  return new Date(value).toISOString().slice(0, 16).replace('T', ' ')
}