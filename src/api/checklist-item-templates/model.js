/**
 * @typedef {object} ChecklistItemTemplate
 * @property {string} workflowTemplateId - Reference to parent WorkflowTemplate
 * @property {string} itemKey - Unique identifier within the workflow
 * @property {string} name - Display name of the checklist item
 * @property {string} description - Detailed description
 * @property {string} type - Type of checklist item (e.g. 'approval', 'document', 'task')
 * @property {object} dependencies - Optional dependency configuration
 * @property {object} metadata - Additional configuration
 * @property {Date} createdAt - When the template was created
 * @property {Date} updatedAt - When the template was last updated
 */

/**
 * Creates a new checklist item template
 * @param {object} data - The template data
 * @returns {ChecklistItemTemplate}
 */
export function createChecklistItemTemplate(data) {
  const now = new Date()
  return {
    workflowTemplateId: data.workflowTemplateId,
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
