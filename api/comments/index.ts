import {
  createComment,
  listComments,
  sendMethodNotAllowed,
} from '../_lib/comments'

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    await listComments(req, res)
    return
  }

  if (req.method === 'POST') {
    await createComment(req, res)
    return
  }

  sendMethodNotAllowed(res, ['GET', 'POST'])
}
