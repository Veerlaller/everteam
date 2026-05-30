import { motion } from 'framer-motion'
import type { GeoPoint, ScoredLoad } from '../types'

// Western-US bounding box → SVG projection.
const BBOX = { minLng: -125, maxLng: -94, minLat: 31, maxLat: 46 }
const W = 420
const H = 300

function project(p: GeoPoint) {
  const x = ((p.lng - BBOX.minLng) / (BBOX.maxLng - BBOX.minLng)) * W
  const y = H - ((p.lat - BBOX.minLat) / (BBOX.maxLat - BBOX.minLat)) * H
  return { x, y }
}

export function MapView({ loads, topIds }: { loads: ScoredLoad[]; topIds: string[] }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
      <defs>
        <radialGradient id="glow" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="rgba(245,166,35,0.10)" />
          <stop offset="100%" stopColor="rgba(245,166,35,0)" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#glow)" />

      {/* topo grid */}
      <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`v${i}`} x1={(i * W) / 10} y1="0" x2={(i * W) / 10} y2={H} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={(i * H) / 7} x2={W} y2={(i * H) / 7} />
        ))}
      </g>

      {/* Fresno home base marker */}
      {(() => {
        const home = project({ lat: 36.74, lng: -119.79 })
        return (
          <g>
            <circle cx={home.x} cy={home.y} r="4" fill="#f5a623" />
            <circle cx={home.x} cy={home.y} r="9" fill="none" stroke="#f5a623" strokeOpacity="0.4" />
            <text x={home.x + 11} y={home.y + 3} fill="#9aa6b2" fontSize="9" fontFamily="JetBrains Mono">
              Fresno
            </text>
          </g>
        )
      })()}

      {/* routes + pins */}
      {loads.map((load, i) => {
        const o = project(load.originCoord)
        const d = project(load.destCoord)
        const top = topIds.includes(load.id)
        const color = !load.eligible ? '#f0506e' : top ? '#f5a623' : '#3a82c4'
        return (
          <g key={load.id}>
            {top && (
              <motion.line
                x1={o.x}
                y1={o.y}
                x2={d.x}
                y2={d.y}
                stroke="#f5a623"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.8 }}
                transition={{ duration: 0.7, delay: 0.2 + i * 0.05 }}
              />
            )}
            <motion.circle
              cx={d.x}
              cy={d.y}
              r={top ? 5 : 3.5}
              fill={color}
              initial={{ scale: 0, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.1 + i * 0.07 }}
              style={{ originX: `${d.x}px`, originY: `${d.y}px` }}
            />
            {top && (
              <motion.circle
                cx={d.x}
                cy={d.y}
                r="5"
                fill="none"
                stroke="#f5a623"
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 2.6, opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity, delay: 0.3 + i * 0.05 }}
                style={{ originX: `${d.x}px`, originY: `${d.y}px` }}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}
