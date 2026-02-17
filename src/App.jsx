import { memo, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import storiesData from './data/stories.json'
import {
  createComment,
  deleteComment,
  fetchComments,
  updateComment,
} from './commentsApi'

const BASE_WIDTH = 1700
const BASE_HEIGHT = 1220
const SCALE_FACTOR = 1.35
const NODE_WIDTH = 210
const NODE_HEIGHT = 62

const groupMeta = {
  companies: { label: 'Companies', fill: '#fef5d6', stroke: '#b88d16' },
  products: { label: 'Products & Services', fill: '#dff2ff', stroke: '#2f79a9' },
  authorizers: { label: 'Authorizers', fill: '#f8e9f2', stroke: '#a54d81' },
  barriers: { label: 'Barriers', fill: '#fde3df', stroke: '#bf4f43' },
  outcomes: { label: 'People & Supports', fill: '#e8f8e0', stroke: '#5e9f4f' },
}

const edgeStyle = {
  'burden+': { color: '#0072B2', label: 'burden+ (increases burden)' },
  'burden-': { color: '#E69F00', label: 'burden- (reduces burden)' },
  operational: { color: '#7F7F7F', label: 'operational (neutral link)' },
  feedback: { color: '#7F7F7F', label: 'feedback loop' },
}

const baseNodes = [
  { id: 'investors', label: 'Investors', group: 'companies', x: 1110, y: 78, summary: 'Influence funding horizons and risk expectations.' },
  { id: 'business_exec', label: 'Business Executives', group: 'companies', x: 780, y: 94, summary: 'Set strategic priorities and budget boundaries.' },
  { id: 'product_mgr', label: 'Product Managers', group: 'companies', x: 780, y: 170, summary: 'Translate strategy into roadmap scope decisions.' },
  { id: 'engineers', label: 'Engineers', group: 'companies', x: 780, y: 246, summary: 'Implement system logic that shapes access.' },
  { id: 'designers', label: 'Designers', group: 'companies', x: 780, y: 322, summary: 'Define interaction friction and accessibility patterns.' },
  { id: 'researchers', label: 'Researchers', group: 'companies', x: 780, y: 398, summary: 'Surface evidence from lived experience.' },

  { id: 'physical_products', label: 'Physical Products', group: 'products', x: 210, y: 280, summary: 'Devices and physical touchpoints can enable or obstruct access.' },
  { id: 'digital_services', label: 'Services & Digital Products', group: 'products', x: 456, y: 280, summary: 'Digital pathways shape navigation and eligibility experience.' },

  { id: 'clinicians', label: 'Clinicians', group: 'authorizers', x: 700, y: 560, summary: 'Gatekeeping and referral behavior affect care flow.' },
  { id: 'insurers', label: 'Insurers', group: 'authorizers', x: 948, y: 560, summary: 'Coverage and authorization rules mediate access.' },
  { id: 'regulators', label: 'Regulators', group: 'authorizers', x: 1190, y: 560, summary: 'Regulatory design influences policy complexity.' },

  { id: 'physical_barrier', label: 'Physical Barrier', group: 'barriers', x: 170, y: 820, summary: 'Mobility and infrastructure mismatch.' },
  { id: 'information_barrier', label: 'Information Barrier', group: 'barriers', x: 418, y: 820, summary: 'Navigation complexity and hidden options.' },
  { id: 'attitudinal_barrier', label: 'Attitudinal Barrier', group: 'barriers', x: 662, y: 820, summary: 'Bias and stigma in care interactions.' },
  { id: 'policy_barrier', label: 'Policy Barrier', group: 'barriers', x: 906, y: 820, summary: 'Administrative and procedural friction.' },
  { id: 'social_barrier', label: 'Social Barrier', group: 'barriers', x: 1150, y: 820, summary: 'Trust and social support mismatch.' },
  { id: 'economic_barrier', label: 'Economic Barrier', group: 'barriers', x: 1390, y: 820, summary: 'Cost pressure and income instability.' },

  { id: 'community_orgs', label: 'Community Orgs', group: 'outcomes', x: 520, y: 1042, summary: 'Trusted bridge for navigation and support.' },
  { id: 'person_disability', label: 'Person w/ Disability', group: 'outcomes', x: 844, y: 1042, summary: 'Receives compounded effects from system barriers.' },
  { id: 'caregivers', label: 'Caregivers', group: 'outcomes', x: 1090, y: 1042, summary: 'Carry hidden labor from system friction.' },
  { id: 'employers', label: 'Employers', group: 'outcomes', x: 1360, y: 1042, summary: 'Workplace flexibility influences stability.' },
]

const nodes = baseNodes.map((node) => ({
  ...node,
  description: node.description || node.summary,
  x: Math.round(node.x * SCALE_FACTOR),
  y: Math.round(node.y * SCALE_FACTOR),
}))

const rawLinks = [
  { source: 'investors', target: 'business_exec', verb: 'funds', edgeType: 'operational', note: 'Capital pressure shapes delivery horizon.', strength: 3, story: 'Capital expectations influence strategic priorities.' },
  { source: 'business_exec', target: 'product_mgr', verb: 'prioritizes', edgeType: 'operational', note: 'Executive KPIs set scope pressure.', strength: 3, story: 'Executive priorities constrain roadmap choices.' },
  { source: 'product_mgr', target: 'engineers', verb: 'scopes', edgeType: 'operational', note: 'Scope choices determine implementation tradeoffs.', strength: 2, story: 'Roadmap scope directs technical implementation.' },
  { source: 'product_mgr', target: 'designers', verb: 'briefs', edgeType: 'operational', note: 'Journey framing shapes UX quality.', strength: 2, story: 'Product briefing determines experience priorities.' },
  { source: 'researchers', target: 'product_mgr', verb: 'informs', edgeType: 'burden-', note: 'Evidence can reduce blind spots.', strength: 2, story: 'Research insights can reduce avoidable burden.' },
  { source: 'engineers', target: 'digital_services', verb: 'implements', edgeType: 'operational', note: 'Technical defaults become user reality.', strength: 3, story: 'Engineering choices become service behavior.' },
  { source: 'designers', target: 'digital_services', verb: 'designs', edgeType: 'operational', note: 'IA complexity affects usability.', strength: 3, story: 'Design quality shapes navigation burden.' },
  { source: 'business_exec', target: 'physical_products', verb: 'approves', edgeType: 'operational', note: 'Approval controls rollout quality.', strength: 2, story: 'Approval cycles affect physical access quality.' },
  { source: 'product_mgr', target: 'physical_products', verb: 'roadmaps', edgeType: 'operational', note: 'Roadmaps influence access timing.', strength: 2, story: 'Roadmap timing changes who receives support first.' },

  { source: 'clinicians', target: 'digital_services', verb: 'adopts', edgeType: 'operational', note: 'Workflow fit changes clinical usage.', strength: 2, story: 'Clinical adoption determines real-world usage.' },
  { source: 'insurers', target: 'digital_services', verb: 'authorizes', edgeType: 'operational', note: 'Coverage rules gate service use.', strength: 3, story: 'Authorization policy gates digital pathway access.' },
  { source: 'regulators', target: 'digital_services', verb: 'regulates', edgeType: 'operational', note: 'Compliance constraints alter designs.', strength: 3, story: 'Regulation shapes permissible service behavior.' },
  { source: 'regulators', target: 'physical_products', verb: 'regulates', edgeType: 'operational', note: 'Safety standards affect deployment.', strength: 2, story: 'Regulatory standards influence physical rollout.' },

  { source: 'physical_products', target: 'physical_barrier', verb: 'increases', edgeType: 'burden+', note: 'Poor fit increases mobility friction.', strength: 3, story: 'Physical mismatch increases movement burden.' },
  { source: 'physical_products', target: 'economic_barrier', verb: 'shifts burden to', edgeType: 'burden+', note: 'Maintenance costs transfer to households.', strength: 2, story: 'Ownership costs raise household financial pressure.' },
  { source: 'digital_services', target: 'information_barrier', verb: 'increases', edgeType: 'burden+', note: 'Complex flows raise cognitive load.', strength: 3, story: 'Digital complexity increases information burden.' },
  { source: 'digital_services', target: 'policy_barrier', verb: 'encodes', edgeType: 'burden+', note: 'Rigid forms hard-code eligibility friction.', strength: 2, story: 'Service logic can lock in policy friction.' },
  { source: 'digital_services', target: 'social_barrier', verb: 'mediates', edgeType: 'burden+', note: 'Cultural mismatch erodes trust.', strength: 2, story: 'Design mismatch can reduce trust and engagement.' },

  { source: 'clinicians', target: 'attitudinal_barrier', verb: 'can reinforce', edgeType: 'burden+', note: 'Bias can lower care quality.', strength: 3, story: 'Unexamined bias increases attitudinal burden.' },
  { source: 'clinicians', target: 'policy_barrier', verb: 'gatekeeps', edgeType: 'burden+', note: 'Referrals can delay entry.', strength: 2, story: 'Gatekeeping can delay service entry.' },
  { source: 'insurers', target: 'economic_barrier', verb: 'increases', edgeType: 'burden+', note: 'Cost-sharing raises out-of-pocket risk.', strength: 3, story: 'Benefit design increases family cost burden.' },
  { source: 'insurers', target: 'policy_barrier', verb: 'delays', edgeType: 'burden+', note: 'Prior auth slows access.', strength: 3, story: 'Authorization workflows delay care progression.' },
  { source: 'regulators', target: 'policy_barrier', verb: 'mediates', edgeType: 'burden+', note: 'Fragmented rules add friction.', strength: 2, story: 'Policy complexity amplifies administrative burden.' },

  { source: 'physical_barrier', target: 'person_disability', verb: 'increases burden for', edgeType: 'burden+', note: 'Mobility mismatch blocks service completion.', strength: 3, story: 'Physical barriers raise daily access burden.' },
  { source: 'information_barrier', target: 'person_disability', verb: 'increases burden for', edgeType: 'burden+', note: 'Unclear options delay decisions.', strength: 3, story: 'Information gaps increase uncertainty and delay.' },
  { source: 'attitudinal_barrier', target: 'person_disability', verb: 'increases burden for', edgeType: 'burden+', note: 'Stigma reduces trust and retention.', strength: 3, story: 'Stigma increases emotional and practical burden.' },
  { source: 'policy_barrier', target: 'person_disability', verb: 'increases burden for', edgeType: 'burden+', note: 'Procedural steps delay treatment.', strength: 3, story: 'Policy friction adds repeat administrative burden.' },
  { source: 'social_barrier', target: 'person_disability', verb: 'increases burden for', edgeType: 'burden+', note: 'Weak support lowers continuity.', strength: 3, story: 'Social mismatch undermines sustained engagement.' },
  { source: 'economic_barrier', target: 'person_disability', verb: 'increases burden for', edgeType: 'burden+', note: 'Cost pressure disrupts continuity.', strength: 3, story: 'Economic pressure destabilizes ongoing care.' },

  { source: 'person_disability', target: 'caregivers', verb: 'shifts burden to', edgeType: 'burden+', note: 'Unmet needs transfer coordination labor.', strength: 2, story: 'System burden shifts into caregiver labor.' },
  { source: 'economic_barrier', target: 'caregivers', verb: 'increases strain on', edgeType: 'burden+', note: 'Costs spill into household budgets.', strength: 2, story: 'Financial strain increases caregiver stress.' },
  { source: 'caregivers', target: 'employers', verb: 'disrupts', edgeType: 'burden+', note: 'Care demands reduce work predictability.', strength: 1, story: 'Care duties disrupt attendance stability.' },
  { source: 'employers', target: 'economic_barrier', verb: 'reduces', edgeType: 'burden-', note: 'Flexible supports can stabilize income.', strength: 2, story: 'Workplace flexibility can reduce financial burden.' },

  { source: 'community_orgs', target: 'information_barrier', verb: 'reduces', edgeType: 'burden-', note: 'Navigation support clarifies choices.', strength: 3, story: 'Trusted navigation lowers information burden.' },
  { source: 'community_orgs', target: 'social_barrier', verb: 'reduces', edgeType: 'burden-', note: 'Trust-building improves engagement.', strength: 3, story: 'Community trust reduces social barriers.' },
  { source: 'community_orgs', target: 'attitudinal_barrier', verb: 'reduces', edgeType: 'burden-', note: 'Advocacy can challenge bias.', strength: 2, story: 'Community advocacy can reduce stigma effects.' },
  { source: 'person_disability', target: 'community_orgs', verb: 'partners with', edgeType: 'operational', note: 'Lived expertise informs local support.', strength: 2, story: 'Lived experience strengthens community responses.' },
  { source: 'caregivers', target: 'community_orgs', verb: 'co-designs with', edgeType: 'operational', note: 'Collaboration creates practical support.', strength: 2, story: 'Caregiver organizing improves local support pathways.' },
  { source: 'person_disability', target: 'researchers', verb: 'informs', edgeType: 'burden-', note: 'Outcome feedback sharpens evidence.', strength: 2, story: 'Lived feedback improves system understanding.' },
  { source: 'community_orgs', target: 'regulators', verb: 'pressures', edgeType: 'operational', note: 'Advocacy can trigger policy change.', strength: 2, story: 'Community advocacy can influence regulation.' },
  { source: 'researchers', target: 'designers', verb: 'informs', edgeType: 'burden-', note: 'Evidence improves accessibility choices.', strength: 2, story: 'Evidence-led design reduces avoidable friction.' },
  { source: 'researchers', target: 'clinicians', verb: 'trains', edgeType: 'burden-', note: 'Equity training can reduce bias.', strength: 2, story: 'Training can reduce attitudinal barriers.' },

  { source: 'policy_barrier', target: 'insurers', verb: 'feeds back to', edgeType: 'feedback', note: 'Complex rules can reinforce stricter control.', strength: 1, story: 'Complex policy can reinforce insurer gatekeeping.' },
]

const links = rawLinks.map((link, index) => ({ ...link, id: `link-${index}` }))

const sectionLabels = [
  { text: 'Products & Services', x: 150 * SCALE_FACTOR, y: 180 * SCALE_FACTOR },
  { text: 'Companies', x: 760 * SCALE_FACTOR, y: 40 * SCALE_FACTOR },
  { text: 'Authorizers', x: 640 * SCALE_FACTOR, y: 500 * SCALE_FACTOR },
  { text: 'Access Barriers', x: 110 * SCALE_FACTOR, y: 760 * SCALE_FACTOR },
  { text: 'People & Supports', x: 420 * SCALE_FACTOR, y: 980 * SCALE_FACTOR },
]

const truncate = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1)}…`)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const sentenceFromLink = (link, byId) => `${byId[link.source].label} -> ${link.verb} -> ${byId[link.target].label}`

const isSmallScreen = () => window.matchMedia('(max-width: 1080px)').matches

const parseStateFromUrl = () => {
  const params = new URLSearchParams(window.location.search)
  const selectedNode = ''
  const depth = Number(params.get('depth') || '1')
  const activeStory = ''
  const filters = {
    companies: params.get('f_companies') !== '0',
    products: params.get('f_products') !== '0',
    authorizers: params.get('f_authorizers') !== '0',
    barriers: params.get('f_barriers') !== '0',
    outcomes: params.get('f_outcomes') !== '0',
  }
  return { selectedNode, depth: [1, 2, 3].includes(depth) ? depth : 1, activeStory, filters }
}

const getRectAnchor = (from, to, padding = 14) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (dx === 0 && dy === 0) {
    return { x: from.x, y: from.y }
  }

  const halfW = NODE_WIDTH / 2 + padding
  const halfH = NODE_HEIGHT / 2 + padding

  const tx = dx === 0 ? Infinity : Math.abs(halfW / dx)
  const ty = dy === 0 ? Infinity : Math.abs(halfH / dy)
  const t = Math.min(tx, ty)

  return {
    x: from.x + dx * t,
    y: from.y + dy * t,
  }
}

const buildCurve = (source, target) => {
  const start = getRectAnchor(source, target, 14)
  const end = getRectAnchor(target, source, 16)
  const dx = end.x - start.x
  const dy = end.y - start.y
  const distance = Math.hypot(dx, dy)
  const unitX = distance === 0 ? 0 : dx / distance
  const unitY = distance === 0 ? 0 : dy / distance
  const startX = start.x
  const startY = start.y
  const endX = end.x
  const endY = end.y
  const curve = Math.max(-180, Math.min(180, (target.x - source.x) * 0.09))
  const controlY = (startY + endY) / 2 + curve

  return {
    path: `M ${startX} ${startY} C ${startX} ${controlY}, ${endX} ${controlY}, ${endX} ${endY}`,
    midX: (startX + endX) / 2,
    midY: (startY + endY) / 2,
    endX,
    endY,
    unitX,
    unitY,
  }
}

const isInsideNodeBounds = (x, y, node) => {
  const halfW = NODE_WIDTH / 2 + 16
  const halfH = NODE_HEIGHT / 2 + 12
  return (
    x >= node.x - halfW &&
    x <= node.x + halfW &&
    y >= node.y - halfH &&
    y <= node.y + halfH
  )
}

const getLabelPosition = (source, target, geometry) => {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const distance = Math.hypot(dx, dy) || 1
  const nx = -dy / distance
  const ny = dx / distance
  const tx = dx / distance
  const ty = dy / distance

  const tries = [
    { n: 22, t: 0 },
    { n: -22, t: 0 },
    { n: 34, t: 12 },
    { n: -34, t: -12 },
    { n: 44, t: 20 },
    { n: -44, t: -20 },
  ]

  for (const attempt of tries) {
    const x = geometry.midX + nx * attempt.n + tx * attempt.t
    const y = geometry.midY + ny * attempt.n + ty * attempt.t
    if (!isInsideNodeBounds(x, y, source) && !isInsideNodeBounds(x, y, target)) {
      return { x, y }
    }
  }

  return { x: geometry.midX + nx * 22, y: geometry.midY + ny * 22 }
}

const getNeighborhood = ({ startId, depth, bySource, byTarget }) => {
  if (!startId) return { nodeIds: new Set(), edgeIds: new Set() }
  const nodeIds = new Set([startId])
  const edgeIds = new Set()
  const queue = [{ nodeId: startId, hop: 0 }]

  while (queue.length) {
    const current = queue.shift()
    if (current.hop >= depth) continue
    const neighbors = [...(bySource[current.nodeId] || []), ...(byTarget[current.nodeId] || [])]

    neighbors.forEach((edge) => {
      edgeIds.add(edge.id)
      const node = edge.source === current.nodeId ? edge.target : edge.source
      if (!nodeIds.has(node)) {
        nodeIds.add(node)
        queue.push({ nodeId: node, hop: current.hop + 1 })
      }
    })
  }

  return { nodeIds, edgeIds }
}

const SettingsDrawer = memo(function SettingsDrawer({ open, filters, onToggleFilter, onClose }) {
  return (
    <aside className={`settings-drawer ${open ? 'open' : ''}`}>
      <div className="drawer-header">
        <h3>Settings</h3>
        <button type="button" onClick={onClose}>X</button>
      </div>
      <p className="micro">Category Filters</p>
      {Object.entries(groupMeta).map(([key, value]) => (
        <label key={key} className="drawer-item">
          <input type="checkbox" checked={filters[key]} onChange={() => onToggleFilter(key)} />
          {value.label}
        </label>
      ))}
    </aside>
  )
})

const ExploreStories = memo(function ExploreStories({
  storyMode,
  activeStory,
  setStoryTitle,
  play,
  next,
  back,
  reset,
  step,
  sentence,
}) {
  return (
    <section className="story-mode">
      <h3>Explore Stories</h3>
      <p className="micro">Guided walkthroughs showing how system burdens propagate across stakeholders.</p>

      {!storyMode && <p className="micro">Select a story card to begin guided exploration.</p>}
      <div className="story-card-grid">
        {storiesData.map((story) => (
          <button
            key={story.title}
            type="button"
            className={`story-card ${activeStory?.title === story.title ? 'active' : ''}`}
            onClick={() => setStoryTitle(story.title)}
          >
            <strong>{story.title}</strong>
            <span>{truncate(story.personaSummary, 120)}</span>
          </button>
        ))}
      </div>

      {activeStory && (
        <div className="story-player">
          <p className="story-situation">Situation {step + 1}: {truncate(sentence, 80)}</p>
          <div className="story-actions">
            <button type="button" onClick={play}>Play</button>
            <button type="button" onClick={next}>Next</button>
            <button type="button" onClick={back}>Back</button>
            <button type="button" onClick={reset}>Reset</button>
          </div>
        </div>
      )}
    </section>
  )
})

const CommentsPanel = memo(function CommentsPanel({ selectedTarget, comments, userIdentifier, setUserIdentifier, refresh }) {
  const [expanded, setExpanded] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [category, setCategory] = useState('Companies')
  const [otherCategory, setOtherCategory] = useState('')
  const [noteText, setNoteText] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [replyTo, setReplyTo] = useState('')

  const targetComments = useMemo(
    () =>
      comments.filter(
        (comment) => comment.targetType === selectedTarget.type && comment.targetId === selectedTarget.id,
      ),
    [comments, selectedTarget],
  )

  const topLevel = useMemo(
    () => targetComments.filter((comment) => !comment.parentId),
    [targetComments],
  )
  const byParent = useMemo(() => {
    const map = {}
    targetComments
      .filter((comment) => comment.parentId)
      .forEach((comment) => {
        if (!map[comment.parentId]) map[comment.parentId] = []
        map[comment.parentId].push(comment)
      })
    return map
  }, [targetComments])

  const submit = async (event) => {
    event.preventDefault()
    if (!userIdentifier.trim()) return
    await createComment({
      targetType: selectedTarget.type,
      targetId: selectedTarget.id,
      stakeholderCategory: category === 'Other' ? otherCategory || 'Other' : category,
      noteText,
      contactInfo,
      privateUserIdentifier: userIdentifier,
      displayName,
      parentId: replyTo,
    })
    setNoteText('')
    setReplyTo('')
    await refresh()
  }

  const editComment = async (comment) => {
    const next = prompt('Edit comment', comment.noteText)
    if (!next || !next.trim()) return
    try {
      await updateComment({ id: comment.id, noteText: next.trim(), privateUserIdentifier: userIdentifier })
      await refresh()
    } catch {
      alert('Only the original author can edit this comment.')
    }
  }

  const removeComment = async (comment) => {
    try {
      await deleteComment({ id: comment.id, privateUserIdentifier: userIdentifier })
      await refresh()
    } catch {
      alert('Only the original author can delete this comment.')
    }
  }

  return (
    <section className="comments-panel">
      <div className="panel-subhead sticky">
        <h4>Comments</h4>
        <button type="button" onClick={() => setExpanded((v) => !v)}>{expanded ? 'Collapse' : 'Expand'}</button>
      </div>

      {expanded && (
        <>
          <p className="micro">Target: {selectedTarget.type} / {selectedTarget.id}</p>
          <form className="comment-form" onSubmit={submit}>
            <label>
              Private Identifier (required)
              <input
                required
                value={userIdentifier}
                onChange={(event) => setUserIdentifier(event.target.value)}
                placeholder="email or private identifier"
              />
            </label>
            <label>
              Display Name (optional)
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="shown publicly" />
            </label>
            <label>
              Who are you?
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option>Companies</option>
                <option>Authorizers</option>
                <option>Products & Services</option>
                <option>Barriers</option>
                <option>People & Supports</option>
                <option>Other</option>
              </select>
            </label>
            {category === 'Other' && (
              <label>
                Other Category
                <input value={otherCategory} onChange={(event) => setOtherCategory(event.target.value)} />
              </label>
            )}
            <label>
              Contact Info (optional)
              <input value={contactInfo} onChange={(event) => setContactInfo(event.target.value)} />
            </label>
            <label>
              Note
              <textarea rows={3} required value={noteText} onChange={(event) => setNoteText(event.target.value)} />
            </label>
            {replyTo && <p className="micro">Replying to {replyTo}</p>}
            <button type="submit">Submit Comment</button>
          </form>

          <div className="comment-list">
            {topLevel.map((comment) => (
              <article key={comment.id} className="comment-item">
                <header>
                  <strong>{comment.displayName || 'User Comment'}</strong>
                  <span>{new Date(comment.timestamp).toLocaleString()}</span>
                </header>
                <p className="micro">{comment.stakeholderCategory}</p>
                <p>{comment.noteText}</p>
                <div className="comment-actions">
                  <button type="button" onClick={() => setReplyTo(comment.id)}>Reply</button>
                  <button type="button" onClick={() => editComment(comment)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => removeComment(comment)}>
                    Delete
                  </button>
                </div>
                {(byParent[comment.id] || []).map((reply) => (
                  <div key={reply.id} className="reply-item">
                    <strong>{reply.displayName || 'User Comment'}</strong>
                    <p>{reply.noteText}</p>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
})

const RightPanel = memo(function RightPanel({
  open,
  onClose,
  selectedNode,
  selectedNodeId,
  selectedEdge,
  details,
  storyMode,
  setStoryMode,
  activeStory,
  setStoryTitle,
  storyStep,
  storySentence,
  onPlay,
  onNext,
  onBack,
  onReset,
  hoveredAssocEdgeId,
  lockedAssocEdgeId,
  setHoveredAssocEdgeId,
  setLockedAssocEdgeId,
  comments,
  userIdentifier,
  setUserIdentifier,
  refreshComments,
}) {
  const [tab, setTab] = useState('Overview')
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    setShowMore(false)
  }, [selectedNodeId, tab, storyStep])

  const selectedTarget = selectedEdge
    ? { type: 'edge', id: selectedEdge.id }
    : { type: 'node', id: selectedNodeId || '' }

  return (
    <aside className={`right-panel ${open ? 'open' : ''}`}>
      <div className="right-panel-header sticky">
        <div>
          <h2>Details</h2>
          <p className="micro">Use tabs for quick overview or deeper analysis.</p>
        </div>
        <button type="button" onClick={onClose}>X</button>
      </div>

      <div className="tab-row sticky">
        {['Overview', 'Details', 'Evidence'].map((name) => (
          <button key={name} type="button" className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>
            {name}
          </button>
        ))}
      </div>

      <button type="button" className="story-toggle" onClick={() => setStoryMode((v) => !v)}>
        {storyMode ? 'Hide Story Mode' : 'Explore Stories'}
      </button>

      {storyMode && (
        <ExploreStories
          storyMode={storyMode}
          activeStory={activeStory}
          setStoryTitle={setStoryTitle}
          play={onPlay}
          next={onNext}
          back={onBack}
          reset={onReset}
          step={storyStep}
          sentence={storySentence}
        />
      )}

      {selectedNode && (
        <section className="structured-card">
          <h3>{selectedNode.label}</h3>
          <p className="node-description">{truncate(selectedNode.description || '', 80)}</p>
          <h4>Involved Stakeholders & Impact Story</h4>

          {tab === 'Overview' && (
            <>
              <ul className="impact-list">
                {details.directPairs.slice(0, 3).map((item) => (
                  <li
                    key={item.pair}
                    className={item.edgeId === (lockedAssocEdgeId || hoveredAssocEdgeId) ? 'assoc-active' : ''}
                    onMouseEnter={() => setHoveredAssocEdgeId(item.edgeId)}
                    onMouseLeave={() => setHoveredAssocEdgeId('')}
                    onClick={() => setLockedAssocEdgeId(item.edgeId)}
                  >
                    <p><strong>{item.pair}</strong></p>
                    <p className="sub">{item.story}</p>
                  </li>
                ))}
              </ul>
              <p className="one-line">{details.summary}</p>
            </>
          )}

          {tab === 'Details' && (
            <>
              <ul className="impact-list">
                {details.directPairs.map((item) => (
                  <li
                    key={item.pair}
                    className={item.edgeId === (lockedAssocEdgeId || hoveredAssocEdgeId) ? 'assoc-active' : ''}
                    onMouseEnter={() => setHoveredAssocEdgeId(item.edgeId)}
                    onMouseLeave={() => setHoveredAssocEdgeId('')}
                    onClick={() => setLockedAssocEdgeId(item.edgeId)}
                  >
                    <p><strong>{item.pair}</strong></p>
                    <p className="sub">{item.story}</p>
                  </li>
                ))}
              </ul>
              <p className="one-line">{details.summary}</p>
            </>
          )}

          {tab === 'Evidence' && (
            <>
              <p className="one-line">Citations and reference notes can be managed here.</p>
              <p className="micro">No evidence items added yet.</p>
            </>
          )}

          <button type="button" className="link-btn" onClick={() => setShowMore((v) => !v)}>
            {showMore ? 'Show Less' : 'Show More'}
          </button>

          {showMore && (
            <div className="show-more-block">
              <h4>Chains</h4>
              <ol>
                {details.chains.map((line, index) => (
                  <li key={`${line}-${index}`}>{line}</li>
                ))}
              </ol>
              <h4>Who Shapes This Node</h4>
              <ol>
                {details.upstream.map((line, index) => (
                  <li key={`${line}-${index}`}>{line}</li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      <CommentsPanel
        selectedTarget={selectedTarget}
        comments={comments}
        userIdentifier={userIdentifier}
        setUserIdentifier={setUserIdentifier}
        refresh={refreshComments}
      />
    </aside>
  )
})

const GraphCanvas = memo(function GraphCanvas({
  nodesToRender,
  linksToRender,
  nodesById,
  selectedNodeId,
  selectedEdgeId,
  highlightedNodeIds,
  highlightedEdgeIds,
  associationEdgeId,
  onNodeClick,
  onEdgeClick,
  onNodeDoubleClick,
  onBackgroundClick,
  setHoveredAssocEdgeId,
  setTooltip,
  commentsByTarget,
  graphLayerRef,
  onPointerDown,
  onWheel,
  aggregatedLabelCache,
  storyEdgeIds,
}) {
  const showAggregate = !selectedNodeId
  const verbFont = 11
  const arrowLength = 13
  const arrowHalfWidth = 5.5
  const renderedEdges = useMemo(
    () =>
      linksToRender.map((edge) => {
        const source = nodesById[edge.source]
        const target = nodesById[edge.target]
        const geometry = buildCurve(source, target)
        const labelPos = getLabelPosition(source, target, geometry)
        const style = edgeStyle[edge.edgeType]
        const active = highlightedEdgeIds.has(edge.id) || storyEdgeIds.has(edge.id)
        const faded = selectedNodeId ? !active : false
        const isSelected = selectedEdgeId === edge.id
        const commentPreview = commentsByTarget[edge.id]?.[0]

        let label = ''
        if (showAggregate) {
          const key = `${source.group}-${target.group}-${edge.verb}`
          const aggregate = aggregatedLabelCache[key]
          if (aggregate?.firstEdgeId === edge.id) {
            label = aggregate.count > 1 ? `${edge.verb} (${aggregate.count})` : edge.verb
          }
        } else if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
          label = edge.verb
        }

        return {
          edge,
          source,
          target,
          geometry,
          style,
          labelPos,
          active,
          faded,
          isSelected,
          commentPreview,
          label,
        }
      }),
    [
      linksToRender,
      nodesById,
      highlightedEdgeIds,
      storyEdgeIds,
      selectedNodeId,
      selectedEdgeId,
      commentsByTarget,
      showAggregate,
      aggregatedLabelCache,
    ],
  )

  return (
    <section className="map-canvas">
      <svg
        viewBox={`0 0 ${BASE_WIDTH} ${BASE_HEIGHT}`}
        role="img"
        aria-label="Healthcare access causal graph"
        onPointerDown={onPointerDown}
        onWheel={onWheel}
        onClick={onBackgroundClick}
      >
        <g className="camera" ref={graphLayerRef}>
          {sectionLabels.map((section) => (
            <text className="section-title" key={section.text} x={section.x} y={section.y}>{section.text}</text>
          ))}

          {renderedEdges.map(({ edge, geometry, style, active, faded, isSelected, commentPreview }) => {
            const assocActive = associationEdgeId === edge.id
            const focusDim = associationEdgeId && !assocActive
            return (
              <g
                key={edge.id}
                onPointerEnter={() =>
                  {
                    setHoveredAssocEdgeId(edge.id)
                  setTooltip({
                    x: geometry.midX,
                    y: geometry.midY,
                    text: `${nodesById[edge.source].label} -> ${edge.verb} -> ${nodesById[edge.target].label}`,
                    note: commentPreview
                      ? `${commentPreview.stakeholderCategory}: ${truncate(commentPreview.noteText, 50)}`
                      : edge.note,
                  })
                  }
                }
                onPointerLeave={() => {
                  setHoveredAssocEdgeId('')
                  setTooltip(null)
                }}
                onClick={(event) => {
                  event.stopPropagation()
                  onEdgeClick(edge)
                }}
              >
                <path
                  d={geometry.path}
                  className={`edge ${active ? 'active' : ''} ${faded ? 'faded' : ''} ${assocActive ? 'assoc-active' : ''} ${focusDim ? 'assoc-dim' : ''}`}
                  stroke={style.color}
                  strokeDasharray={edge.edgeType === 'feedback' ? '8 4' : undefined}
                />
                <polygon
                  className={`edge-arrowhead ${active ? 'active' : ''} ${faded ? 'faded' : ''} ${assocActive ? 'assoc-active' : ''} ${focusDim ? 'assoc-dim' : ''}`}
                  fill={style.color}
                  points={`${geometry.endX},${geometry.endY} ${
                    geometry.endX - geometry.unitX * arrowLength - geometry.unitY * arrowHalfWidth
                  },${
                    geometry.endY - geometry.unitY * arrowLength + geometry.unitX * arrowHalfWidth
                  } ${
                    geometry.endX - geometry.unitX * arrowLength + geometry.unitY * arrowHalfWidth
                  },${
                    geometry.endY - geometry.unitY * arrowLength - geometry.unitX * arrowHalfWidth
                  }`}
                />
                {edge.edgeType === 'feedback' && (
                  <text className={`loop-icon ${faded ? 'faded' : ''}`} x={geometry.midX + 11} y={geometry.midY + 9}>↻</text>
                )}
                {commentsByTarget[edge.id]?.length > 0 && (
                  <text className="comment-pin" x={geometry.midX - 11} y={geometry.midY + 12}>💬</text>
                )}
                {isSelected && <circle className="selected-dot" cx={geometry.midX} cy={geometry.midY} r="6" />}
              </g>
            )
          })}

          {nodesToRender.map((node) => {
            const connected = highlightedNodeIds.has(node.id) || (!selectedNodeId && !storyEdgeIds.size)
            const faded = selectedNodeId ? !connected : false
            const selected = node.id === selectedNodeId
            const nodeComments = commentsByTarget[node.id] || []
            const preview = nodeComments[0]

            return (
              <g
                key={node.id}
                className={`node-group ${selected ? 'selected' : ''}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onNodeClick(node.id)
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation()
                  onNodeDoubleClick(node.id)
                }}
                onPointerEnter={() =>
                  setTooltip({
                    x: node.x,
                    y: node.y - 30,
                    text: node.label,
                    note: preview
                      ? `${preview.stakeholderCategory}: ${truncate(preview.noteText, 50)}`
                      : node.summary,
                  })
                }
                onPointerLeave={() => setTooltip(null)}
              >
                <rect
                  x={node.x - NODE_WIDTH / 2}
                  y={node.y - NODE_HEIGHT / 2}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx="12"
                  fill={groupMeta[node.group].fill}
                  stroke={groupMeta[node.group].stroke}
                  className={`node-rect ${faded ? 'faded' : ''}`}
                />
                <text className={`node-label ${faded ? 'faded' : ''}`} x={node.x} y={node.y + 5}>{node.label}</text>
                {nodeComments.length > 0 && <text className="comment-pin" x={node.x + 82} y={node.y - 14}>💬</text>}
              </g>
            )
          })}

          {renderedEdges.map(({ edge, geometry, labelPos, faded, label }) =>
            label ? (
              <g key={`${edge.id}-label`} className={`${faded ? 'faded' : ''} ${associationEdgeId === edge.id ? 'assoc-active' : ''} ${associationEdgeId && associationEdgeId !== edge.id ? 'assoc-dim' : ''}`}>
                <rect
                  className="edge-label-pill"
                  x={labelPos.x - (label.length * verbFont * 0.3 + 8)}
                  y={labelPos.y - 18}
                  width={label.length * verbFont * 0.6 + 16}
                  height={verbFont + 8}
                  rx="8"
                />
                <text
                  className={`edge-verb ${faded ? 'faded' : ''} ${associationEdgeId === edge.id ? 'assoc-active' : ''}`}
                  x={labelPos.x}
                  y={labelPos.y - 6}
                  style={{ fontSize: `${verbFont}px` }}
                >
                  {label}
                </text>
              </g>
            ) : null,
          )}
        </g>
      </svg>
    </section>
  )
})

function App() {
  const initial = useMemo(() => parseStateFromUrl(), [])
  const [selectedNodeId, setSelectedNodeId] = useState(initial.selectedNode)
  const [selectedEdge, setSelectedEdge] = useState(null)
  const [depth, setDepth] = useState(initial.depth)
  const [depthOverridden, setDepthOverridden] = useState(false)
  const [filters, setFilters] = useState(initial.filters)

  const [panelOpen, setPanelOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [storyMode, setStoryMode] = useState(false)
  const [storyTitle, setStoryTitle] = useState(initial.activeStory)
  const [storyStep, setStoryStep] = useState(0)
  const [storyPlaying, setStoryPlaying] = useState(false)

  const [tooltipRaw, setTooltipRaw] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const [hoveredAssocEdgeId, setHoveredAssocEdgeId] = useState('')
  const [lockedAssocEdgeId, setLockedAssocEdgeId] = useState('')
  const [manualNavAt, setManualNavAt] = useState(0)

  const [comments, setComments] = useState([])
  const [userIdentifier, setUserIdentifier] = useState('')
  const [onboardingVisible, setOnboardingVisible] = useState(false)

  const [isMobile, setIsMobile] = useState(isSmallScreen())

  const dragRef = useRef(null)
  const wheelAccumRef = useRef(0)
  const wheelRafRef = useRef(0)
  const wheelPointerRef = useRef({ sx: BASE_WIDTH / 2, sy: BASE_HEIGHT / 2 })
  const graphLayerRef = useRef(null)
  const transformRef = useRef({ x: 60, y: 30, k: 0.78 })

  const nodesById = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node])), [])

  const visibleNodes = useMemo(() => nodes.filter((node) => filters[node.group]), [filters])
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes])
  const visibleLinks = useMemo(
    () => links.filter((link) => visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)),
    [visibleNodeIds],
  )

  const adjacency = useMemo(() => {
    const bySource = {}
    const byTarget = {}
    visibleLinks.forEach((edge) => {
      if (!bySource[edge.source]) bySource[edge.source] = []
      if (!byTarget[edge.target]) byTarget[edge.target] = []
      bySource[edge.source].push(edge)
      byTarget[edge.target].push(edge)
    })
    return { bySource, byTarget }
  }, [visibleLinks])

  const commentsByTarget = useMemo(() => {
    const map = {}
    comments.forEach((comment) => {
      const key = comment.targetType === 'edge' ? comment.targetId : comment.targetId
      if (!map[key]) map[key] = []
      map[key].push(comment)
    })
    return map
  }, [comments])

  const aggregatedLabelCache = useMemo(() => {
    const map = {}
    visibleLinks.forEach((edge) => {
      const sourceGroup = nodesById[edge.source].group
      const targetGroup = nodesById[edge.target].group
      const key = `${sourceGroup}-${targetGroup}-${edge.verb}`
      if (!map[key]) map[key] = { count: 0, firstEdgeId: edge.id }
      map[key].count += 1
    })
    return map
  }, [visibleLinks, nodesById])

  const activeStory = useMemo(
    () => storiesData.find((story) => story.title === storyTitle) || null,
    [storyTitle],
  )

  const storyEdgeIds = useMemo(() => {
    if (!activeStory) return new Set()
    const ids = new Set()
    for (let i = 0; i < activeStory.pathNodes.length - 1; i += 1) {
      if (i >= storyStep) break
      const source = activeStory.pathNodes[i]
      const target = activeStory.pathNodes[i + 1]
      const edge = visibleLinks.find((item) => item.source === source && item.target === target)
      if (edge) ids.add(edge.id)
    }
    return ids
  }, [activeStory, storyStep, visibleLinks])

  const neighborhood = useMemo(
    () =>
      getNeighborhood({
        startId: selectedNodeId,
        depth,
        bySource: adjacency.bySource,
        byTarget: adjacency.byTarget,
      }),
    [selectedNodeId, depth, adjacency],
  )

  const highlightedNodeIds = useMemo(() => {
    const ids = new Set(neighborhood.nodeIds)
    if (activeStory) {
      for (let i = 0; i <= storyStep; i += 1) {
        const id = activeStory.pathNodes[i]
        if (id) ids.add(id)
      }
    }
    return ids
  }, [neighborhood.nodeIds, activeStory, storyStep])

  const highlightedEdgeIds = useMemo(() => {
    const ids = new Set(neighborhood.edgeIds)
    storyEdgeIds.forEach((id) => ids.add(id))
    return ids
  }, [neighborhood.edgeIds, storyEdgeIds])
  const associationEdgeId = lockedAssocEdgeId || hoveredAssocEdgeId

  const selectedNode = selectedNodeId ? nodesById[selectedNodeId] : null

  const details = useMemo(() => {
    if (!selectedNodeId) return { directPairs: [], summary: '', chains: [], upstream: [] }
    const outgoing = adjacency.bySource[selectedNodeId] || []
    const incoming = adjacency.byTarget[selectedNodeId] || []
    const directPairs = [...outgoing, ...incoming].slice(0, 7).map((edge) => ({
      edgeId: edge.id,
      pair: `${nodesById[edge.source].label} -> ${nodesById[edge.target].label}`,
      story: truncate(edge.story, 100),
    }))

    const chainEdges = [...highlightedEdgeIds]
      .map((id) => visibleLinks.find((item) => item.id === id))
      .filter(Boolean)
      .slice(0, 12)

    return {
      directPairs,
      summary: truncate(`${nodesById[selectedNodeId].label}: ${nodesById[selectedNodeId].summary}`, 300),
      chains: chainEdges.map((edge) => sentenceFromLink(edge, nodesById)),
      upstream: incoming.map((edge) => sentenceFromLink(edge, nodesById)).slice(0, 8),
    }
  }, [selectedNodeId, adjacency, nodesById, highlightedEdgeIds, visibleLinks])

  const storySentence = useMemo(() => {
    if (!activeStory) return ''
    const base = activeStory.narrationSteps[storyStep] || activeStory.narrationSteps[0] || ''
    return `Situation ${storyStep + 1}: ${truncate(base, 80)}`
  }, [activeStory, storyStep])

  const shouldAutoCamera = () => Date.now() - manualNavAt > 2000

  const applyTransform = (next) => {
    transformRef.current = next
    if (graphLayerRef.current) {
      graphLayerRef.current.setAttribute('transform', `translate(${next.x} ${next.y}) scale(${next.k})`)
    }
  }

  const focusOnNode = (nodeId, zoomTarget = 1.04) => {
    const node = nodesById[nodeId]
    if (!node) return
    if (!shouldAutoCamera()) return
    applyTransform({
      x: BASE_WIDTH / 2 - node.x * zoomTarget,
      y: BASE_HEIGHT / 2 - node.y * zoomTarget,
      k: zoomTarget,
    })
  }

  const resetView = (force = false) => {
    if (!force && !shouldAutoCamera()) return
    applyTransform({ x: 60, y: 30, k: 0.78 })
  }

  const refreshComments = async () => {
    const data = await fetchComments()
    setComments(data)
  }

  useEffect(() => {
    refreshComments()
  }, [selectedNodeId, selectedEdge])

  useEffect(() => () => {
    if (wheelRafRef.current) cancelAnimationFrame(wheelRafRef.current)
  }, [])

  useEffect(() => {
    applyTransform(transformRef.current)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setTooltip(tooltipRaw)
    }, 120)
    return () => clearTimeout(timer)
  }, [tooltipRaw])

  useEffect(() => {
    const seen = sessionStorage.getItem('health-map-onboarding-dismissed')
    setOnboardingVisible(!seen)
  }, [])

  useEffect(() => {
    const onResize = () => setIsMobile(isSmallScreen())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (selectedNodeId) params.set('selectedNode', selectedNodeId)
    else params.delete('selectedNode')
    params.set('depth', String(depth))
    Object.keys(filters).forEach((key) => params.set(`f_${key}`, filters[key] ? '1' : '0'))
    if (storyTitle) params.set('story', storyTitle)
    else params.delete('story')
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }, [selectedNodeId, depth, filters, storyTitle])

  useEffect(() => {
    if (!storyPlaying || !activeStory) return undefined
    const tick = async () => {
      await sleep(1200)
      setStoryStep((prev) => {
        const next = Math.min(prev + 1, activeStory.pathNodes.length - 1)
        if (next === prev) {
          setStoryPlaying(false)
          return prev
        }
        return next
      })
    }
    tick()
  }, [storyPlaying, storyStep, activeStory])

  useEffect(() => {
    if (!activeStory) return
    if (!depthOverridden) setDepth(1)
    const id = activeStory.pathNodes[Math.min(storyStep, activeStory.pathNodes.length - 1)]
    setSelectedNodeId(id)
    setSelectedEdge(null)
    focusOnNode(id, 1.06)
  }, [activeStory, storyStep])

  useEffect(() => {
    if (!panelOpen) {
      resetView(true)
      return
    }
    if (!isMobile) {
      resetView(true)
    }
  }, [panelOpen, isMobile])

  const onPointerDown = (event) => {
    if (event.button !== 0) return
    setManualNavAt(Date.now())
    const start = transformRef.current
    dragRef.current = { x: event.clientX, y: event.clientY, x0: start.x, y0: start.y }

    const move = (moveEvent) => {
      if (!dragRef.current) return
      applyTransform({
        x: dragRef.current.x0 + (moveEvent.clientX - dragRef.current.x),
        y: dragRef.current.y0 + (moveEvent.clientY - dragRef.current.y),
        k: transformRef.current.k,
      })
    }

    const up = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const onWheel = (event) => {
    event.preventDefault()
    if (dragRef.current) return
    setManualNavAt(Date.now())

    const rect = event.currentTarget.getBoundingClientRect()
    const sx = ((event.clientX - rect.left) / rect.width) * BASE_WIDTH
    const sy = ((event.clientY - rect.top) / rect.height) * BASE_HEIGHT
    wheelPointerRef.current = { sx, sy }
    const deltaMultiplier = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? window.innerHeight : 1
    const normalizedDelta = Math.max(-120, Math.min(120, event.deltaY * deltaMultiplier))
    wheelAccumRef.current += normalizedDelta

    if (wheelRafRef.current) return
    wheelRafRef.current = requestAnimationFrame(() => {
      wheelRafRef.current = 0
      const delta = wheelAccumRef.current
      wheelAccumRef.current = 0
      if (Math.abs(delta) < 0.01) return

      const current = transformRef.current
      const pointer = wheelPointerRef.current
      const { sx: pointerX, sy: pointerY } = pointer
      const worldX = (pointerX - current.x) / current.k
      const worldY = (pointerY - current.y) / current.k
      const nextK = Math.max(0.6, Math.min(2.5, current.k * Math.exp(-delta * 0.001)))
      applyTransform({
        x: pointerX - worldX * nextK,
        y: pointerY - worldY * nextK,
        k: nextK,
      })
    })
  }

  const onNodeClick = (nodeId) => {
    setSelectedNodeId(nodeId)
    setSelectedEdge(null)
    focusOnNode(nodeId)
    if (onboardingVisible) {
      setOnboardingVisible(false)
      sessionStorage.setItem('health-map-onboarding-dismissed', '1')
    }
  }

  const clearSelection = () => {
    setSelectedNodeId('')
    setSelectedEdge(null)
    setHoveredAssocEdgeId('')
    setLockedAssocEdgeId('')
    setStoryPlaying(false)
    setStoryStep(0)
  }

  return (
    <div className="app-shell">
      <SettingsDrawer
        open={drawerOpen}
        filters={filters}
        onToggleFilter={(key) => setFilters((previous) => ({ ...previous, [key]: !previous[key] }))}
        onClose={() => setDrawerOpen(false)}
      />

      <header className="toolbar">
        <button type="button" onClick={() => setDrawerOpen(true)}>Settings</button>

        <div className="depth-control" role="group" aria-label="Impact depth">
          <span>Impact Depth</span>
          {[1, 2, 3].map((value) => (
            <button
              key={value}
              type="button"
              className={depth === value ? 'active' : ''}
              onClick={() => {
                setDepth(value)
                setDepthOverridden(true)
              }}
            >
              Depth {value}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setStoryMode(true)
            setPanelOpen(true)
          }}
        >
          Explore Stories
        </button>
      </header>

      {onboardingVisible && (
        <div className="onboarding-banner">
          Click a node to trace system impacts. Use Explore Stories for guided walkthroughs. Open Settings for filters.
        </div>
      )}

      <main className={`layout ${panelOpen ? 'panel-open' : 'panel-closed'}`}>
        <section className="graph-wrapper">
          <div className="hover-banner" aria-live="polite">
            {tooltip ? (
              <>
                <strong className="hover-line">{tooltip.text}</strong>
                {tooltip.note && <span className="micro hover-line">{tooltip.note}</span>}
              </>
            ) : (
              <span className="micro hover-line">Hover a node or edge to see contextual details.</span>
            )}
          </div>

          <div className="canvas-actions">
            <button type="button" onClick={() => resetView(true)}>Reset View</button>
            <button type="button" onClick={() => setPanelOpen((v) => !v)}>{panelOpen ? 'Close Details' : 'See Details'}</button>
          </div>

          <GraphCanvas
            nodesToRender={visibleNodes}
            linksToRender={visibleLinks}
            nodesById={nodesById}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdge?.id || ''}
            highlightedNodeIds={highlightedNodeIds}
            highlightedEdgeIds={highlightedEdgeIds}
            onNodeClick={onNodeClick}
            onEdgeClick={(edge) => {
              setSelectedEdge(edge)
              setLockedAssocEdgeId(edge.id)
              setPanelOpen(true)
              if (onboardingVisible) {
                setOnboardingVisible(false)
                sessionStorage.setItem('health-map-onboarding-dismissed', '1')
              }
            }}
            onNodeDoubleClick={(nodeId) => {
              setManualNavAt(0)
              focusOnNode(nodeId, 1.18)
            }}
            onBackgroundClick={clearSelection}
            associationEdgeId={associationEdgeId}
            setHoveredAssocEdgeId={setHoveredAssocEdgeId}
            setTooltip={setTooltipRaw}
            commentsByTarget={commentsByTarget}
            graphLayerRef={graphLayerRef}
            onPointerDown={onPointerDown}
            onWheel={onWheel}
            aggregatedLabelCache={aggregatedLabelCache}
            storyEdgeIds={storyEdgeIds}
          />
        </section>

        <RightPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          selectedNode={selectedNode}
          selectedNodeId={selectedNodeId}
          selectedEdge={selectedEdge}
          details={details}
          storyMode={storyMode}
          setStoryMode={setStoryMode}
          activeStory={activeStory}
          setStoryTitle={(title) => {
            setStoryTitle(title)
            setStoryStep(0)
            setStoryPlaying(false)
            setPanelOpen(true)
            setStoryMode(true)
          }}
          storyStep={storyStep}
          storySentence={storySentence}
          onPlay={() => {
            setStoryPlaying(true)
            setPanelOpen(true)
          }}
          onNext={() => {
            if (!activeStory) return
            setStoryPlaying(false)
            setStoryStep((prev) => Math.min(prev + 1, activeStory.pathNodes.length - 1))
          }}
          onBack={() => {
            if (!activeStory) return
            setStoryPlaying(false)
            setStoryStep((prev) => Math.max(prev - 1, 0))
          }}
          onReset={() => {
            setStoryPlaying(false)
            setStoryStep(0)
            setHoveredAssocEdgeId('')
            setLockedAssocEdgeId('')
            resetView(true)
          }}
          hoveredAssocEdgeId={hoveredAssocEdgeId}
          lockedAssocEdgeId={lockedAssocEdgeId}
          setHoveredAssocEdgeId={setHoveredAssocEdgeId}
          setLockedAssocEdgeId={setLockedAssocEdgeId}
          comments={comments}
          userIdentifier={userIdentifier}
          setUserIdentifier={setUserIdentifier}
          refreshComments={refreshComments}
        />
      </main>

      <footer className="legend-bar">
        <strong>Legend</strong>
        {Object.values(edgeStyle).map((item) => (
          <div key={item.label} className="legend-row horizontal">
            <i style={{ background: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
        {Object.values(groupMeta).map((item) => (
          <div key={item.label} className="legend-row horizontal">
            <i style={{ background: item.fill, border: `1px solid ${item.stroke}` }} />
            <span>{item.label}</span>
          </div>
        ))}
      </footer>
    </div>
  )
}

export default App
