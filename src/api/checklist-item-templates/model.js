import { ObjectId } from 'mongodb'

/**
 * @typedef {object} ChecklistItemTemplate
 * @property {import('mongodb').ObjectId} _id - The unique identifier
 * @property {import('mongodb').ObjectId} workflowTemplateId - Reference to parent WorkflowTemplate (required)
 * @property {string} name - Display name of the checklist item (required)
 * @property {string} [description] - Detailed description
 * @property {string} type - Type of checklist item (e.g. 'approval', 'document', 'task') (required)
 * @property {import('mongodb').ObjectId[]} dependencies_requires - Array of checklist item template IDs that this item depends on
 * @property {object} [metadata] - Additional configuration
 * @property {number} [order] - Manual ordering position for the checklist item
 * @property {Date} createdAt - When the template was created (required)
 * @property {Date} updatedAt - When the template was last updated (required)
 */

/**
 * Creates a new checklist item template
 * @param {object} data - The template data
 * @param {string|import('mongodb').ObjectId} data.workflowTemplateId - Reference to parent WorkflowTemplate
 * @param {string} data.name - Display name of the checklist item
 * @param {string} data.type - Type of checklist item
 * @param {string} [data.description] - Detailed description
 * @param {string[]} [data.dependencies_requires] - Array of checklist item template IDs that this item depends on
 * @param {object} [data.metadata] - Additional configuration
 * @param {number} data.order - Manual ordering position for the checklist item
 * @returns {Omit<ChecklistItemTemplate, '_id'>}
 */
export function createChecklistItemTemplate(data) {
  const now = new Date()
  return {
    workflowTemplateId:
      typeof data.workflowTemplateId === 'string'
        ? new ObjectId(data.workflowTemplateId)
        : data.workflowTemplateId,
    name: data.name,
    description: data.description,
    type: data.type,
    dependencies_requires: (data.dependencies_requires ?? []).map((id) =>
      typeof id === 'string' ? new ObjectId(id) : id
    ),
    metadata: data.metadata ?? {},
    order: data.order,
    createdAt: now,
    updatedAt: now
  }
}
