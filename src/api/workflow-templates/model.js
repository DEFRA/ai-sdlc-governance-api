/**
 * @typedef {object} WorkflowTemplate
 * @property {string} governanceTemplateId - Reference to parent GovernanceTemplate
 * @property {string} name - The name of the workflow
 * @property {string} description - The description of the workflow
 * @property {object} metadata - Additional workflow configuration
 * @property {Date} createdAt - When the template was created
 * @property {Date} updatedAt - When the template was last updated
 */

/**
 * Creates a new workflow template
 * @param {object} data - The template data
 * @returns {WorkflowTemplate}
 */
export function createWorkflowTemplate(data) {
  const now = new Date()
  return {
    governanceTemplateId: data.governanceTemplateId,
    name: data.name,
    description: data.description,
    metadata: data.metadata || {},
    createdAt: now,
    updatedAt: now
  }
}
