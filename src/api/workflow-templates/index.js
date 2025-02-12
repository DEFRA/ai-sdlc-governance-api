import {
  createWorkflowTemplateHandler,
  getWorkflowTemplateHandler,
  updateWorkflowTemplateHandler,
  deleteWorkflowTemplateHandler,
  getAllWorkflowTemplatesHandler
} from './controller.js'
import {
  createWorkflowTemplateSchema,
  updateWorkflowTemplateSchema
} from './validation.js'
import Joi from 'joi'

/**
 * @type { import('@hapi/hapi').Plugin<void> }
 */
export default {
  name: 'workflow-template-routes',
  register: (server) => {
    server.route([
      {
        method: 'POST',
        path: '/api/v1/workflow-templates',
        handler: createWorkflowTemplateHandler,
        options: {
          tags: ['api', 'workflow-template'],
          description: 'Create a new workflow template',
          validate: {
            payload: createWorkflowTemplateSchema
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description: 'Successfully created workflow template',
                  schema: Joi.object({
                    _id: Joi.string(),
                    governanceTemplateId: Joi.string(),
                    name: Joi.string(),
                    description: Joi.string(),
                    metadata: Joi.object(),
                    createdAt: Joi.date(),
                    updatedAt: Joi.date()
                  })
                },
                400: { description: 'Bad request' },
                404: { description: 'Governance template not found' },
                409: { description: 'Template with this name already exists' }
              }
            }
          }
        }
      },
      {
        method: 'GET',
        path: '/api/v1/workflow-templates/{id}',
        handler: getWorkflowTemplateHandler,
        options: {
          tags: ['api', 'workflow-template'],
          description: 'Get a workflow template by ID',
          validate: {
            params: Joi.object({
              id: Joi.string().required().description('Workflow template ID')
            })
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description: 'Successfully retrieved workflow template',
                  schema: Joi.object({
                    _id: Joi.string(),
                    governanceTemplateId: Joi.string(),
                    name: Joi.string(),
                    description: Joi.string(),
                    metadata: Joi.object(),
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
        path: '/api/v1/workflow-templates/{id}',
        handler: updateWorkflowTemplateHandler,
        options: {
          tags: ['api', 'workflow-template'],
          description: 'Update a workflow template',
          validate: {
            params: Joi.object({
              id: Joi.string().required().description('Workflow template ID')
            }),
            payload: updateWorkflowTemplateSchema
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description: 'Successfully updated workflow template',
                  schema: Joi.object({
                    _id: Joi.string(),
                    governanceTemplateId: Joi.string(),
                    name: Joi.string(),
                    description: Joi.string(),
                    metadata: Joi.object(),
                    createdAt: Joi.date(),
                    updatedAt: Joi.date()
                  })
                },
                404: { description: 'Template not found' },
                400: { description: 'Bad request' },
                409: { description: 'Template with this name already exists' }
              }
            }
          }
        }
      },
      {
        method: 'DELETE',
        path: '/api/v1/workflow-templates/{id}',
        handler: deleteWorkflowTemplateHandler,
        options: {
          tags: ['api', 'workflow-template'],
          description: 'Delete a workflow template',
          validate: {
            params: Joi.object({
              id: Joi.string().required().description('Workflow template ID')
            })
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                204: { description: 'Successfully deleted workflow template' },
                404: { description: 'Template not found' },
                400: { description: 'Bad request' }
              }
            }
          }
        }
      },
      {
        method: 'GET',
        path: '/api/v1/workflow-templates',
        handler: getAllWorkflowTemplatesHandler,
        options: {
          tags: ['api', 'workflow-template'],
          description: 'Get all workflow templates',
          validate: {
            query: Joi.object({
              governanceTemplateId: Joi.string().description(
                'Filter by governance template ID'
              )
            })
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description: 'Successfully retrieved workflow templates',
                  schema: Joi.array().items(
                    Joi.object({
                      _id: Joi.string(),
                      governanceTemplateId: Joi.string(),
                      name: Joi.string(),
                      description: Joi.string(),
                      metadata: Joi.object(),
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
