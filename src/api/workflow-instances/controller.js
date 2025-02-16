import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'

/**
 * Compares two workflows based on their checklist items
 * @param {Array} itemsA Checklist items for workflow A
 * @param {Array} itemsB Checklist items for workflow B
 * @returns {number} Comparison result (-1, 0, 1)
 */
function compareWorkflowsByItems(itemsA, itemsB) {
  // Handle empty cases - empty workflows go to the bottom
  if (!itemsA?.length && !itemsB?.length) return 0
  if (!itemsA?.length) return 1
  if (!itemsB?.length) return -1

  // Compare based on number of completed items
  const completedA = itemsA.filter((item) => item.status === 'complete').length
  const completedB = itemsB.filter((item) => item.status === 'complete').length

  if (completedA !== completedB) {
    return completedB - completedA // More completed items first
  }

  // If same number of completed items, compare total items
  return itemsB.length - itemsA.length // More total items first
}

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
      .toArray()

    // Get all checklist items for these workflows
    const workflowIds = workflowInstances.map((wf) => wf._id)
    const checklistItems = await request.db
      .collection('checklistItemInstances')
      .find({ workflowInstanceId: { $in: workflowIds } })
      .toArray()

    // Group checklist items by workflow
    const itemsByWorkflow = new Map()
    checklistItems.forEach((item) => {
      const wfId = item.workflowInstanceId.toString()
      if (!itemsByWorkflow.has(wfId)) {
        itemsByWorkflow.set(wfId, [])
      }
      itemsByWorkflow.get(wfId).push(item)
    })

    // Sort workflow instances based on their checklist items
    workflowInstances.sort((a, b) => {
      const itemsA = itemsByWorkflow.get(a._id.toString()) || []
      const itemsB = itemsByWorkflow.get(b._id.toString()) || []
      return compareWorkflowsByItems(itemsA, itemsB)
    })

    // Convert ObjectIds to strings
    const formattedInstances = workflowInstances.map((instance) => ({
      ...instance,
      _id: instance._id.toString(),
      projectId: instance.projectId.toString(),
      workflowTemplateId: instance.workflowTemplateId.toString()
    }))

    return h.response(formattedInstances).code(200)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}
