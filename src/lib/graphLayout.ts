export type GraphLink = { source: string; target: string; weight: number }
export type GraphPoint = { x: number; y: number }

/**
 * Simulation force-directed minimaliste : répulsion entre tous les nœuds, attraction le long des
 * liens, force de recentrage. Calculée une fois à l'ouverture (pas en continu) — largement
 * suffisant pour quelques dizaines/centaines de notes, sans avoir besoin d'une vraie librairie de
 * graphe pour ça.
 */
export function layoutGraph(
  nodeIds: string[],
  links: GraphLink[],
  width: number,
  height: number,
  iterations = 300,
): Map<string, GraphPoint> {
  type Node = { x: number; y: number; vx: number; vy: number }
  const nodes = new Map<string, Node>(
    nodeIds.map((id, i) => {
      const angle = (i / Math.max(1, nodeIds.length)) * Math.PI * 2
      const radius = Math.min(width, height) * 0.3
      return [
        id,
        {
          x: width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
          y: height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
          vx: 0,
          vy: 0,
        },
      ]
    }),
  )

  const REPULSION = 2200
  const SPRING = 0.02
  const SPRING_LENGTH = 90
  const CENTER_PULL = 0.01
  const DAMPING = 0.85

  for (let iter = 0; iter < iterations; iter++) {
    for (const a of nodeIds) {
      const na = nodes.get(a)!
      for (const b of nodeIds) {
        if (a === b) continue
        const nb = nodes.get(b)!
        const dx = na.x - nb.x
        const dy = na.y - nb.y
        let distSq = dx * dx + dy * dy
        if (distSq < 1) distSq = 1
        const dist = Math.sqrt(distSq)
        const force = REPULSION / distSq
        na.vx += (dx / dist) * force
        na.vy += (dy / dist) * force
      }
      na.vx += (width / 2 - na.x) * CENTER_PULL
      na.vy += (height / 2 - na.y) * CENTER_PULL
    }

    links.forEach((l) => {
      const a = nodes.get(l.source)
      const b = nodes.get(l.target)
      if (!a || !b) return
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const targetLength = SPRING_LENGTH * (1.6 - Math.min(1, l.weight))
      const force = (dist - targetLength) * SPRING
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.vx += fx
      a.vy += fy
      b.vx -= fx
      b.vy -= fy
    })

    for (const id of nodeIds) {
      const n = nodes.get(id)!
      n.vx *= DAMPING
      n.vy *= DAMPING
      n.x += n.vx
      n.y += n.vy
    }
  }

  const out = new Map<string, GraphPoint>()
  nodes.forEach((n, id) => out.set(id, { x: n.x, y: n.y }))
  return out
}
