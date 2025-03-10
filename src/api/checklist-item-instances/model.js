import { ObjectId } from 'mongodb'

/**
 * @typedef {object} ChecklistItemInstance
 * @property {import('mongodb').ObjectId} _id - The unique identifier
 * @property {import('mongodb').ObjectId} workflowInstanceId - Reference to parent WorkflowInstance (required)
 * @property {import('mongodb').ObjectId} checklistItemTemplateId - Reference to the template this instance is based on (required)
 * @property {string} name - Display name of the checklist item (required)
 * @property {string} [description] - Detailed description
 * @property {string} type - Type of checklist item (e.g. 'approval', 'document', 'task') (required)
 * @property {string} status - Current status (e.g. 'incomplete', 'complete', 'not_required') (required)
 * @property {import('mongodb').ObjectId[]} dependencies_requires - Array of checklist item instance IDs that this item depends on
 * @property {object} [metadata] - Additional configuration
 * @property {number} [order] - Manual ordering position for the checklist item
 * @property {Date} createdAt - When the instance was created (required)
 * @property {Date} updatedAt - When the instance was last updated (required)
 */

/**
 * Creates a new checklist item instance from a template
 * @param {object} data - The instance data
 * @param {string|import('mongodb').ObjectId} data.workflowInstanceId - Reference to parent WorkflowInstance
 * @param {string|import('mongodb').ObjectId} data.checklistItemTemplateId - Reference to the template
 * @param {string} data.name - Display name of the checklist item
 * @param {string} [data.description] - Detailed description
 * @param {string} data.type - Type of checklist item
 * @param {string[]} [data.dependencies_requires] - Array of checklist item instance IDs that this item depends on
 * @param {object} [data.metadata] - Additional configuration
 * @param {number} [data.order] - Manual ordering position for the checklist item
 * @returns {Omit<ChecklistItemInstance, '_id'>}
 */
export function createChecklistItemInstance(data) {
  const now = new Date()
  return {
    workflowInstanceId:
      typeof data.workflowInstanceId === 'string'
        ? new ObjectId(data.workflowInstanceId)
        : data.workflowInstanceId,
    checklistItemTemplateId:
      typeof data.checklistItemTemplateId === 'string'
        ? new ObjectId(data.checklistItemTemplateId)
        : data.checklistItemTemplateId,
    name: data.name,
    description: data.description,
    type: data.type,
    status: 'incomplete',
    dependencies_requires: (data.dependencies_requires ?? []).map((id) =>
      typeof id === 'string' ? new ObjectId(id) : id
    ),
    metadata: data.metadata ?? {},
    order: data.order ?? 0,
    createdAt: now,
    updatedAt: now
  }
}
