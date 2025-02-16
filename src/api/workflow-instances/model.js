import { ObjectId } from 'mongodb'

/**
 * @typedef {object} WorkflowInstance
 * @property {import('mongodb').ObjectId} _id - The unique identifier
 * @property {import('mongodb').ObjectId} projectId - Reference to parent Project (required)
 * @property {import('mongodb').ObjectId} workflowTemplateId - Reference to source WorkflowTemplate (required)
 * @property {string} name - The name of the workflow (required)
 * @property {string} [description] - The description of the workflow
 * @property {object} [metadata] - Additional workflow configuration
 * @property {string} status - Current status of the workflow (e.g., 'active', 'completed') (required)
 * @property {Date} createdAt - When the instance was created (required)
 * @property {Date} updatedAt - When the instance was last updated (required)
 */

/**
 * Creates a new workflow instance from a template
 * @param {object} data - The instance data
 * @param {string|import('mongodb').ObjectId} data.projectId - Reference to parent Project
 * @param {string|import('mongodb').ObjectId} data.workflowTemplateId - Reference to source WorkflowTemplate
 * @param {string} data.name - The name of the workflow
 * @param {string} [data.description] - The description of the workflow
 * @param {object} [data.metadata] - Additional workflow configuration
 * @returns {Omit<WorkflowInstance, '_id'>}
 */
export function createWorkflowInstance(data) {
  const now = new Date()
  return {
    projectId:
      typeof data.projectId === 'string'
        ? new ObjectId(data.projectId)
        : data.projectId,
    workflowTemplateId:
      typeof data.workflowTemplateId === 'string'
        ? new ObjectId(data.workflowTemplateId)
        : data.workflowTemplateId,
    name: data.name,
    description: data.description,
    metadata: data.metadata ?? {},
    status: 'active',
    createdAt: now,
    updatedAt: now
  }
}
