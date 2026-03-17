import {
  deleteComment,
  sendMethodNotAllowed,
  updateComment,
} from '../_lib/comments'

export default async function handler(req: any, res: any) {
  const id = String(req.query.id || '')

  try {
    if (req.method === 'PATCH') {
      await updateComment(req, res, id)
      return
    }

    if (req.method === 'DELETE') {
      await deleteComment(req, res, id)
      return
    }

    sendMethodNotAllowed(res, ['PATCH', 'DELETE'])
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Server error.',
    })
  }
}
