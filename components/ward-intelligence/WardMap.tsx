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
  hoveredWardCode?: string | null
  onWardSelect?: (wardCode: string) => void
  onWardHover?: (wardCode: string) => void
  onWardLeave?: () => void
}

export default function WardMap({
  data = [],
  selectedWardCode = null,
  hoveredWardCode = null,
  onWardSelect,
  onWardHover,
  onWardLeave,
}: WardMapProps) {
  const datumByCode = useMemo(() => new Map(data.map((d) => [d.wardCode, d])), [data])

  return (
    <svg viewBox={wardMap.viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Swansea ward map" className="block h-full w-full">
      {wardMap.wards.map((ward) => {
        const datum = datumByCode.get(ward.wardCode)
        const selected = ward.wardCode === selectedWardCode
        const hovered = ward.wardCode === hoveredWardCode
        const fill = datum?.colour ?? (selected ? '#0f52b0' : '#dbeafe')

        return (
          <path
            key={ward.wardCode}
            d={ward.path}
            fill={fill}
            stroke={hovered || selected ? '#051b3a' : '#1e3a8a'}
            strokeWidth={hovered || selected ? 2 : 1}
            opacity={hovered ? 0.9 : 1}
            tabIndex={0}
            className="cursor-pointer transition-[fill,stroke,stroke-width,opacity] duration-300 ease-out hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none"
            onClick={() => onWardSelect?.(ward.wardCode)}
            onMouseEnter={() => onWardHover?.(ward.wardCode)}
            onMouseLeave={() => onWardLeave?.()}
            onFocus={() => onWardHover?.(ward.wardCode)}
            onBlur={() => onWardLeave?.()}
          >
            <title>{`${ward.wardName} (${ward.wardCode})${datum?.label ? ` - ${datum.label}` : ''}`}</title>
          </path>
        )
      })}
    </svg>
  )
}
