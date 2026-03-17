import crypto from 'node:crypto'
import DOMPurify from 'isomorphic-dompurify'
import { getSupabaseAdmin } from '../../lib/supabase-admin'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const allowedTargetTypes = new Set(['node', 'edge'])

const cleanText = (value: unknown, maxLength: number) => String(value || '').trim().slice(0, maxLength)

const sanitizeText = (value: unknown, maxLength: number) => {
  const clean = DOMPurify.sanitize(cleanText(value, maxLength), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim()
  return clean.replace(/\s+/g, ' ')
}

const json = (res: any, status: number, payload: unknown) => {
  res.status(status).json(payload)
}

const redactComment = (row: Record<string, unknown>) => ({
  id: row.id,
  targetType: row.target_type,
  targetId: row.target_id,
  stakeholderCategory: row.stakeholder_category,
  noteText: row.note_text,
  timestamp: row.timestamp,
  displayName: row.display_name,
  parentId: row.parent_id || '',
})

const parseBody = (req: any) => {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return req.body
}

const validateCreate = (body: Record<string, unknown>) => {
  const targetType = cleanText(body.targetType, 16)
  const targetId = cleanText(body.targetId, 128)
  const stakeholderCategory = sanitizeText(body.stakeholderCategory, 160)
  const stakeholderDetail = sanitizeText(body.stakeholderDetail, 240)
  const noteText = sanitizeText(body.noteText, 4000)
  const displayName = sanitizeText(body.displayName, 120)
  const emailHash = cleanText(body.emailHash, 128)
  const captchaToken = cleanText(body.captchaToken, 2048)
  const parentId = cleanText(body.parentId, 64) || null

  if (!allowedTargetTypes.has(targetType)) return 'Invalid targetType.'
  if (!targetId) return 'Missing targetId.'
  if (!stakeholderCategory) return 'Missing stakeholderCategory.'
  if (!noteText || noteText.length < 3) return 'Comment is too short.'
  if (noteText.length > 2000) return 'Comment is too long.'
  if (!displayName) return 'Missing displayName.'
  if (!emailHash) return 'Missing owner identity.'
  if (!captchaToken) return 'Missing CAPTCHA token.'

  return {
    id: crypto.randomUUID(),
    targetType,
    targetId,
    stakeholderCategory,
    stakeholderDetail,
    noteText,
    displayName,
    emailHash,
    captchaToken,
    parentId,
  }
}

const verifyCaptcha = async (token: string, remoteIp: string | null) => {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) throw new Error('Missing TURNSTILE_SECRET_KEY.')

  const formData = new URLSearchParams()
  formData.set('secret', secret)
  formData.set('response', token)
  if (remoteIp) formData.set('remoteip', remoteIp)

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  })

  if (!response.ok) throw new Error('CAPTCHA verification request failed.')
  const result = await response.json()
  return Boolean(result.success)
}

export const sendMethodNotAllowed = (res: any, allowed: string[]) => {
  res.setHeader('Allow', allowed.join(', '))
  json(res, 405, { error: 'Method not allowed.' })
}

export const listComments = async (req: any, res: any) => {
  const targetType = cleanText(req.query.targetType, 16)
  const targetId = cleanText(req.query.targetId, 128)
  const supabaseAdmin = getSupabaseAdmin()

  let query = supabaseAdmin
    .from('comments')
    .select('id,target_type,target_id,stakeholder_category,note_text,display_name,parent_id,timestamp')
    .order('timestamp', { ascending: true })

  if (targetType) query = query.eq('target_type', targetType)
  if (targetId) query = query.eq('target_id', targetId)

  const { data, error } = await query.limit(1000)
  if (error) {
    json(res, 500, { error: 'Failed to load comments.' })
    return
  }

  json(res, 200, (data || []).map(redactComment))
}

export const createComment = async (req: any, res: any) => {
  const body = parseBody(req)
  const validated = validateCreate(body)
  const supabaseAdmin = getSupabaseAdmin()

  if (typeof validated === 'string') {
    json(res, 400, { error: validated })
    return
  }

  const remoteIp = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim() || null

  try {
    const captchaOk = await verifyCaptcha(validated.captchaToken, remoteIp)
    if (!captchaOk) {
      json(res, 400, { error: 'CAPTCHA verification failed.' })
      return
    }
  } catch (error) {
    json(res, 503, { error: error instanceof Error ? error.message : 'CAPTCHA verification unavailable.' })
    return
  }

  if (validated.parentId) {
    const { data: parent, error: parentError } = await supabaseAdmin
      .from('comments')
      .select('id')
      .eq('id', validated.parentId)
      .maybeSingle()

    if (parentError || !parent) {
      json(res, 400, { error: 'Invalid parentId.' })
      return
    }
  }

  const payload = {
    id: validated.id,
    target_type: validated.targetType,
    target_id: validated.targetId,
    stakeholder_category: validated.stakeholderCategory,
    stakeholder_detail: validated.stakeholderDetail || null,
    note_text: validated.noteText,
    email_hash: validated.emailHash,
    display_name: validated.displayName,
    parent_id: validated.parentId,
    timestamp: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from('comments')
    .insert(payload)
    .select('id,target_type,target_id,stakeholder_category,note_text,display_name,parent_id,timestamp')
    .single()

  if (error) {
    console.error(error)
    json(res, 500, { error: 'Failed to save comment.' })
    return
  }

  json(res, 201, redactComment(data as Record<string, unknown>))
}

export const updateComment = async (req: any, res: any, id: string) => {
  const ownerHash = cleanText(req.headers['x-user-hash'], 128)
  const body = parseBody(req)
  const noteText = sanitizeText(body.noteText, 4000)
  const supabaseAdmin = getSupabaseAdmin()

  if (!id) {
    json(res, 400, { error: 'Missing comment id.' })
    return
  }
  if (!ownerHash) {
    json(res, 403, { error: 'Missing owner identity.' })
    return
  }
  if (!noteText) {
    json(res, 400, { error: 'Missing noteText.' })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('comments')
    .update({
      note_text: noteText,
      timestamp: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('email_hash', ownerHash)
    .select('id,target_type,target_id,stakeholder_category,note_text,display_name,parent_id,timestamp')
    .maybeSingle()

  if (error || !data) {
    json(res, 404, { error: 'Comment not found or not authorized.' })
    return
  }

  json(res, 200, redactComment(data as Record<string, unknown>))
}

export const deleteComment = async (req: any, res: any, id: string) => {
  const ownerHash = cleanText(req.headers['x-user-hash'], 128)
  const supabaseAdmin = getSupabaseAdmin()

  if (!id) {
    json(res, 400, { error: 'Missing comment id.' })
    return
  }
  if (!ownerHash) {
    json(res, 403, { error: 'Missing owner identity.' })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('comments')
    .delete()
    .eq('id', id)
    .eq('email_hash', ownerHash)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    json(res, 404, { error: 'Comment not found or not authorized.' })
    return
  }

  json(res, 200, { ok: true })
}
