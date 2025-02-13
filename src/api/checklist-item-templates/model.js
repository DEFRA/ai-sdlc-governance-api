import { ObjectId } from 'mongodb'

/**
 * @typedef {object} ChecklistItemTemplate
 * @property {import('mongodb').ObjectId} _id - The unique identifier
 * @property {import('mongodb').ObjectId} workflowTemplateId - Reference to parent WorkflowTemplate (required)
 * @property {string} itemKey - Unique identifier within the workflow (required)
 * @property {string} name - Display name of the checklist item (required)
 * @property {string} [description] - Detailed description
 * @property {string} type - Type of checklist item (e.g. 'approval', 'document', 'task') (required)
 * @property {object} [dependencies] - Optional dependency configuration
 * @property {object} [metadata] - Additional configuration
 * @property {Date} createdAt - When the template was created (required)
 * @property {Date} updatedAt - When the template was last updated (required)
 */

/**
 * Creates a new checklist item template
 * @param {object} data - The template data
 * @param {string|import('mongodb').ObjectId} data.workflowTemplateId - Reference to parent WorkflowTemplate
 * @param {string} data.itemKey - Unique identifier within the workflow
 * @param {string} data.name - Display name of the checklist item
 * @param {string} data.type - Type of checklist item
 * @param {string} [data.description] - Detailed description
 * @param {object} [data.dependencies] - Optional dependency configuration
 * @param {object} [data.metadata] - Additional configuration
 * @returns {Omit<ChecklistItemTemplate, '_id'>}
 */
export function createChecklistItemTemplate(data) {
  const now = new Date()
  return {
    workflowTemplateId:
      typeof data.workflowTemplateId === 'string'
        ? new ObjectId(data.workflowTemplateId)
        : data.workflowTemplateId,
    itemKey: data.itemKey,
    name: data.name,
    description: data.description,
    type: data.type,
    dependencies: data.dependencies || {},
    metadata: data.metadata || {},
    createdAt: now,
    updatedAt: now
  }
}
