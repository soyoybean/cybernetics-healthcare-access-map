import crypto from 'node:crypto'
import { getSupabaseAdmin } from '../../lib/supabase-admin.js'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const allowedTargetTypes = new Set(['node', 'edge'])
const buildPagePath = (targetType, targetId) => `${targetType}:${targetId}`

const cleanText = (value, maxLength) => String(value || '').trim().slice(0, maxLength)

const stripTags = (value) => value.replace(/<[^>]*>/g, ' ')

const sanitizeText = (value, maxLength) => {
  const clean = stripTags(cleanText(value, maxLength)).trim()
  return clean.replace(/\s+/g, ' ')
}

const json = (res, status, payload) => {
  res.status(status).json(payload)
}

const formatDbError = (prefix, error) => {
  const parts = [prefix]
  if (error?.message) parts.push(error.message)
  if (error?.details) parts.push(error.details)
  if (error?.hint) parts.push(error.hint)
  return parts.join(' ')
}

const parsePagePath = (pagePath) => {
  const raw = cleanText(pagePath, 256)
  const splitIndex = raw.indexOf(':')
  if (splitIndex === -1) {
    return { targetType: 'node', targetId: raw }
  }
  return {
    targetType: raw.slice(0, splitIndex),
    targetId: raw.slice(splitIndex + 1),
  }
}

const redactComment = (row) => {
  const target = parsePagePath(row.page_path)
  return {
    id: row.id,
    targetType: target.targetType,
    targetId: target.targetId,
    stakeholderCategory: row.stakeholder,
    noteText: row.note,
    timestamp: row.created_at,
    displayName: row.display_name,
    parentId: '',
    pagePath: row.page_path,
  }
}

const parseBody = (req) => {
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

const validateCreate = (body) => {
  const targetType = cleanText(body.targetType, 16)
  const targetId = cleanText(body.targetId, 128)
  const stakeholderCategory = sanitizeText(body.stakeholderCategory, 160)
  const stakeholderDetail = sanitizeText(body.stakeholderDetail, 240)
  const noteText = sanitizeText(body.noteText, 4000)
  const displayName = sanitizeText(body.displayName, 120)
  const email = cleanText(body.email, 320)
  const captchaToken = cleanText(body.captchaToken, 2048)

  if (!allowedTargetTypes.has(targetType)) return 'Invalid targetType.'
  if (!targetId) return 'Missing targetId.'
  if (!stakeholderCategory) return 'Missing stakeholderCategory.'
  if (!noteText || noteText.length < 3) return 'Comment is too short.'
  if (noteText.length > 2000) return 'Comment is too long.'
  if (!displayName) return 'Missing displayName.'
  if (!email) return 'Missing owner identity.'
  if (!captchaToken) return 'Missing CAPTCHA token.'

  return {
    id: crypto.randomUUID(),
    targetType,
    targetId,
    stakeholderCategory,
    stakeholderDetail,
    noteText,
    displayName,
    email,
    captchaToken,
  }
}

const verifyCaptcha = async (token, remoteIp) => {
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

export const sendMethodNotAllowed = (res, allowed) => {
  res.setHeader('Allow', allowed.join(', '))
  json(res, 405, { error: 'Method not allowed.' })
}

export const listComments = async (req, res) => {
  const targetType = cleanText(req.query.targetType, 16)
  const targetId = cleanText(req.query.targetId, 128)
  const pagePath = targetType && targetId ? buildPagePath(targetType, targetId) : ''
  const supabaseAdmin = getSupabaseAdmin()

  let query = supabaseAdmin
    .from('comments')
    .select('id,display_name,stakeholder,specific_identity,note,email,created_at,page_path')
    .order('created_at', { ascending: true })

  if (pagePath) query = query.eq('page_path', pagePath)

  const { data, error } = await query.limit(1000)
  if (error) {
    console.error(error)
    json(res, 500, { error: formatDbError('Failed to load comments.', error) })
    return
  }

  json(res, 200, (data || []).map(redactComment))
}

export const createComment = async (req, res) => {
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

  const payload = {
    id: validated.id,
    display_name: validated.displayName,
    stakeholder: validated.stakeholderCategory,
    specific_identity: validated.stakeholderDetail || null,
    note: validated.noteText,
    email: validated.email,
    page_path: buildPagePath(validated.targetType, validated.targetId),
  }

  const { data, error } = await supabaseAdmin
    .from('comments')
    .insert(payload)
    .select('id,display_name,stakeholder,specific_identity,note,email,created_at,page_path')
    .single()

  if (error) {
    console.error(error)
    json(res, 500, { error: formatDbError('Failed to save comment.', error) })
    return
  }

  json(res, 201, redactComment(data))
}

export const updateComment = async (req, res, id) => {
  const ownerIdentity = cleanText(req.headers['x-user-identity'], 320)
  const body = parseBody(req)
  const noteText = sanitizeText(body.noteText, 4000)
  const supabaseAdmin = getSupabaseAdmin()

  if (!id) {
    json(res, 400, { error: 'Missing comment id.' })
    return
  }
  if (!ownerIdentity) {
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
      note: noteText,
    })
    .eq('id', id)
    .eq('email', ownerIdentity)
    .select('id,display_name,stakeholder,specific_identity,note,email,created_at,page_path')
    .maybeSingle()

  if (error || !data) {
    if (error) {
      console.error(error)
      json(res, 500, { error: formatDbError('Failed to update comment.', error) })
      return
    }
    json(res, 404, { error: 'Comment not found or not authorized.' })
    return
  }

  json(res, 200, redactComment(data))
}

export const deleteComment = async (req, res, id) => {
  const ownerIdentity = cleanText(req.headers['x-user-identity'], 320)
  const supabaseAdmin = getSupabaseAdmin()

  if (!id) {
    json(res, 400, { error: 'Missing comment id.' })
    return
  }
  if (!ownerIdentity) {
    json(res, 403, { error: 'Missing owner identity.' })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('comments')
    .delete()
    .eq('id', id)
    .eq('email', ownerIdentity)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    if (error) {
      console.error(error)
      json(res, 500, { error: formatDbError('Failed to delete comment.', error) })
      return
    }
    json(res, 404, { error: 'Comment not found or not authorized.' })
    return
  }

  json(res, 200, { ok: true })
}
