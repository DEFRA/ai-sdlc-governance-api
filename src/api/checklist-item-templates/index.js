import {
  createChecklistItemTemplateHandler,
  getChecklistItemTemplateHandler,
  updateChecklistItemTemplateHandler,
  deleteChecklistItemTemplateHandler,
  getAllChecklistItemTemplatesHandler
} from './controller.js'
import {
  createChecklistItemTemplateSchema,
  updateChecklistItemTemplateSchema
} from './validation.js'
import Joi from 'joi'

/**
 * @type { import('@hapi/hapi').Plugin<void> }
 */
export default {
  name: 'checklist-item-template-routes',
  register: (server) => {
    server.route([
      {
        method: 'POST',
        path: '/api/v1/checklist-item-templates',
        handler: createChecklistItemTemplateHandler,
        options: {
          tags: ['api', 'checklist-item-template'],
          description: 'Create a new checklist item template',
          validate: {
            payload: createChecklistItemTemplateSchema
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                201: {
                  description: 'Successfully created checklist item template',
                  schema: Joi.object({
                    _id: Joi.string(),
                    workflowTemplateId: Joi.string(),
                    itemKey: Joi.string(),
                    name: Joi.string(),
                    description: Joi.string(),
                    type: Joi.string(),
                    dependencies: Joi.object(),
                    metadata: Joi.object(),
                    createdAt: Joi.date(),
                    updatedAt: Joi.date()
                  })
                },
                400: { description: 'Bad request' },
                404: { description: 'Workflow template not found' },
                409: {
                  description: 'Item with this key already exists in workflow'
                }
              }
            }
          }
        }
      },
      {
        method: 'GET',
        path: '/api/v1/checklist-item-templates/{id}',
        handler: getChecklistItemTemplateHandler,
        options: {
          tags: ['api', 'checklist-item-template'],
          description: 'Get a checklist item template by ID',
          validate: {
            params: Joi.object({
              id: Joi.string()
                .required()
                .description('Checklist item template ID')
            })
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description: 'Successfully retrieved checklist item template',
                  schema: Joi.object({
                    _id: Joi.string(),
                    workflowTemplateId: Joi.string(),
                    itemKey: Joi.string(),
                    name: Joi.string(),
                    description: Joi.string(),
                    type: Joi.string(),
                    dependencies: Joi.object(),
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
        path: '/api/v1/checklist-item-templates/{id}',
        handler: updateChecklistItemTemplateHandler,
        options: {
          tags: ['api', 'checklist-item-template'],
          description: 'Update a checklist item template',
          validate: {
            params: Joi.object({
              id: Joi.string()
                .required()
                .description('Checklist item template ID')
            }),
            payload: updateChecklistItemTemplateSchema
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description: 'Successfully updated checklist item template',
                  schema: Joi.object({
                    _id: Joi.string(),
                    workflowTemplateId: Joi.string(),
                    itemKey: Joi.string(),
                    name: Joi.string(),
                    description: Joi.string(),
                    type: Joi.string(),
                    dependencies: Joi.object(),
                    metadata: Joi.object(),
                    createdAt: Joi.date(),
                    updatedAt: Joi.date()
                  })
                },
                404: { description: 'Template not found' },
                400: { description: 'Bad request' },
                409: {
                  description: 'Item with this key already exists in workflow'
                }
              }
            }
          }
        }
      },
      {
        method: 'DELETE',
        path: '/api/v1/checklist-item-templates/{id}',
        handler: deleteChecklistItemTemplateHandler,
        options: {
          tags: ['api', 'checklist-item-template'],
          description: 'Delete a checklist item template',
          validate: {
            params: Joi.object({
              id: Joi.string()
                .required()
                .description('Checklist item template ID')
            })
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                204: {
                  description: 'Successfully deleted checklist item template'
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
        path: '/api/v1/checklist-item-templates',
        handler: getAllChecklistItemTemplatesHandler,
        options: {
          tags: ['api', 'checklist-item-template'],
          description: 'Get all checklist item templates',
          validate: {
            query: Joi.object({
              workflowTemplateId: Joi.string().description(
                'Filter by workflow template ID'
              )
            })
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description:
                    'Successfully retrieved checklist item templates',
                  schema: Joi.array().items(
                    Joi.object({
                      _id: Joi.string(),
                      workflowTemplateId: Joi.string(),
                      itemKey: Joi.string(),
                      name: Joi.string(),
                      description: Joi.string(),
                      type: Joi.string(),
                      dependencies: Joi.object(),
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
