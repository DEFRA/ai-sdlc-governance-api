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
          description:
            'Create a new workflow template. The order is automatically calculated as max order + 1 for the governance template.',
          validate: {
            payload: createWorkflowTemplateSchema
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description:
                    'Successfully created workflow template. The order is automatically set to max order + 1 for the governance template.',
                  schema: Joi.object({
                    _id: Joi.string().example('60d21bbfe3d5d533d9fc1e4c'),
                    governanceTemplateId: Joi.string().example(
                      '60d21bbfe3d5d533d9fc1e4d'
                    ),
                    name: Joi.string().example('Model Development Workflow'),
                    description: Joi.string().example(
                      'Workflow for developing and validating AI models'
                    ),
                    metadata: Joi.object().example({
                      priority: 'high',
                      category: 'development'
                    }),
                    order: Joi.number().integer().min(0).example(1),
                    createdAt: Joi.date().example('2024-03-20T10:00:00.000Z'),
                    updatedAt: Joi.date().example('2024-03-20T10:00:00.000Z')
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
                    _id: Joi.string().example('60d21bbfe3d5d533d9fc1e4c'),
                    governanceTemplateId: Joi.string().example(
                      '60d21bbfe3d5d533d9fc1e4d'
                    ),
                    name: Joi.string().example('Model Development Workflow'),
                    description: Joi.string().example(
                      'Workflow for developing and validating AI models'
                    ),
                    metadata: Joi.object().example({
                      priority: 'high',
                      category: 'development'
                    }),
                    order: Joi.number().integer().min(0).example(1),
                    createdAt: Joi.date().example('2024-03-20T10:00:00.000Z'),
                    updatedAt: Joi.date().example('2024-03-20T10:00:00.000Z')
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
                    _id: Joi.string().example('60d21bbfe3d5d533d9fc1e4c'),
                    governanceTemplateId: Joi.string().example(
                      '60d21bbfe3d5d533d9fc1e4d'
                    ),
                    name: Joi.string().example('Model Development Workflow'),
                    description: Joi.string().example(
                      'Workflow for developing and validating AI models'
                    ),
                    metadata: Joi.object().example({
                      priority: 'high',
                      category: 'development'
                    }),
                    order: Joi.number().integer().min(0).example(1),
                    createdAt: Joi.date().example('2024-03-20T10:00:00.000Z'),
                    updatedAt: Joi.date().example('2024-03-20T10:00:00.000Z')
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
              governanceTemplateId: Joi.string()
                .description('Filter by governance template ID')
                .example('60d21bbfe3d5d533d9fc1e4c')
            })
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description: 'Successfully retrieved workflow templates',
                  schema: Joi.array().items(
                    Joi.object({
                      _id: Joi.string().example('60d21bbfe3d5d533d9fc1e4c'),
                      governanceTemplateId: Joi.string().example(
                        '60d21bbfe3d5d533d9fc1e4d'
                      ),
                      name: Joi.string().example('Model Development Workflow'),
                      description: Joi.string().example(
                        'Workflow for developing and validating AI models'
                      ),
                      metadata: Joi.object().example({
                        priority: 'high',
                        category: 'development'
                      }),
                      order: Joi.number().integer().min(0).example(1),
                      createdAt: Joi.date().example('2024-03-20T10:00:00.000Z'),
                      updatedAt: Joi.date().example('2024-03-20T10:00:00.000Z')
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
