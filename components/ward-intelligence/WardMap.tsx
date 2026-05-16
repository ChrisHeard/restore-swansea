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
  data?: WardMapDatum[] | null
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
  const safeData = Array.isArray(data) ? data : []

  const datumByCode = useMemo(
    () => new Map(safeData.map((datum) => [datum.wardCode, datum])),
    [safeData]
  )

  return (
    <svg
      viewBox={wardMap.viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Swansea ward map"
      className="block h-full w-full"
    >
      {wardMap.wards.map((ward) => {
        const datum = datumByCode.get(ward.wardCode)
        const selected = ward.wardCode === selectedWardCode
        const hovered = ward.wardCode === hoveredWardCode
        const isActive = hovered || selected

        const fill = datum?.colour ?? '#dbeafe'
        const stroke = isActive ? '#051b3a' : '#1e3a8a'
        const strokeWidth = isActive ? 2 : 1

        return (
          <path
            key={ward.wardCode}
            d={ward.path}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={hovered ? 0.92 : 1}
            tabIndex={0}
            role="button"
            aria-label={`${ward.wardName} ward${
              datum?.label ? `, ${datum.label}` : ''
            }`}
            className="cursor-pointer transition-[fill,stroke,stroke-width,opacity] duration-300 ease-out hover:opacity-90 focus-visible:opacity-90 focus-visible:outline-none"
            onClick={() => onWardSelect?.(ward.wardCode)}
            onPointerEnter={() => onWardHover?.(ward.wardCode)}
            onPointerLeave={() => onWardLeave?.()}
            onFocus={() => onWardHover?.(ward.wardCode)}
            onBlur={() => onWardLeave?.()}
          >
            <title>
              {`${ward.wardName} (${ward.wardCode})${
                datum?.label ? ` - ${datum.label}` : ''
              }`}
            </title>
          </path>
        )
      })}
    </svg>
  )
}