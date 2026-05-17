import Link from 'next/link'
import { redirect } from 'next/navigation'
import WardIntelligenceShell from './ward-intelligence-shell'
import { createClient } from '@/lib/supabase/server'

export type WardIntelligenceMetricRow = {
  ward_code: string
  ward_name: string
  metric_key: string
  metric_label: string
  metric_value: number | null
  metric_unit: string | null
  source_year: number | null
}

export default async function WardIntelligencePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data, error } = await supabase
    .from('ward_intelligence_metrics')
    .select('ward_code, ward_name, metric_key, metric_label, metric_value, metric_unit, source_year')
    .order('metric_label', { ascending: true })
    .order('ward_name', { ascending: true })

  const metricRows: WardIntelligenceMetricRow[] = Array.isArray(data) ? data : []

  return (
      <main className="mx-auto w-full max-w-[850px] space-y-4 px-4 py-4 sm:px-6 lg:space-y-5 lg:px-10 lg:py-6">      <div>
        <Link href="/dashboard" className="text-sm text-zinc-200 hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      <header className="space-y-1.5 text-white">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ward Intelligence</h1>
        <p className="max-w-3xl text-sm text-zinc-200 sm:text-base">
          Explore Swansea ward context, local data, and campaign intelligence.
        </p>
      </header>

      <WardIntelligenceShell metricRows={metricRows} metricsError={error?.message ?? null} />
    </main>
  )
}
