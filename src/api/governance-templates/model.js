/**
 * @typedef {object} GovernanceTemplate
 * @property {string} version - The version of the template
 * @property {string} name - The name of the template
 * @property {string} description - The description of the template
 * @property {Date} createdAt - When the template was created
 * @property {Date} updatedAt - When the template was last updated
 */

/**
 * Creates a new governance template
 * @param {object} data - The template data
 * @returns {GovernanceTemplate}
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
