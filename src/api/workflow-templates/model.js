import { ObjectId } from 'mongodb'

/**
 * @typedef {object} WorkflowTemplate
 * @property {import('mongodb').ObjectId} _id - The unique identifier
 * @property {import('mongodb').ObjectId} governanceTemplateId - Reference to parent GovernanceTemplate (required)
 * @property {string} name - The name of the workflow (required)
 * @property {string} [description] - The description of the workflow
 * @property {object} [metadata] - Additional workflow configuration
 * @property {Date} createdAt - When the template was created (required)
 * @property {Date} updatedAt - When the template was last updated (required)
 */

/**
 * Creates a new workflow template
 * @param {object} data - The template data
 * @param {string|import('mongodb').ObjectId} data.governanceTemplateId - Reference to parent GovernanceTemplate
 * @param {string} data.name - The name of the workflow
 * @param {string} [data.description] - The description of the workflow
 * @param {object} [data.metadata] - Additional workflow configuration
 * @returns {Omit<WorkflowTemplate, '_id'>}
 */
export function createWorkflowTemplate(data) {
  const now = new Date()
  return {
    governanceTemplateId:
      typeof data.governanceTemplateId === 'string'
        ? new ObjectId(data.governanceTemplateId)
        : data.governanceTemplateId,
    name: data.name,
    description: data.description,
    metadata: data.metadata ?? {},
    createdAt: now,
    updatedAt: now
  }
}
