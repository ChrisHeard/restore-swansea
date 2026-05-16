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

type DashboardModule = {
  title: string
  description: string
  status: 'Active' | 'Planned'
  href: string
  actionLabel: string
}

const dashboardModules: DashboardModule[] = [
  {
    title: 'Leafletting Operations',
    description: 'Plan routes, update street status, and monitor ward progress.',
    status: 'Active',
    href: '#ward-grid',
    actionLabel: 'Choose a ward',
  },
  {
    title: 'Ward Intelligence',
    description: 'Explore ward context, demographics, turnout, and local campaign data.',
    status: 'Active',
    href: '/dashboard/ward-intelligence',
    actionLabel: 'Open map',
  },
  {
    title: 'Canvassing Guide',
    description: 'Learn how to speak with residents and prepare for doorstep conversations.',
    status: 'Planned',
    href: '#coming-soon',
    actionLabel: 'Coming soon',
  },
  {
    title: 'Campaign Literature',
    description: 'Access current leaflets, scripts, posters, and approved campaign material.',
    status: 'Planned',
    href: '#coming-soon',
    actionLabel: 'Coming soon',
  },
  {
    title: 'Local Briefing',
    description: 'Review ward notes, local issues, and Swansea campaign context.',
    status: 'Planned',
    href: '#coming-soon',
    actionLabel: 'Coming soon',
  },
  {
    title: 'Team Updates',
    description: 'Read organiser notes, action-day plans, and ward messages.',
    status: 'Planned',
    href: '#coming-soon',
    actionLabel: 'Coming soon',
  },
]

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
    <main className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:py-8">
      <header className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <Image
            src="/images/restore_swansea_white.png"
            alt="Restore Swansea"
            width={320}
            height={90}
            priority
            className="h-auto w-full max-w-[260px] object-contain"
          />

          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur-sm sm:w-auto">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-100/90">Account</p>
            <p className="mt-1 break-all text-sm font-medium text-white">
              {currentUser.email ?? user.email ?? 'Unknown user'}
            </p>
            <p className="mt-2 text-xs text-zinc-100/90">
              Account type:{' '}
              <span className="font-semibold text-white">
                {accountRoleLabel(currentUser.accountRole)}
              </span>
            </p>
            <p className="mt-1 text-xs text-zinc-100/80">
              {accountRoleDescription(currentUser.accountRole)}
            </p>
            <div className="mt-3">
              <SignOutLink />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Member Dashboard</h1>
          <p className="max-w-3xl text-sm text-zinc-200 sm:text-base">
            Organise local activity, understand Swansea wards, and access campaign guidance.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/12 to-white/5 p-5 text-white shadow-lg sm:p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-100/90">Today&apos;s briefing</p>
        <p className="mt-3 max-w-3xl text-sm text-zinc-100 sm:text-base">
          Use this dashboard to coordinate leafletting, review local ward context, and access campaign guidance for Swansea.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="#ward-grid"
            className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-sky-950 transition hover:bg-zinc-100"
          >
            Choose a ward
          </Link>
          <a
            href="/dashboard/ward-intelligence"
            className="inline-flex items-center justify-center rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            View ward intelligence
          </a>
        </div>
      </section>

      <section aria-label="Dashboard modules">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dashboardModules.map((module) => {
            if (module.status === 'Active') {
              return (
                <a
                  key={module.title}
                  href={module.href}
                  className="surface group flex min-h-40 flex-col justify-between p-5 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{module.status}</p>
                    <h2 className="mt-2 text-lg font-semibold">{module.title}</h2>
                    <p className="mt-2 text-sm text-zinc-600">{module.description}</p>
                  </div>
                  <p className="mt-5 text-sm font-medium text-sky-900">{module.actionLabel}</p>
                </a>
              )
            }

            return (
              <article
                key={module.title}
                className="surface flex min-h-40 flex-col justify-between p-5 opacity-85"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{module.status}</p>
                  <h2 className="mt-2 text-lg font-semibold">{module.title}</h2>
                  <p className="mt-2 text-sm text-zinc-600">{module.description}</p>
                </div>
                <p className="mt-5 text-sm font-medium text-zinc-500">Coming soon</p>
              </article>
            )
          })}
        </div>
      </section>

      <section id="leafletting-operations" className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">Leafletting Operations</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Campaign delivery tracker</h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-300">
            Track delivery progress, build routes, and update ward coverage.
          </p>
        </div>

        <section className="surface p-4">
          <h3 className="text-lg font-medium">Overall progress</h3>

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

        <section id="ward-grid">
          <h3 className="mb-3 text-lg font-medium text-white">Wards</h3>

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
                      <h4 className="font-bold">{ward.ward_name}</h4>
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
            <h3 className="text-lg font-medium">Recent activity</h3>

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
      </section>

      <p id="coming-soon" className="sr-only">
        Additional campaign modules are planned.
      </p>
    </main>
  )
}
