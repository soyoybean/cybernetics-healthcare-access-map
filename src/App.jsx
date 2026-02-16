import { useMemo, useState } from 'react'
import './App.css'

const NODE_WIDTH = 186
const NODE_HEIGHT = 54

const nodes = [
  {
    id: 'investors',
    label: 'Investors',
    group: 'companies',
    x: 1110,
    y: 74,
    description: 'Allocate capital and influence company risk appetite.',
  },
  {
    id: 'business_exec',
    label: 'Business Executives',
    group: 'companies',
    x: 780,
    y: 84,
    description: 'Set strategy, budget, and launch priorities.',
  },
  {
    id: 'product_mgr',
    label: 'Product Managers',
    group: 'companies',
    x: 780,
    y: 152,
    description: 'Define scope, success metrics, and release plans.',
  },
  {
    id: 'engineers',
    label: 'Engineers',
    group: 'companies',
    x: 780,
    y: 220,
    description: 'Implement technical systems and constraints.',
  },
  {
    id: 'designers',
    label: 'Designers',
    group: 'companies',
    x: 780,
    y: 288,
    description: 'Shape UX patterns, accessibility, and communication.',
  },
  {
    id: 'researchers',
    label: 'Researchers',
    group: 'companies',
    x: 780,
    y: 356,
    description: 'Collect user evidence and uncover unmet needs.',
  },
  {
    id: 'physical_products',
    label: 'Physical Products',
    group: 'products',
    x: 184,
    y: 248,
    description: 'Devices, equipment, packaging, and physical touchpoints.',
  },
  {
    id: 'digital_services',
    label: 'Services & Digital Products',
    group: 'products',
    x: 384,
    y: 248,
    description: 'Portals, telehealth, apps, scheduling, and care workflows.',
  },
  {
    id: 'clinicians',
    label: 'Clinicians',
    group: 'authorizers',
    x: 700,
    y: 492,
    description: 'Gatekeep care decisions and influence treatment pathways.',
  },
  {
    id: 'insurers',
    label: 'Insurers',
    group: 'authorizers',
    x: 900,
    y: 492,
    description: 'Control reimbursement, coverage, and utilization rules.',
  },
  {
    id: 'regulators',
    label: 'Regulators',
    group: 'authorizers',
    x: 1100,
    y: 492,
    description: 'Set legal standards for safety, privacy, and equity.',
  },
  {
    id: 'physical_barrier',
    label: 'Physical Barrier',
    group: 'barriers',
    x: 176,
    y: 692,
    description: 'Mobility, distance, infrastructure, and environmental obstacles.',
  },
  {
    id: 'information_barrier',
    label: 'Information Barrier',
    group: 'barriers',
    x: 364,
    y: 692,
    description: 'Low health literacy, inaccessible content, and hidden options.',
  },
  {
    id: 'attitudinal_barrier',
    label: 'Attitudinal Barrier',
    group: 'barriers',
    x: 552,
    y: 692,
    description: 'Bias, stigma, and harmful assumptions in interactions.',
  },
  {
    id: 'policy_barrier',
    label: 'Policy Barrier',
    group: 'barriers',
    x: 740,
    y: 692,
    description: 'Rules, eligibility constraints, and procedural friction.',
  },
  {
    id: 'social_barrier',
    label: 'Social Barrier',
    group: 'barriers',
    x: 928,
    y: 692,
    description: 'Isolation, mistrust, language mismatch, and weak support.',
  },
  {
    id: 'economic_barrier',
    label: 'Economic Barrier',
    group: 'barriers',
    x: 1116,
    y: 692,
    description: 'Unaffordable costs, unstable income, and benefit cliffs.',
  },
  {
    id: 'community_orgs',
    label: 'Community Orgs',
    group: 'outcomes',
    x: 456,
    y: 838,
    description: 'Bridge institutions and residents through trusted support.',
  },
  {
    id: 'person_disability',
    label: 'Person w/ Disability',
    group: 'outcomes',
    x: 706,
    y: 838,
    description: 'Carries the cumulative burden of compounded barriers.',
  },
  {
    id: 'caregivers',
    label: 'Caregivers',
    group: 'outcomes',
    x: 894,
    y: 838,
    description: 'Absorb coordination, time, emotional, and financial strain.',
  },
  {
    id: 'employers',
    label: 'Employers',
    group: 'outcomes',
    x: 1082,
    y: 838,
    description: 'Shape schedule flexibility, leave, and workplace accommodations.',
  },
]

const links = [
  { source: 'investors', target: 'business_exec', relation: 'fund', text: 'fund long-horizon strategy at', polarity: 'neutral', strength: 3 },
  { source: 'business_exec', target: 'product_mgr', relation: 'prioritize', text: 'set delivery and revenue pressure for', polarity: 'neutral', strength: 3 },
  { source: 'product_mgr', target: 'engineers', relation: 'scope', text: 'translate business goals into scope for', polarity: 'neutral', strength: 2 },
  { source: 'product_mgr', target: 'designers', relation: 'brief', text: 'define target journeys and tradeoffs for', polarity: 'neutral', strength: 2 },
  { source: 'researchers', target: 'product_mgr', relation: 'insight', text: 'surface unmet access needs to', polarity: 'improves', strength: 2 },
  { source: 'engineers', target: 'digital_services', relation: 'create', text: 'build platform rules and interfaces for', polarity: 'neutral', strength: 3 },
  { source: 'designers', target: 'digital_services', relation: 'create', text: 'shape interaction patterns used in', polarity: 'neutral', strength: 3 },
  { source: 'business_exec', target: 'physical_products', relation: 'approve', text: 'approve manufacturing and rollout of', polarity: 'neutral', strength: 2 },
  { source: 'product_mgr', target: 'physical_products', relation: 'roadmap', text: 'prioritize feature roadmaps in', polarity: 'neutral', strength: 2 },
  { source: 'clinicians', target: 'digital_services', relation: 'adopt', text: 'drive adoption patterns for', polarity: 'neutral', strength: 2 },
  { source: 'insurers', target: 'digital_services', relation: 'approve', text: 'approve reimbursement conditions around', polarity: 'neutral', strength: 3 },
  { source: 'regulators', target: 'digital_services', relation: 'enforce', text: 'enforce compliance constraints on', polarity: 'neutral', strength: 3 },
  { source: 'regulators', target: 'physical_products', relation: 'enforce', text: 'regulate quality and safety requirements for', polarity: 'neutral', strength: 2 },

  { source: 'physical_products', target: 'physical_barrier', relation: 'cause', text: 'can increase environmental mismatch, raising', polarity: 'worsens', strength: 3 },
  { source: 'physical_products', target: 'economic_barrier', relation: 'cause', text: 'can add device and maintenance costs, increasing', polarity: 'worsens', strength: 2 },
  { source: 'digital_services', target: 'information_barrier', relation: 'cause', text: 'can be hard to navigate, worsening', polarity: 'worsens', strength: 3 },
  { source: 'digital_services', target: 'policy_barrier', relation: 'cause', text: 'can encode rigid rules, amplifying', polarity: 'worsens', strength: 2 },
  { source: 'digital_services', target: 'social_barrier', relation: 'cause', text: 'can reduce trust when culturally misaligned, worsening', polarity: 'worsens', strength: 2 },

  { source: 'clinicians', target: 'attitudinal_barrier', relation: 'bias', text: 'can reinforce bias and power imbalance, raising', polarity: 'worsens', strength: 3 },
  { source: 'clinicians', target: 'policy_barrier', relation: 'gatekeep', text: 'can unintentionally add referral friction, increasing', polarity: 'worsens', strength: 2 },
  { source: 'insurers', target: 'economic_barrier', relation: 'cost-share', text: 'can shift costs to families, increasing', polarity: 'worsens', strength: 3 },
  { source: 'insurers', target: 'policy_barrier', relation: 'authorize', text: 'can create prior-authorization complexity, amplifying', polarity: 'worsens', strength: 3 },
  { source: 'regulators', target: 'policy_barrier', relation: 'complexity', text: 'can introduce fragmented rules that worsen', polarity: 'worsens', strength: 2 },

  { source: 'physical_barrier', target: 'person_disability', relation: 'burden', text: 'directly burdens', polarity: 'worsens', strength: 3 },
  { source: 'information_barrier', target: 'person_disability', relation: 'burden', text: 'directly burdens', polarity: 'worsens', strength: 3 },
  { source: 'attitudinal_barrier', target: 'person_disability', relation: 'burden', text: 'directly burdens', polarity: 'worsens', strength: 3 },
  { source: 'policy_barrier', target: 'person_disability', relation: 'burden', text: 'directly burdens', polarity: 'worsens', strength: 3 },
  { source: 'social_barrier', target: 'person_disability', relation: 'burden', text: 'directly burdens', polarity: 'worsens', strength: 3 },
  { source: 'economic_barrier', target: 'person_disability', relation: 'burden', text: 'directly burdens', polarity: 'worsens', strength: 3 },

  { source: 'person_disability', target: 'caregivers', relation: 'shift', text: 'transfers coordination burden to', polarity: 'worsens', strength: 2 },
  { source: 'economic_barrier', target: 'caregivers', relation: 'strain', text: 'adds out-of-pocket stress for', polarity: 'worsens', strength: 2 },
  { source: 'caregivers', target: 'employers', relation: 'attendance', text: 'increase schedule volatility experienced by', polarity: 'worsens', strength: 1 },
  { source: 'employers', target: 'economic_barrier', relation: 'benefits', text: 'can reduce financial pressure through accommodations, easing', polarity: 'improves', strength: 2 },

  { source: 'community_orgs', target: 'information_barrier', relation: 'mitigate', text: 'provide navigation support that reduces', polarity: 'improves', strength: 3 },
  { source: 'community_orgs', target: 'social_barrier', relation: 'mitigate', text: 'build trust and belonging, lowering', polarity: 'improves', strength: 3 },
  { source: 'community_orgs', target: 'attitudinal_barrier', relation: 'mitigate', text: 'challenge stigma and reduce', polarity: 'improves', strength: 2 },
  { source: 'person_disability', target: 'community_orgs', relation: 'engage', text: 'shares lived experience with', polarity: 'improves', strength: 2 },
  { source: 'caregivers', target: 'community_orgs', relation: 'organize', text: 'co-design practical supports with', polarity: 'improves', strength: 2 },
  { source: 'person_disability', target: 'researchers', relation: 'feedback', text: 'contribute lived evidence to', polarity: 'improves', strength: 2 },
  { source: 'community_orgs', target: 'regulators', relation: 'advocacy', text: 'apply policy pressure to', polarity: 'improves', strength: 2 },
  { source: 'researchers', target: 'designers', relation: 'evidence', text: 'provide accessibility evidence to', polarity: 'improves', strength: 2 },
  { source: 'researchers', target: 'clinicians', relation: 'training', text: 'inform equity-focused practice for', polarity: 'improves', strength: 2 },
].map((link, index) => ({ ...link, id: `link-${index}` }))

const groupStyles = {
  companies: { fill: '#fef5d6', stroke: '#cc9f1d' },
  products: { fill: '#dff2ff', stroke: '#2f79a9' },
  authorizers: { fill: '#f8e9f2', stroke: '#b65790' },
  barriers: { fill: '#fde3df', stroke: '#bf4f43' },
  outcomes: { fill: '#e8f8e0', stroke: '#5e9f4f' },
}

const sectionLabels = [
  { text: 'Products & Services', x: 160, y: 172 },
  { text: 'Companies', x: 760, y: 34 },
  { text: 'Authorizers', x: 666, y: 442 },
  { text: 'Access Barriers', x: 126, y: 642 },
  { text: 'People & Supports', x: 402, y: 786 },
]

const sentenceFromLink = (link, byId) =>
  `${byId[link.source].label} ${link.text} ${byId[link.target].label}.`

const buildNarrative = ({ startId, bySource, byTarget, byId }) => {
  const forward = []
  const backward = []
  const usedForward = new Set()
  const usedBackward = new Set()
  const forwardEdgeIds = new Set()
  const backwardEdgeIds = new Set()

  const queue = [{ nodeId: startId, depth: 0 }]
  while (queue.length && forward.length < 8) {
    const current = queue.shift()
    if (current.depth >= 4) {
      continue
    }

    const outgoing = (bySource[current.nodeId] || [])
      .slice()
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 3)

    outgoing.forEach((link) => {
      if (usedForward.has(link.id) || forward.length >= 8) {
        return
      }

      usedForward.add(link.id)
      forwardEdgeIds.add(link.id)
      forward.push(sentenceFromLink(link, byId))
      queue.push({ nodeId: link.target, depth: current.depth + 1 })
    })
  }

  const backQueue = [{ nodeId: startId, depth: 0 }]
  while (backQueue.length && backward.length < 6) {
    const current = backQueue.shift()
    if (current.depth >= 3) {
      continue
    }

    const incoming = (byTarget[current.nodeId] || [])
      .slice()
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 2)

    incoming.forEach((link) => {
      if (usedBackward.has(link.id) || backward.length >= 6) {
        return
      }

      usedBackward.add(link.id)
      backwardEdgeIds.add(link.id)
      backward.push(sentenceFromLink(link, byId))
      backQueue.push({ nodeId: link.source, depth: current.depth + 1 })
    })
  }

  return { forward, backward, forwardEdgeIds, backwardEdgeIds }
}

const getEdgeColor = (polarity) => {
  if (polarity === 'worsens') {
    return '#cf3d3d'
  }
  if (polarity === 'improves') {
    return '#2f8f59'
  }
  return '#6f6f6f'
}

const buildCurve = (sourceNode, targetNode) => {
  const dx = targetNode.x - sourceNode.x
  const dy = targetNode.y - sourceNode.y
  const distance = Math.hypot(dx, dy)
  const unitX = distance === 0 ? 0 : dx / distance
  const unitY = distance === 0 ? 0 : dy / distance

  const startX = sourceNode.x + unitX * 35
  const startY = sourceNode.y + unitY * 24
  const endX = targetNode.x - unitX * 35
  const endY = targetNode.y - unitY * 24

  const curve = Math.max(-140, Math.min(140, dx * 0.08))
  const controlY = (startY + endY) / 2 + curve

  return `M ${startX} ${startY} C ${startX} ${controlY}, ${endX} ${controlY}, ${endX} ${endY}`
}

function App() {
  const [selectedNodeId, setSelectedNodeId] = useState('person_disability')

  const nodesById = useMemo(
    () => Object.fromEntries(nodes.map((node) => [node.id, node])),
    [],
  )

  const { bySource, byTarget } = useMemo(() => {
    const sourceMap = {}
    const targetMap = {}

    links.forEach((link) => {
      if (!sourceMap[link.source]) {
        sourceMap[link.source] = []
      }
      if (!targetMap[link.target]) {
        targetMap[link.target] = []
      }
      sourceMap[link.source].push(link)
      targetMap[link.target].push(link)
    })

    return { bySource: sourceMap, byTarget: targetMap }
  }, [])

  const selectedNode = nodesById[selectedNodeId]

  const narrative = useMemo(
    () => buildNarrative({ startId: selectedNodeId, bySource, byTarget, byId: nodesById }),
    [selectedNodeId, bySource, byTarget, nodesById],
  )

  const directConnections = useMemo(
    () =>
      links.filter(
        (link) => link.source === selectedNodeId || link.target === selectedNodeId,
      ),
    [selectedNodeId],
  )

  const highlightedEdgeIds = useMemo(() => {
    const ids = new Set()
    directConnections.forEach((link) => ids.add(link.id))
    narrative.forwardEdgeIds.forEach((id) => ids.add(id))
    narrative.backwardEdgeIds.forEach((id) => ids.add(id))
    return ids
  }, [directConnections, narrative.forwardEdgeIds, narrative.backwardEdgeIds])

  const highlightedNodeIds = useMemo(() => {
    const ids = new Set([selectedNodeId])
    links.forEach((link) => {
      if (highlightedEdgeIds.has(link.id)) {
        ids.add(link.source)
        ids.add(link.target)
      }
    })
    return ids
  }, [selectedNodeId, highlightedEdgeIds])

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Healthcare Access Stakeholder Causal Map</h1>
        <p>
          Click any stakeholder, barrier, or outcome node to trace how effects
          propagate across the system.
        </p>
      </header>

      <main className="app-layout">
        <section className="map-panel" aria-label="Interactive causal map">
          <svg viewBox="0 0 1260 920" role="img" aria-labelledby="mapTitle">
            <title id="mapTitle">Interactive stakeholder causal network</title>

            <defs>
              <marker
                id="arrow-neutral"
                markerWidth="10"
                markerHeight="10"
                refX="7"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L8,3 L0,6 Z" fill="#6f6f6f" />
              </marker>
              <marker
                id="arrow-worsens"
                markerWidth="10"
                markerHeight="10"
                refX="7"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L8,3 L0,6 Z" fill="#cf3d3d" />
              </marker>
              <marker
                id="arrow-improves"
                markerWidth="10"
                markerHeight="10"
                refX="7"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L8,3 L0,6 Z" fill="#2f8f59" />
              </marker>
            </defs>

            {sectionLabels.map((section) => (
              <text
                className="section-title"
                key={section.text}
                x={section.x}
                y={section.y}
              >
                {section.text}
              </text>
            ))}

            {links.map((link) => {
              const sourceNode = nodesById[link.source]
              const targetNode = nodesById[link.target]
              const highlighted = highlightedEdgeIds.has(link.id)

              return (
                <g key={link.id}>
                  <path
                    d={buildCurve(sourceNode, targetNode)}
                    className={`edge ${highlighted ? 'highlighted' : ''}`}
                    stroke={getEdgeColor(link.polarity)}
                    markerEnd={`url(#arrow-${link.polarity})`}
                  />
                  {highlighted && (
                    <text
                      className="edge-label"
                      x={(sourceNode.x + targetNode.x) / 2}
                      y={(sourceNode.y + targetNode.y) / 2 - 8}
                    >
                      {link.relation}
                    </text>
                  )}
                </g>
              )
            })}

            {nodes.map((node) => {
              const style = groupStyles[node.group]
              const isSelected = node.id === selectedNodeId
              const isConnected = highlightedNodeIds.has(node.id)

              return (
                <g
                  key={node.id}
                  className={`node-group ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedNodeId(node.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedNodeId(node.id)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Focus ${node.label}`}
                >
                  <rect
                    x={node.x - NODE_WIDTH / 2}
                    y={node.y - NODE_HEIGHT / 2}
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx="10"
                    fill={style.fill}
                    stroke={style.stroke}
                    className={`node-rect ${isConnected ? 'connected' : ''}`}
                  />
                  <text className="node-label" x={node.x} y={node.y + 5}>
                    {node.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </section>

        <aside className="narration-panel">
          <h2>{selectedNode.label}</h2>
          <p className="node-description">{selectedNode.description}</p>

          <div className="legend">
            <span><i className="swatch worsen" /> increases burden</span>
            <span><i className="swatch improve" /> reduces burden</span>
            <span><i className="swatch neutral" /> operational link</span>
          </div>

          <h3>Direct Effects</h3>
          <ul>
            {directConnections.slice(0, 8).map((link) => (
              <li key={link.id}>{sentenceFromLink(link, nodesById)}</li>
            ))}
          </ul>

          <h3>Forward Narrative Chain</h3>
          <ol>
            {narrative.forward.length > 0 ? (
              narrative.forward.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)
            ) : (
              <li>No outgoing pathways in this model.</li>
            )}
          </ol>

          <h3>Who Shapes This Node</h3>
          <ol>
            {narrative.backward.length > 0 ? (
              narrative.backward.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)
            ) : (
              <li>No upstream influences in this model.</li>
            )}
          </ol>
        </aside>
      </main>
    </div>
  )
}

export default App
