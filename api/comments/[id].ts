import {
  deleteComment,
  sendMethodNotAllowed,
  updateComment,
} from '../_lib/comments'

export default async function handler(req: any, res: any) {
  const id = String(req.query.id || '')

  if (req.method === 'PATCH') {
    await updateComment(req, res, id)
    return
  }

  if (req.method === 'DELETE') {
    await deleteComment(req, res, id)
    return
  }

  sendMethodNotAllowed(res, ['PATCH', 'DELETE'])
}
