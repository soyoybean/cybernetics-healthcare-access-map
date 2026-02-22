const API_BASE = '/api/comments'

const toHex = (buffer) => Array.from(new Uint8Array(buffer)).map((value) => value.toString(16).padStart(2, '0')).join('')

export const hashIdentifier = async (identifier) => {
  const normalized = identifier.trim().toLowerCase()
  const data = new TextEncoder().encode(normalized)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

const getOwnerHash = async (email) => {
  if (email?.trim()) {
    return hashIdentifier(email)
  }
  let anonOwnerKey = localStorage.getItem('health-map-anon-owner-key')
  if (!anonOwnerKey) {
    anonOwnerKey = crypto.randomUUID()
    localStorage.setItem('health-map-anon-owner-key', anonOwnerKey)
  }
  return hashIdentifier(anonOwnerKey)
}

const asJson = async (response) => {
  if (!response.ok) {
    const fallback = await response.text()
    throw new Error(fallback || 'Request failed')
  }
  return response.json()
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
  noteText,
  email,
  displayName,
  parentId,
}) => {
  const emailHash = await getOwnerHash(email)
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetType,
      targetId,
      stakeholderCategory,
      noteText,
      emailHash,
      displayName,
      parentId,
    }),
  })
  return asJson(response)
}

export const updateComment = async ({ id, noteText, email }) => {
  const emailHash = await getOwnerHash(email)
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-hash': emailHash,
    },
    body: JSON.stringify({ noteText }),
  })
  return asJson(response)
}

export const deleteComment = async ({ id, email }) => {
  const emailHash = await getOwnerHash(email)
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: { 'x-user-hash': emailHash },
  })
  return asJson(response)
}
