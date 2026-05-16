import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutLink from '@/app/dashboard/sign-out-link'
import Image from 'next/image'
import { accountRoleDescription, accountRoleLabel } from '@/lib/domain/account-role'
import { getCurrentUserProfile } from '@/lib/domain/current-user-profile'

type WardProgress = {
  ward_code: string
  ward_name: string
  total: number
  delivered: number
  needs_revisit: number
  not_started: number
  latest_updated_at: string | null
  delivered_pct: number | null
}

type FlyerLog = {
  id: number
  ward_code: string | null
  street_id: number | null
  action: string | null
  created_at: string
}

function formatDate(value: string | null) {
  if (!value) return 'No activity yet'
  return new Date(value).toISOString().slice(0, 16).replace('T', ' ')
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const currentUser = await getCurrentUserProfile(supabase, user)

  const { data: wards, error: wardsError } = await supabase
    .from('ward_progress')
    .select('*')
    .order('ward_name', { ascending: true })

  if (wardsError) throw wardsError

  const wardRows = (wards ?? []) as WardProgress[]

  const overall = wardRows.reduce(
    (acc, ward) => {
      acc.total += ward.total
      acc.delivered += ward.delivered
      acc.needsRevisit += ward.needs_revisit
      acc.notStarted += ward.not_started
      return acc
    },
    { total: 0, delivered: 0, needsRevisit: 0, notStarted: 0 }
  )

  const overallPct = overall.total
    ? Math.round((overall.delivered / overall.total) * 100)
    : 0

  const { error: flyerTableError } = await supabase
    .from('flyer_logs')
    .select('id', { head: true, count: 'exact' })

  const hasFlyerLogs = !flyerTableError

  let recentLogs: FlyerLog[] = []

  if (hasFlyerLogs) {
    const { data } = await supabase
      .from('flyer_logs')
      .select('id,ward_code,street_id,action,created_at')
      .order('created_at', { ascending: false })
      .limit(8)

    recentLogs = (data ?? []) as FlyerLog[]
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
<header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
  <div>
    <Image
      src="/images/restore_swansea_white.png"
      alt="Restore Swansea"
      width={320}
      height={90}
      priority
      className="h-auto w-full max-w-[260px] object-contain"
    />
  </div>

  <div className="flex flex-col items-start gap-2 lg:items-end">
    <div className="rounded-xl border border-white/20 bg-sky-950/60 px-4 py-3 text-sm text-zinc-100">
      <p className="text-xs uppercase tracking-[0.14em] text-zinc-300">Signed in as</p>
      <p className="mt-1 break-all font-medium text-white">{currentUser.email ?? user.email ?? 'Unknown user'}</p>
      <p className="mt-2 text-xs text-zinc-200">
        Account type: <span className="font-semibold text-white">{accountRoleLabel(currentUser.accountRole)}</span>
      </p>
      <p className="mt-1 text-xs text-zinc-300">{accountRoleDescription(currentUser.accountRole)}</p>
    </div>

    <SignOutLink />
  </div>
</header>

<section className="mt-8 space-y-3">

  <div className="border-y-2 border-white/80 py-4">
    <h1 className="text-3xl font-semibold tracking-tight text-white">
      Member Dashboard
    </h1>
  </div>

  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
    Leafletting Operations
  </p>

  <p className="max-w-2xl text-sm text-zinc-300">
    Monitor ward activity, manage street delivery progress, and coordinate local campaign operations.
  </p>

</section>

      <section className="surface p-4">
        <h2 className="text-lg font-medium">Overall progress</h2>

        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
          <p>
            Total streets: <strong>{overall.total}</strong>
          </p>
          <p>
            Delivered: <strong>{overall.delivered}</strong>
          </p>
          <p>
            Needs revisit: <strong>{overall.needsRevisit}</strong>
          </p>
          <p>
            Not started: <strong>{overall.notStarted}</strong>
          </p>
        </div>

        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full bg-emerald-600 transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>

        <p className="mt-2 text-xs text-zinc-500">{overallPct}% delivered</p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-white">Wards</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {wardRows.map((ward) => (
           <Link
  key={ward.ward_code}
  href={`/dashboard/wards/${ward.ward_code}`}
  className="surface block overflow-hidden transition hover:-translate-y-1 hover:shadow-xl"
>
<div className="flex justify-center p-3">
  <img
    src={`/images/wards/${ward.ward_code}.png`}
    alt={ward.ward_name}
    className="h-36 max-w-[260px] object-contain"
  />
</div>

  <div className="space-y-3 p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-bold">{ward.ward_name}</h3>
      </div>

  
    </div>

    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="rounded bg-zinc-100 p-2">
        <p className="text-lg font-semibold">{ward.delivered}</p>
        <p className="text-xs text-zinc-500">Done</p>
      </div>

      <div className="rounded bg-zinc-100 p-2">
        <p className="text-lg font-semibold">{ward.needs_revisit}</p>
        <p className="text-xs text-zinc-500">Revisit</p>
      </div>

      <div className="rounded bg-zinc-100 p-2">
        <p className="text-lg font-semibold">{ward.not_started}</p>
        <p className="text-xs text-zinc-500">Left</p>
      </div>
    </div>



    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span>Progress</span>
        <span>{ward.delivered_pct ?? 0}%</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full bg-emerald-600 transition-all"
          style={{ width: `${ward.delivered_pct ?? 0}%` }}
        />
      </div>
    </div>

    <p className="text-xs text-zinc-500">
      Latest activity: {formatDate(ward.latest_updated_at)}
    </p>
  </div>
</Link>
          ))}
        </div>
      </section>

      {hasFlyerLogs && (
        <section className="surface p-4">
          <h2 className="text-lg font-medium">Recent activity</h2>

          <ul className="mt-3 space-y-2 text-sm">
            {recentLogs.map((log) => (
              <li key={log.id} className="rounded bg-zinc-50 px-3 py-2">
                <span className="font-medium">{log.action ?? 'update'}</span>
                {' · '}
                ward {log.ward_code ?? 'n/a'}
                {' · '}
                {formatDate(log.created_at)}
              </li>
            ))}

            {recentLogs.length === 0 && (
              <li className="text-zinc-500">No activity yet.</li>
            )}
          </ul>
        </section>
      )}
    </main>
  )
}