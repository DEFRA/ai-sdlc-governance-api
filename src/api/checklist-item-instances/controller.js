import { ObjectId } from 'mongodb'
import Boom from '@hapi/boom'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

/**
 * Validates that all dependencies are complete before allowing status change
 * @param {import('mongodb').Collection} collection
 * @param {import('mongodb').ObjectId} instanceId
 * @param {string} newStatus
 * @returns {Promise<boolean>}
 */
async function validateDependencies(collection, instanceId, newStatus) {
  if (newStatus !== 'complete') {
    return true // Only validate dependencies when marking as complete
  }

  const instance = await collection.findOne({ _id: instanceId })
  if (!instance || !instance.dependencies_requires?.length) {
    return true
  }

  const dependencyIds = instance.dependencies_requires.map((id) =>
    typeof id === 'string' ? new ObjectId(id) : id
  )

  const dependencies = await collection
    .find({ _id: { $in: dependencyIds } })
    .toArray()

  return dependencies.every((dep) => dep.status === 'complete')
}

/**
 * Records an audit log entry for status change
 * @param {import('@hapi/hapi').Request} request
 * @param {string} instanceId
 * @param {string} oldStatus
 * @param {string} newStatus
 */
async function recordAuditLog(request, instanceId, oldStatus, newStatus) {
  try {
    await request.db.collection('auditLogs').insertOne({
      eventType: 'checklist_item_status_change',
      objectType: 'checklist_item_instance',
      objectId: new ObjectId(instanceId),
      changes: {
        status: {
          from: oldStatus,
          to: newStatus
        }
      },
      changedAt: new Date(),
      changedBy: request.auth?.credentials?.user?.id || 'system'
    })
  } catch (error) {
    logger.error(error, 'Failed to record audit log')
  }
}

/**
 * Performs a topological sort of checklist items based on their dependencies
 * @param {Array} items Array of checklist items to sort
 * @returns {Array} Sorted array of checklist items
 */
function topologicalSort(items) {
  // Handle empty case
  if (!items || items.length === 0) {
    return []
  }

  // Create a map of id to item for easy lookup
  const itemMap = new Map(items.map((item) => [item._id.toString(), item]))

  // Create adjacency list representation of dependencies
  const graph = new Map()
  const inDegree = new Map()

  // Initialize graphs
  items.forEach((item) => {
    const id = item._id.toString()
    graph.set(id, [])
    inDegree.set(id, 0)
  })

  // Build dependency graph
  items.forEach((item) => {
    const id = item._id.toString()
    if (item.dependencies_requires) {
      const deps = Array.isArray(item.dependencies_requires)
        ? item.dependencies_requires.map((d) =>
            typeof d === 'string' ? d : d._id.toString()
          )
        : []
      deps.forEach((depId) => {
        if (graph.has(depId)) {
          graph.get(depId).push(id)
          inDegree.set(id, inDegree.get(id) + 1)
        }
      })
    }
  })

  // Find all items with no dependencies
  const queue = []
  inDegree.forEach((count, id) => {
    if (count === 0) queue.push(id)
  })

  // Process queue
  const result = []
  while (queue.length > 0) {
    const id = queue.shift()
    result.push(itemMap.get(id))

    // Process items that depend on this one
    graph.get(id).forEach((dependentId) => {
      inDegree.set(dependentId, inDegree.get(dependentId) - 1)
      if (inDegree.get(dependentId) === 0) {
        queue.push(dependentId)
      }
    })
  }

  return result
}

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

export const updateChecklistItemInstanceStatusHandler = async (request, h) => {
  try {
    const instanceId = new ObjectId(request.params.id)
    const newStatus = request.payload.status

    const collection = request.db.collection('checklistItemInstances')

    // Get current instance
    const currentInstance = await collection.findOne({ _id: instanceId })
    if (!currentInstance) {
      throw Boom.notFound('Checklist item instance not found')
    }

    // Validate dependencies if marking as complete
    const dependenciesValid = await validateDependencies(
      collection,
      instanceId,
      newStatus
    )
    if (!dependenciesValid) {
      throw Boom.preconditionFailed(
        'Cannot mark as complete - dependencies are not complete'
      )
    }

    // Update the status
    const result = await collection.findOneAndUpdate(
      { _id: instanceId },
      {
        $set: {
          status: newStatus,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw Boom.notFound('Checklist item instance not found')
    }

    // Convert ObjectIds to strings for response
    result._id = result._id.toString()
    result.workflowInstanceId = result.workflowInstanceId.toString()
    result.checklistItemTemplateId = result.checklistItemTemplateId.toString()

    // Record audit log
    await recordAuditLog(
      request,
      request.params.id,
      currentInstance.status,
      newStatus
    )

    return h.response(result).code(200)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}

export const updateChecklistItemInstanceHandler = async (request, h) => {
  try {
    const instanceId = new ObjectId(request.params.id)
    const updates = request.payload
    const collection = request.db.collection('checklistItemInstances')

    // Get current instance
    const currentInstance = await collection.findOne({ _id: instanceId })
    if (!currentInstance) {
      throw Boom.notFound('Checklist item instance not found')
    }

    // If status is being updated, validate dependencies
    if (updates.status && updates.status !== currentInstance.status) {
      const dependenciesValid = await validateDependencies(
        collection,
        instanceId,
        updates.status
      )
      if (!dependenciesValid) {
        throw Boom.preconditionFailed(
          'Cannot mark as complete - dependencies are not complete'
        )
      }
    }

    // Validate metadata based on type
    if (updates.metadata) {
      switch (currentInstance.type) {
        case 'approval':
          if (!updates.metadata.approver) {
            throw Boom.badRequest('Approver is required for approval items')
          }
          if (!updates.metadata.approvalDate && updates.status === 'complete') {
            updates.metadata.approvalDate = new Date()
          }
          break
        case 'document':
          if (!updates.metadata.documentUrl && updates.status === 'complete') {
            throw Boom.badRequest('Document URL is required for document items')
          }
          break
        case 'task':
          if (!updates.metadata.completedBy && updates.status === 'complete') {
            updates.metadata.completedBy =
              request.auth?.credentials?.user?.id || 'system'
          }
          if (
            !updates.metadata.completedDate &&
            updates.status === 'complete'
          ) {
            updates.metadata.completedDate = new Date()
          }
          break
      }
    }

    // Update the instance
    const updateData = {
      ...updates,
      updatedAt: new Date()
    }

    // Prevent updating dependencies
    if (updateData.dependencies_requires) {
      throw Boom.badRequest(
        '\n        Cannot update dependencies - they are managed by the system\n      '
      )
    }

    const result = await collection.findOneAndUpdate(
      { _id: instanceId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw Boom.notFound('Checklist item instance not found')
    }

    // Convert ObjectIds to strings for response
    result._id = result._id.toString()
    result.workflowInstanceId = result.workflowInstanceId.toString()
    result.checklistItemTemplateId = result.checklistItemTemplateId.toString()

    // Record audit log if status changed
    if (updates.status && updates.status !== currentInstance.status) {
      await recordAuditLog(
        request,
        request.params.id,
        currentInstance.status,
        updates.status
      )
    }

    return h.response(result).code(200)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}

export const getChecklistItemInstancesHandler = async (request, h) => {
  try {
    const workflowInstanceId = new ObjectId(request.query.workflowInstanceId)

    // Get all workflow instances to compare
    const workflowInstances = await request.db
      .collection('workflowInstances')
      .find({})
      .toArray()

    if (!workflowInstances?.length) {
      throw Boom.notFound('No workflow instances found')
    }

    // Get checklist items for all workflows
    const allChecklistItems = await request.db
      .collection('checklistItemInstances')
      .find({})
      .toArray()

    // Group checklist items by workflow
    const itemsByWorkflow = new Map()
    allChecklistItems.forEach((item) => {
      const wfId = item.workflowInstanceId.toString()
      if (!itemsByWorkflow.has(wfId)) {
        itemsByWorkflow.set(wfId, [])
      }
      itemsByWorkflow.get(wfId).push(item)
    })

    // Sort workflows based on their checklist items
    workflowInstances.sort((a, b) => {
      const itemsA = itemsByWorkflow.get(a._id.toString()) || []
      const itemsB = itemsByWorkflow.get(b._id.toString()) || []
      return compareWorkflowsByItems(itemsA, itemsB)
    })

    // Get checklist items for the requested workflow
    const checklistItemInstances = allChecklistItems.filter(
      (item) =>
        item.workflowInstanceId.toString() === workflowInstanceId.toString()
    )

    // If no checklist items found, return empty array
    if (!checklistItemInstances?.length) {
      return h.response([]).code(200)
    }

    // Convert ObjectIds and populate dependencies
    for (const instance of checklistItemInstances) {
      instance._id = instance._id.toString()
      instance.workflowInstanceId = instance.workflowInstanceId.toString()
      instance.checklistItemTemplateId =
        instance.checklistItemTemplateId.toString()

      if (instance.dependencies_requires?.length > 0) {
        if (
          instance.dependencies_requires[0] instanceof ObjectId ||
          typeof instance.dependencies_requires[0] === 'string'
        ) {
          const dependencyIds = instance.dependencies_requires.map((id) =>
            typeof id === 'string' ? new ObjectId(id) : id
          )
          const dependencies = await request.db
            .collection('checklistItemInstances')
            .find({ _id: { $in: dependencyIds } })
            .toArray()

          instance.dependencies_requires = dependencies.map((dep) => ({
            ...dep,
            _id: dep._id.toString(),
            workflowInstanceId: dep.workflowInstanceId.toString(),
            checklistItemTemplateId: dep.checklistItemTemplateId.toString(),
            dependencies_requires: Array.isArray(dep.dependencies_requires)
              ? dep.dependencies_requires.map((id) => id.toString())
              : dep.dependencies_requires
          }))
        }
      }
    }

    // Sort items topologically based on dependencies
    const sortedItems = topologicalSort(checklistItemInstances)

    return h.response(sortedItems).code(200)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}
