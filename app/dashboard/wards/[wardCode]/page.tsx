import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isStreetStatus, type StreetStatus } from '@/lib/domain/street-status'
import { WardMessageForm } from './street-update-form'
import { WardStreetList } from './ward-street-list'


type Street = {
  id: string
  street_name: string
  road_type: string | null
  ward_code: string
  status: StreetStatus
  notes: string | null
  updated_at: string
}

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

type WardSummary = {
  ward_code: string
  ward_name: string
  population_2024: number | null
  electorate_2022: number | null
  seats: number | null
  avg_turnout_pct: number | null

  election_2022_turnout_pct: number | null
  election_2022_winners: string | null
  election_2022_winner_parties: string | null
  election_2022_last_elected_candidate: string | null
  election_2022_last_elected_party: string | null
  election_2022_last_elected_votes: number | null
  election_2022_parties_contesting: string | null
}

type WardMessage = {
  id: number
  user_id: string
  message: string
  created_at: string
}
type ElectionResult2022 = {
  id: number
  ward_code: string
  seat_number: number
  candidate_name: string
  party: string
  votes: number | null
  vote_share_pct: number | null
}
export default async function WardDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ wardCode: string }>
  searchParams: Promise<{
    q?: string
    status?: string
    road_type?: string
  }>
}) {
  const supabase = await createClient()
  const { wardCode } = await params
  const filters = await searchParams

  const q = (filters.q ?? '').trim().toLowerCase()
  const rawStatusFilter = filters.status ?? ''
  const statusFilter = isStreetStatus(rawStatusFilter)
    ? rawStatusFilter
    : ''
  const roadTypeFilter = filters.road_type ?? ''

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

const [
  { data: streets, error: streetsError },
  { data: wardProgress, error: progressError },
  { data: wardSummary, error: summaryError },
  { data: electionResults, error: electionResultsError },
] = await Promise.all([
  supabase
    .from('streets')
    .select('id,street_name,road_type,ward_code,status,notes,updated_at')
    .eq('ward_code', wardCode)
    .order('street_name', { ascending: true }),

  supabase
    .from('ward_progress')
    .select('*')
    .eq('ward_code', wardCode)
    .single(),

  supabase
    .from('ward_summaries')
    .select('*')
    .eq('ward_code', wardCode)
    .maybeSingle(),

supabase
  .from('ward_election_results_2022')
  .select('id,ward_code,seat_number,candidate_name,party,votes,vote_share_pct')
  .eq('ward_code', wardCode)
  .order('seat_number', { ascending: true })
])

if (streetsError) throw streetsError
if (progressError) throw progressError
if (summaryError) throw summaryError
if (electionResultsError) throw electionResultsError

  const streetRows = (streets ?? []) as Street[]
  const progress = wardProgress as WardProgress
  const wardInfo = wardSummary as WardSummary | null
  const electionRows = (electionResults ?? []) as ElectionResult2022[]

  const wardName = progress.ward_name
  const deliveredPct = progress.delivered_pct ?? 0

  const roadTypes = Array.from(
    new Set(
      streetRows
        .map((street) => street.road_type)
        .filter(Boolean)
    )
  ).sort() as string[]

  const filteredStreetRows = streetRows.filter((street) => {
    const matchesSearch =
      !q || street.street_name.toLowerCase().includes(q)

    const matchesStatus =
      !statusFilter || street.status === statusFilter

    const matchesRoadType =
      !roadTypeFilter || street.road_type === roadTypeFilter

    return matchesSearch && matchesStatus && matchesRoadType
  })

  const { error: messagesTableError } = await supabase
    .from('ward_messages')
    .select('id', { head: true })

  const hasMessages = !messagesTableError

  let messages: WardMessage[] = []

  if (hasMessages) {
    const { data } = await supabase
      .from('ward_messages')
      .select('id,user_id,message,created_at')
      .eq('ward_code', wardCode)
      .order('created_at', { ascending: false })
      .limit(20)

    messages = (data ?? []) as WardMessage[]
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">


      <div>
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>



<section className="surface overflow-hidden p-4 sm:p-6">


  <div className="mb-6 border-b border-zinc-300 pb-4">

    <h1 className="text-3xl font-semibold tracking-tight">{wardName}</h1>

    <p className="mt-2 text-sm text-zinc-400 italic">
      {wardCode}
    </p>

  </div>

<div className="grid items-start gap-10 lg:grid-cols-[1fr_360px]">    
    <div className="space-y-5">

      {wardInfo && (
        <div className="rounded-lg bg-[#051b3a]/5 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Ward context
          </p>

          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <p>
              <span className="block text-xs text-zinc-500">
                Population
              </span>

              <strong>
                {formatNumber(wardInfo.population_2024)}
              </strong>
            </p>

            <p>
              <span className="block text-xs text-zinc-500">
                Electorate
              </span>

              <strong>
                {formatNumber(wardInfo.electorate_2022)}
              </strong>
            </p>

            <p>
              <span className="block text-xs text-zinc-500">
                Recent turnout
              </span>

              <strong>
                {formatPct(wardInfo.avg_turnout_pct)}
              </strong>
            </p>

            <p>
              <span className="block text-xs text-zinc-500">
                Seats
              </span>

              <strong>
                {formatNumber(wardInfo.seats)}
              </strong>
            </p>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-zinc-100 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Leafletting progress
        </p>

        <div className="grid gap-3 text-sm sm:grid-cols-4">

          <div>
            <p className="text-xs text-zinc-500">
              Total
            </p>

            <p className="text-2xl font-semibold">
              {progress.total}
            </p>
          </div>

          <div>
            <p className="text-xs text-zinc-500">
              Not started
            </p>

            <p className="text-2xl font-semibold">
              {progress.not_started}
            </p>
          </div>

          <div>
            <p className="text-xs text-zinc-500">
              Needs revisit
            </p>

            <p className="text-2xl font-semibold">
              {progress.needs_revisit}
            </p>
          </div>

          <div>
            <p className="text-xs text-zinc-500">
              Delivered
            </p>

            <p className="text-2xl font-semibold">
              {progress.delivered}
            </p>
          </div>
        </div>

        <div className="mt-5 max-w-xl">
          <div className="mb-1 flex justify-between text-xs text-zinc-500">
            <span>Progress</span>
            <span>{deliveredPct}% delivered</span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-zinc-300">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${deliveredPct}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-zinc-500">
            Latest activity:{' '}
            {formatDate(progress.latest_updated_at)}
          </p>
        </div>
      </div>
      <div className="rounded-lg bg-[#051b3a]/5 p-4">
  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
    2022 local election
  </p>

  {electionRows.length > 0 ? (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-left uppercase tracking-wide text-zinc-500">
            <th className="py-1 pr-2">Seat</th>
            <th className="py-1 pr-2">Party</th>
            <th className="py-1 pr-2">Winner</th>
            <th className="py-1 pr-2 text-right">Votes</th>
            <th className="py-1 text-right">Share</th>
          </tr>
        </thead>

        <tbody>
          {electionRows.map((result) => (
            <tr key={result.id} className="border-b border-zinc-200">
              <td className="py-1 pr-2">{result.seat_number}</td>
              <td className="py-1 pr-2">{result.party}</td>
              <td className="py-1 pr-2 font-medium">{result.candidate_name}</td>
              <td className="py-1 pr-2 text-right">{formatNumber(result.votes)}</td>
              <td className="py-1 text-right">{formatPct(result.vote_share_pct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="text-xs text-zinc-500">
      No 2022 election result data available.
    </p>
  )}
</div>
    </div>

<div className="flex h-full flex-col gap-4 rounded-lg p-2">
  <div className="flex items-center justify-center overflow-hidden rounded-lg p-2">
    <img
      src={`/images/highlights/${wardCode}.png`}
      alt={`${wardName} highlight`}
      className="max-h-[180px] w-full object-contain brightness-160"
    />
  </div>
  <div className="flex items-center justify-center overflow-hidden rounded-lg  p-4">
    <img
      src={`/images/wards/${wardCode}.png`}
      alt={wardName}
      className="max-h-[200px] w-full object-contain opacity-95 brightness-[1.3] saturate-125 hue-rotate-[100deg]"
    />
  </div>



</div>
  </div>
</section>






      <form className="surface grid gap-3 p-4 sm:grid-cols-4" method="GET">
        <input
          name="q"
          defaultValue={filters.q ?? ''}
          placeholder="Search street name"
          className="rounded border px-3 py-2 text-sm"
        />

        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="not_started">Not started</option>
          <option value="delivered">Delivered</option>
          <option value="needs_revisit">Needs revisit</option>
          <option value="no_residences">No residences</option>
        </select>

        <select
          name="road_type"
          defaultValue={roadTypeFilter}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">All road types</option>
          {roadTypes.map((roadType) => (
            <option key={roadType} value={roadType}>
              {roadType}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button className="rounded bg-zinc-900 px-4 py-2 text-sm text-white">
            Apply
          </button>

          <Link
            href={`/dashboard/wards/${wardCode}`}
            className="rounded border px-4 py-2 text-sm"
          >
            Clear
          </Link>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">
          Streets ({filteredStreetRows.length} of {streetRows.length})
        </h2>

      <WardStreetList streets={filteredStreetRows} />

        {filteredStreetRows.length === 0 && (
          <p className="text-sm text-zinc-300">No matching streets found.</p>
        )}
      </section>

      {hasMessages && (
        <section className="surface grid gap-4 p-4 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-medium">Ward message board</h2>
            <p className="mb-3 text-sm text-zinc-600">
              Share quick updates with your team.
            </p>
            <WardMessageForm wardCode={wardCode} />
          </div>

          <ul className="space-y-2">
            {messages.map((message) => (
              <li key={message.id} className="rounded bg-zinc-50 p-3 text-sm">
                <p>{message.message}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {message.user_id.slice(0, 8)} ·{' '}
                  {formatDate(message.created_at)}
                </p>
              </li>
            ))}

            {messages.length === 0 && (
              <li className="text-sm text-zinc-500">No messages yet.</li>
            )}
          </ul>
        </section>
      )}
    </main>
  )
}

function formatDate(value: string | null) {
  if (!value) return 'No activity yet'
  return new Date(value).toISOString().slice(0, 16).replace('T', ' ')
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Not available'
  return value.toLocaleString('en-GB')
}

function formatPct(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Not available'
  return `${value}%`
}
