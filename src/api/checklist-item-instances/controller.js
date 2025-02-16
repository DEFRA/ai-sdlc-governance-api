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

    const result = await collection.findOneAndUpdate(
      { _id: instanceId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw Boom.notFound('Checklist item instance not found')
    }

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
