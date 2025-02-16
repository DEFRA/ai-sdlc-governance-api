import { ObjectId } from 'mongodb'

/**
 * @typedef {object} Project
 * @property {import('mongodb').ObjectId} _id - The unique identifier
 * @property {string} name - The name of the project (required)
 * @property {string} [description] - The description of the project
 * @property {import('mongodb').ObjectId} governanceTemplateId - Reference to the governance template (required)
 * @property {import('mongodb').ObjectId[]} selectedWorkflowTemplateIds - References to selected workflow templates (required)
 * @property {object} [metadata] - Additional project configuration
 * @property {Date} createdAt - When the project was created (required)
 * @property {Date} updatedAt - When the project was last updated (required)
 */

/**
 * Creates a new project
 * @param {object} data - The project data
 * @param {string} data.name - The name of the project
 * @param {string} [data.description] - The description of the project
 * @param {string|import('mongodb').ObjectId} data.governanceTemplateId - Reference to the governance template
 * @param {(string|import('mongodb').ObjectId)[]} data.selectedWorkflowTemplateIds - References to selected workflow templates
 * @param {object} [data.metadata] - Additional project configuration
 * @returns {Omit<Project, '_id'>}
 */
export function createProject(data) {
  const now = new Date()
  const project = {
    name: data.name,
    description: data.description ?? '',
    governanceTemplateId:
      typeof data.governanceTemplateId === 'string'
        ? new ObjectId(data.governanceTemplateId)
        : data.governanceTemplateId,
    selectedWorkflowTemplateIds: (data.selectedWorkflowTemplateIds ?? []).map(
      (id) => (typeof id === 'string' ? new ObjectId(id) : id)
    ),
    metadata: data.metadata ?? {},
    createdAt: now,
    updatedAt: now
  }

  // Ensure all required fields are present and of correct type
  if (!project.name || typeof project.name !== 'string') {
    throw new Error('Invalid name')
  }
  if (!(project.governanceTemplateId instanceof ObjectId)) {
    throw new Error('Invalid governanceTemplateId')
  }
  if (
    !Array.isArray(project.selectedWorkflowTemplateIds) ||
    !project.selectedWorkflowTemplateIds.every((id) => id instanceof ObjectId)
  ) {
    throw new Error('Invalid selectedWorkflowTemplateIds')
  }
  if (
    !(project.createdAt instanceof Date) ||
    !(project.updatedAt instanceof Date)
  ) {
    throw new Error('Invalid dates')
  }

  return project
}
