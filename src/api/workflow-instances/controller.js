import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'

export const getWorkflowInstancesHandler = async (request, h) => {
  try {
    const projectId = new ObjectId(request.query.projectId)

    // Verify project exists
    const project = await request.db
      .collection('projects')
      .findOne({ _id: projectId })

    if (!project) {
      throw Boom.notFound('Project not found')
    }

    // Get workflow instances for the project
    const workflowInstances = await request.db
      .collection('workflowInstances')
      .find({ projectId })
      .sort({ createdAt: -1 })
      .toArray()

    return h.response(workflowInstances).code(200)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}
