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
                    _id: Joi.string().example('60d21bbfe3d5d533d9fc1e4c'),
                    workflowTemplateId: Joi.string().example(
                      '60d21bbfe3d5d533d9fc1e4d'
                    ),
                    name: Joi.string().example('Model Validation'),
                    description: Joi.string().example(
                      'Validate the AI model performance and fairness'
                    ),
                    type: Joi.string().example('task'),
                    dependencies_requires: Joi.array()
                      .items(Joi.string())
                      .example(['60d21bbfe3d5d533d9fc1e4e']),
                    dependencies_requiredBy: Joi.array().items(
                      Joi.object({
                        _id: Joi.string().example('60d21bbfe3d5d533d9fc1e4f'),
                        workflowTemplateId: Joi.string().example(
                          '60d21bbfe3d5d533d9fc1e4d'
                        ),
                        name: Joi.string().example('Model Deployment'),
                        description: Joi.string().example(
                          'Deploy the validated AI model'
                        ),
                        type: Joi.string().example('approval'),
                        dependencies_requires: Joi.array()
                          .items(Joi.string())
                          .example(['60d21bbfe3d5d533d9fc1e4c']),
                        metadata: Joi.object().example({ priority: 'high' }),
                        createdAt: Joi.date().example(
                          '2024-03-20T10:00:00.000Z'
                        ),
                        updatedAt: Joi.date().example(
                          '2024-03-20T10:00:00.000Z'
                        )
                      })
                    ),
                    metadata: Joi.object().example({
                      priority: 'high',
                      category: 'validation'
                    }),
                    createdAt: Joi.date().example('2024-03-20T10:00:00.000Z'),
                    updatedAt: Joi.date().example('2024-03-20T10:00:00.000Z')
                  })
                },
                400: { description: 'Bad request' },
                404: { description: 'Workflow template not found' }
              },
              payloadType: 'json',
              validate: {
                payload: Joi.object({
                  workflowTemplateId: Joi.string()
                    .required()
                    .example('60d21bbfe3d5d533d9fc1e4d'),
                  name: Joi.string()
                    .required()
                    .example('Upload Approval Document'),
                  description: Joi.string()
                    .required()
                    .example(
                      'Checklist item for uploading an approval document'
                    ),
                  type: Joi.string()
                    .required()
                    .valid('approval', 'document', 'task')
                    .example('approval'),
                  dependencies_requires: Joi.array()
                    .items(Joi.string())
                    .default([])
                    .example(['60d21bbfe3d5d533d9fc1e4d']),
                  metadata: Joi.object().default({}).example({})
                })
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
                    _id: Joi.string().example('60d21bbfe3d5d533d9fc1e4c'),
                    workflowTemplateId: Joi.string().example(
                      '60d21bbfe3d5d533d9fc1e4d'
                    ),
                    name: Joi.string().example('Model Validation'),
                    description: Joi.string().example(
                      'Validate the AI model performance and fairness'
                    ),
                    type: Joi.string().example('task'),
                    dependencies_requires: Joi.array()
                      .items(Joi.string())
                      .example(['60d21bbfe3d5d533d9fc1e4e']),
                    dependencies_requiredBy: Joi.array().items(
                      Joi.object({
                        _id: Joi.string().example('60d21bbfe3d5d533d9fc1e4f'),
                        workflowTemplateId: Joi.string().example(
                          '60d21bbfe3d5d533d9fc1e4d'
                        ),
                        name: Joi.string().example('Model Deployment'),
                        description: Joi.string().example(
                          'Deploy the validated AI model'
                        ),
                        type: Joi.string().example('approval'),
                        dependencies_requires: Joi.array()
                          .items(Joi.string())
                          .example(['60d21bbfe3d5d533d9fc1e4c']),
                        metadata: Joi.object().example({ priority: 'high' }),
                        createdAt: Joi.date().example(
                          '2024-03-20T10:00:00.000Z'
                        ),
                        updatedAt: Joi.date().example(
                          '2024-03-20T10:00:00.000Z'
                        )
                      })
                    ),
                    metadata: Joi.object().example({
                      priority: 'high',
                      category: 'validation'
                    }),
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
                    _id: Joi.string().example('60d21bbfe3d5d533d9fc1e4c'),
                    workflowTemplateId: Joi.string().example(
                      '60d21bbfe3d5d533d9fc1e4d'
                    ),
                    name: Joi.string().example('Model Validation'),
                    description: Joi.string().example(
                      'Validate the AI model performance and fairness'
                    ),
                    type: Joi.string().example('task'),
                    dependencies_requires: Joi.array()
                      .items(Joi.string())
                      .example(['60d21bbfe3d5d533d9fc1e4e']),
                    dependencies_requiredBy: Joi.array().items(
                      Joi.object({
                        _id: Joi.string().example('60d21bbfe3d5d533d9fc1e4f'),
                        workflowTemplateId: Joi.string().example(
                          '60d21bbfe3d5d533d9fc1e4d'
                        ),
                        name: Joi.string().example('Model Deployment'),
                        description: Joi.string().example(
                          'Deploy the validated AI model'
                        ),
                        type: Joi.string().example('approval'),
                        dependencies_requires: Joi.array()
                          .items(Joi.string())
                          .example(['60d21bbfe3d5d533d9fc1e4c']),
                        metadata: Joi.object().example({ priority: 'high' }),
                        createdAt: Joi.date().example(
                          '2024-03-20T10:00:00.000Z'
                        ),
                        updatedAt: Joi.date().example(
                          '2024-03-20T10:00:00.000Z'
                        )
                      })
                    ),
                    metadata: Joi.object().example({
                      priority: 'high',
                      category: 'validation'
                    }),
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
              workflowTemplateId: Joi.string()
                .description('Filter by workflow template ID')
                .example('60d21bbfe3d5d533d9fc1e4d'),
              governanceTemplateId: Joi.string()
                .description('Filter by governance template ID')
                .example('60d21bbfe3d5d533d9fc1e4c')
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
                      _id: Joi.string().example('60d21bbfe3d5d533d9fc1e4c'),
                      workflowTemplateId: Joi.string().example(
                        '60d21bbfe3d5d533d9fc1e4d'
                      ),
                      name: Joi.string().example('Model Validation'),
                      description: Joi.string().example(
                        'Validate the AI model performance and fairness'
                      ),
                      type: Joi.string().example('task'),
                      dependencies_requires: Joi.array()
                        .items(Joi.string())
                        .example(['60d21bbfe3d5d533d9fc1e4e']),
                      dependencies_requiredBy: Joi.array().items(
                        Joi.object({
                          _id: Joi.string().example('60d21bbfe3d5d533d9fc1e4f'),
                          workflowTemplateId: Joi.string().example(
                            '60d21bbfe3d5d533d9fc1e4d'
                          ),
                          name: Joi.string().example('Model Deployment'),
                          description: Joi.string().example(
                            'Deploy the validated AI model'
                          ),
                          type: Joi.string().example('approval'),
                          dependencies_requires: Joi.array()
                            .items(Joi.string())
                            .example(['60d21bbfe3d5d533d9fc1e4c']),
                          metadata: Joi.object().example({ priority: 'high' }),
                          createdAt: Joi.date().example(
                            '2024-03-20T10:00:00.000Z'
                          ),
                          updatedAt: Joi.date().example(
                            '2024-03-20T10:00:00.000Z'
                          )
                        })
                      ),
                      metadata: Joi.object().example({
                        priority: 'high',
                        category: 'validation'
                      }),
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
