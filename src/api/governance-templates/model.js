/**
 * @typedef {object} GovernanceTemplate
 * @property {import('mongodb').ObjectId} _id - The unique identifier
 * @property {string} version - The version of the template (required)
 * @property {string} name - The name of the template (required)
 * @property {string} [description] - The description of the template
 * @property {Date} createdAt - When the template was created (required)
 * @property {Date} updatedAt - When the template was last updated (required)
 */

/**
 * Creates a new governance template
 * @param {object} data - The template data
 * @param {string} data.version - The version of the template
 * @param {string} data.name - The name of the template
 * @param {string} [data.description] - The description of the template
 * @returns {Omit<GovernanceTemplate, '_id'>}
 */
export function createGovernanceTemplate(data) {
  const now = new Date()
  return {
    version: data.version,
    name: data.name,
    description: data.description,
    createdAt: now,
    updatedAt: now
  }
}
