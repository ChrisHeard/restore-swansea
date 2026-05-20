import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutLink from '@/app/dashboard/sign-out-link'
import Image from 'next/image'
import { accountRoleDescription, accountRoleLabel } from '@/lib/domain/account-role'
import { getCurrentUserProfile } from '@/lib/domain/current-user-profile'
import InstallPwaPrompt from '@/components/InstallPwaPrompt'

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
  icon: string
  accent: string
}

const iconPath = (iconName: string) => `/graphics/icons/${iconName}.svg`

function ModuleIcon({
  src,
  color,
}: {
  src: string
  color: string
}) {
  return (
    <span
      aria-hidden="true"
      className="block h-7 w-7"
      style={{
        backgroundColor: color,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  )
}

function ModuleCard({ module }: { module: DashboardModule }) {
  const isActive = module.status === 'Active'

  const cardInner = (
    <>
      <div
        className="absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl"
        style={{
          backgroundColor: `${module.accent}22`,
        }}
      />

      <div className="relative flex flex-1 gap-4 p-5 sm:gap-5 sm:p-6">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl sm:h-16 sm:w-16"
          style={{
            backgroundColor: `${module.accent}14`,
          }}
        >
          <ModuleIcon src={module.icon} color={module.accent} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold leading-tight text-[#051b3a] sm:text-lg">
              {module.title}
            </h2>

            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] sm:text-[11px]"
              style={{
                color: module.accent,
                backgroundColor: `${module.accent}18`,
              }}
            >
              {module.status}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {module.description}
          </p>
        </div>
      </div>

      <div className="relative mx-5 border-t border-slate-200/80 sm:mx-6" />

      <div className="relative flex items-center justify-between px-5 py-4 sm:px-6">
        <span
          className="text-sm font-semibold"
          style={{
            color: isActive ? module.accent : '#64748b',
          }}
        >
          {module.actionLabel}
        </span>

        {isActive && (
          <span
            aria-hidden="true"
            className="text-xl leading-none transition group-hover:translate-x-1"
            style={{ color: module.accent }}
          >
            →
          </span>
        )}
      </div>
    </>
  )

  if (isActive) {
    return (
      <Link
        href={module.href}
        className="surface group relative flex min-h-[190px] flex-col overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-xl"
      >
        {cardInner}
      </Link>
    )
  }

  return (
    <article className="surface relative flex min-h-[190px] flex-col overflow-hidden p-0 opacity-85">
      {cardInner}
    </article>
  )
}

const dashboardModules: DashboardModule[] = [
  {
    title: 'Leafletting Operations',
    description: 'Plan routes, update street status, and monitor ward progress.',
    status: 'Active',
    href: '#ward-grid',
    actionLabel: 'Choose a ward',
    icon: iconPath('book-open'),
    accent: '#2563eb',
  },
  {
    title: 'Ward Intelligence',
    description: 'Explore ward context, demographics, turnout, and local campaign data.',
    status: 'Active',
    href: '/dashboard/ward-intelligence',
    actionLabel: 'Open map',
    icon: iconPath('chart-pie-slice'),
    accent: '#16a34a',
  },
  {
    title: 'Canvassing Guide',
    description: 'Learn how to speak with residents and prepare for doorstep conversations.',
    status: 'Planned',
    href: '#coming-soon',
    actionLabel: 'Coming soon',
    icon: iconPath('user-circle'),
    accent: '#7c3aed',
  },
  {
    title: 'Campaign Literature',
    description: 'Access current leaflets, scripts, posters, and approved campaign material.',
    status: 'Planned',
    href: '#coming-soon',
    actionLabel: 'Coming soon',
    icon: iconPath('file'),
    accent: '#c9972b',
  },
  {
    title: 'Local Briefing',
    description: 'Review ward notes, local issues, and Swansea campaign context.',
    status: 'Planned',
    href: '#coming-soon',
    actionLabel: 'Coming soon',
    icon: iconPath('books'),
    accent: '#0ea5e9',
  },
  {
    title: 'Team Updates',
    description: 'Read organiser notes, action-day plans, and ward messages.',
    status: 'Planned',
    href: '#coming-soon',
    actionLabel: 'Coming soon',
    icon: iconPath('users'),
    accent: '#0891b2',
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
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:py-6">
      <header className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <Image
          src="/images/restore_swansea_white.png"
          alt="Restore Swansea"
          width={320}
          height={90}
          priority
          className="h-auto w-full max-w-[250px] object-contain"
        />

        <div className="w-full rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-white backdrop-blur-sm sm:min-w-[560px] lg:w-auto">
          <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-100/80">
            Account
          </p>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-white">
                  {currentUser.email ?? user.email ?? 'Unknown user'}
                </p>

                <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {accountRoleLabel(currentUser.accountRole)}
                </span>
              </div>

              <p className="mt-1 text-xs text-zinc-100/70">
                {accountRoleDescription(currentUser.accountRole)}
              </p>
            </div>

            <div className="shrink-0">
              <SignOutLink />
            </div>
          </div>
        </div>
      </header>

      <section className="surface relative overflow-hidden p-0">
        <div className="relative min-h-[270px] overflow-hidden rounded-[inherit] bg-white sm:h-[205px] sm:min-h-0 lg:h-[225px]">
          {/* Mobile image treatment */}
          <div
            className="
              absolute inset-x-0 bottom-0 h-[135px] bg-no-repeat
              bg-[length:155%_auto]
              bg-[position:right_-18px]
              sm:hidden
            "
            style={{
              backgroundImage: "url('/graphics/waterfront_landscape.png')",
            }}
          />

          {/* Desktop/tablet image treatment */}
          <div
            className="
              absolute inset-0 hidden bg-no-repeat
              bg-[length:85%_auto]
              bg-[position:right_-38px]
              sm:block
              lg:bg-[length:86%_auto]
              lg:bg-[position:right_-46px]
            "
            style={{
              backgroundImage: "url('/graphics/waterfront_landscape.png')",
            }}
          />

          <div
            className="
              relative z-10 px-6 pb-[150px] pt-7
              sm:flex sm:h-full sm:items-center sm:px-10 sm:py-6
            "
          >
            <div className="max-w-xl">
              <h1 className="text-3xl font-bold tracking-tight text-[#051b3a] sm:text-4xl">
                Member Dashboard
              </h1>

              <p className="mt-3 max-w-md text-sm leading-6 text-slate-700 sm:text-base">
                Organise local activity, understand Swansea wards, and access campaign guidance.
              </p>

              <div className="mt-5 h-1 w-14 rounded-full bg-blue-500" />
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Dashboard modules">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dashboardModules.map((module) => (
            <ModuleCard key={module.title} module={module} />
          ))}
        </div>
      </section>

      <section id="leafletting-operations" className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
            Leafletting Operations
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Campaign delivery tracker
          </h2>
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
                      <p className="text-lg font-semibold">
                        {ward.needs_revisit}
                      </p>
                      <p className="text-xs text-zinc-500">Revisit</p>
                    </div>

                    <div className="rounded bg-zinc-100 p-2">
                      <p className="text-lg font-semibold">
                        {ward.not_started}
                      </p>
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
      <InstallPwaPrompt />
    </main>
    
  )
}