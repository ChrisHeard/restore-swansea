'use client'

import { useMemo } from 'react'
import wardMap from '@/lib/ward-map/swansea-ward-paths.json'

export type WardMapDatum = {
  wardCode: string
  label?: string
  value?: number | string | null
  colour?: string
}

export type WardMapProps = {
  data?: WardMapDatum[]
  selectedWardCode?: string | null
  onWardSelect?: (wardCode: string) => void
}

export default function WardMap({ data = [], selectedWardCode = null, onWardSelect }: WardMapProps) {
  const datumByCode = useMemo(() => new Map(data.map((d) => [d.wardCode, d])), [data])

  return (
    <svg viewBox={wardMap.viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Swansea ward map" className="block h-full w-full">
      {wardMap.wards.map((ward) => {
        const datum = datumByCode.get(ward.wardCode)
        const selected = ward.wardCode === selectedWardCode
        const fill = datum?.colour ?? (selected ? '#0f52b0' : '#dbeafe')

        return (
          <path
            key={ward.wardCode}
            d={ward.path}
            fill={fill}
            stroke={selected ? '#051b3a' : '#1e3a8a'}
            strokeWidth={selected ? 2 : 1}
            className="cursor-pointer transition-[fill,stroke,stroke-width,opacity] duration-300 ease-out hover:opacity-80"
            onClick={() => onWardSelect?.(ward.wardCode)}
          >
            <title>{`${ward.wardName} (${ward.wardCode})${datum?.label ? ` - ${datum.label}` : ''}`}</title>
          </path>
        )
      })}
    </svg>
  )
}
