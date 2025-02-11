import {
  createGovernanceTemplateHandler,
  getGovernanceTemplateHandler,
  updateGovernanceTemplateHandler,
  deleteGovernanceTemplateHandler,
  getAllGovernanceTemplatesHandler
} from './controller.js'
import {
  createGovernanceTemplateSchema,
  updateGovernanceTemplateSchema
} from './validation.js'
import Joi from 'joi'

/**
 * @type { import('@hapi/hapi').Plugin<void> }
 */
export default {
  name: 'governance-template-routes',
  register: (server) => {
    server.route([
      {
        method: 'POST',
        path: '/api/v1/governance-templates',
        handler: createGovernanceTemplateHandler,
        options: {
          tags: ['api', 'governance-template'],
          description: 'Create a new governance template',
          validate: {
            payload: createGovernanceTemplateSchema
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description: 'Successfully created governance template',
                  schema: Joi.object({
                    _id: Joi.string(),
                    version: Joi.string(),
                    name: Joi.string(),
                    description: Joi.string(),
                    createdAt: Joi.date(),
                    updatedAt: Joi.date()
                  })
                },
                400: { description: 'Bad request' },
                409: {
                  description:
                    'Template with this name and version already exists'
                }
              }
            }
          }
        }
      },
      {
        method: 'GET',
        path: '/api/v1/governance-templates/{id}',
        handler: getGovernanceTemplateHandler,
        options: {
          tags: ['api', 'governance-template'],
          description: 'Get a governance template by ID',
          validate: {
            params: Joi.object({
              id: Joi.string().required().description('Governance template ID')
            })
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description: 'Successfully retrieved governance template',
                  schema: Joi.object({
                    _id: Joi.string(),
                    version: Joi.string(),
                    name: Joi.string(),
                    description: Joi.string(),
                    createdAt: Joi.date(),
                    updatedAt: Joi.date()
                  })
                },
                404: { description: 'Template not found' },
                400: { description: 'Bad request' }
              }
            }
          }
        }
      },
      {
        method: 'PUT',
        path: '/api/v1/governance-templates/{id}',
        handler: updateGovernanceTemplateHandler,
        options: {
          tags: ['api', 'governance-template'],
          description: 'Update a governance template',
          validate: {
            params: Joi.object({
              id: Joi.string().required().description('Governance template ID')
            }),
            payload: updateGovernanceTemplateSchema
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description: 'Successfully updated governance template',
                  schema: Joi.object({
                    _id: Joi.string(),
                    version: Joi.string(),
                    name: Joi.string(),
                    description: Joi.string(),
                    createdAt: Joi.date(),
                    updatedAt: Joi.date()
                  })
                },
                404: { description: 'Template not found' },
                400: { description: 'Bad request' },
                409: {
                  description:
                    'Template with this name and version already exists'
                }
              }
            }
          }
        }
      },
      {
        method: 'DELETE',
        path: '/api/v1/governance-templates/{id}',
        handler: deleteGovernanceTemplateHandler,
        options: {
          tags: ['api', 'governance-template'],
          description: 'Delete a governance template',
          validate: {
            params: Joi.object({
              id: Joi.string().required().description('Governance template ID')
            })
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                204: {
                  description: 'Successfully deleted governance template'
                },
                404: { description: 'Template not found' },
                400: { description: 'Bad request' }
              }
            }
          }
        }
      },
      {
        method: 'GET',
        path: '/api/v1/governance-templates',
        handler: getAllGovernanceTemplatesHandler,
        options: {
          tags: ['api', 'governance-template'],
          description: 'Get all governance templates',
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description: 'Successfully retrieved governance templates',
                  schema: Joi.array().items(
                    Joi.object({
                      _id: Joi.string(),
                      version: Joi.string(),
                      name: Joi.string(),
                      description: Joi.string(),
                      createdAt: Joi.date(),
                      updatedAt: Joi.date()
                    })
                  )
                },
                400: { description: 'Bad request' }
              }
            }
          }
        }
      }
    ])
  }
}
