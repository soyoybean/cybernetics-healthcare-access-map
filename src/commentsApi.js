const API_BASE = '/api/comments'

const toHex = (buffer) => Array.from(new Uint8Array(buffer)).map((value) => value.toString(16).padStart(2, '0')).join('')

export const hashIdentifier = async (identifier) => {
  const normalized = identifier.trim().toLowerCase()
  const data = new TextEncoder().encode(normalized)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

const getOwnerToken = async (email) => {
  if (email?.trim()) {
    return email.trim().toLowerCase()
  }
  let anonOwnerKey = localStorage.getItem('health-map-anon-owner-key')
  if (!anonOwnerKey) {
    anonOwnerKey = crypto.randomUUID()
    localStorage.setItem('health-map-anon-owner-key', anonOwnerKey)
  }
  return `anon:${await hashIdentifier(anonOwnerKey)}`
}

const asJson = async (response) => {
  if (!response.ok) {
    const fallback = await response.text()
    throw new Error(fallback || 'Request failed')
  }
  return response.json()
}

const trackCommentSubmitted = (payload) => {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', 'comment_submitted', payload)
}

export const fetchComments = async (targetType, targetId) => {
  const query = new URLSearchParams()
  if (targetType) query.set('targetType', targetType)
  if (targetId) query.set('targetId', targetId)
  const response = await fetch(`${API_BASE}?${query.toString()}`)
  return asJson(response)
}

export const createComment = async ({
  targetType,
  targetId,
  stakeholderCategory,
  stakeholderDetail,
  noteText,
  email,
  displayName,
  parentId,
  captchaToken,
}) => {
  const ownerToken = await getOwnerToken(email)
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetType,
      targetId,
      stakeholderCategory,
      stakeholderDetail,
      noteText,
      email: ownerToken,
      displayName,
      captchaToken,
    }),
  })
  const data = await asJson(response)
  trackCommentSubmitted({
    target_type: targetType,
    target_id: targetId,
    stakeholder_category: stakeholderCategory,
  })
  return data
}

export const updateComment = async ({ id, noteText, email }) => {
  const ownerToken = await getOwnerToken(email)
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-identity': ownerToken,
    },
    body: JSON.stringify({ noteText }),
  })
  return asJson(response)
}

export const deleteComment = async ({ id, email }) => {
  const ownerToken = await getOwnerToken(email)
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: { 'x-user-identity': ownerToken },
  })
  return asJson(response)
}
