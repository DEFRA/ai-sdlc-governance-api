import {
  updateChecklistItemInstanceHandler,
  getChecklistItemInstancesHandler
} from './controller.js'
import Joi from 'joi'

// First define a base schema without the recursive dependencies
const baseChecklistItemSchema = Joi.object({
  _id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .description('MongoDB ObjectId')
    .example('60d21bbfe3d5d533d9fc1e4c'),
  workflowInstanceId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .example('60d21bbfe3d5d533d9fc1e4d'),
  checklistItemTemplateId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .example('60d21bbfe3d5d533d9fc1e4e'),
  name: Joi.string().example('Model Validation'),
  description: Joi.string()
    .allow('')
    .example('Validate the AI model performance and fairness'),
  type: Joi.string().example('task'),
  status: Joi.string()
    .valid('incomplete', 'complete', 'not_required')
    .example('complete'),
  metadata: Joi.object()
    .example({
      priority: 'high',
      category: 'validation',
      approver: 'john.doe@example.com',
      approvalDate: '2024-03-20T10:00:00.000Z',
      documentUrl: 'https://example.com/doc.pdf',
      completedBy: 'jane.smith@example.com',
      completedDate: '2024-03-20T10:00:00.000Z'
    })
    .description('Additional configuration based on checklist item type'),
  order: Joi.number()
    .integer()
    .min(0)
    .example(1)
    .description('Manual ordering position for the checklist item'),
  createdAt: Joi.date().example('2024-03-20T10:00:00.000Z'),
  updatedAt: Joi.date().example('2024-03-20T10:00:00.000Z')
}).id('ChecklistItemInstance')

// Then create the full schema that includes the recursive dependencies
const checklistItemInstanceResponseSchema = baseChecklistItemSchema.keys({
  dependencies_requires: Joi.array()
    .items(
      Joi.alternatives().try(
        Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
        Joi.link('#ChecklistItemInstance')
      )
    )
    .description(
      'Array of checklist item instance IDs that this item depends on'
    )
})

const updateChecklistItemInstanceSchema = Joi.object({
  name: Joi.string(),
  description: Joi.string().allow(''),
  type: Joi.string().valid('approval', 'document', 'task'),
  status: Joi.string()
    .valid('incomplete', 'complete', 'not_required')
    .description('New status for the checklist item'),
  metadata: Joi.object({
    // Approval type metadata
    approver: Joi.string().email().description('Email of the approver'),
    approvalDate: Joi.date().description('Date of approval'),
    // Document type metadata
    documentUrl: Joi.string().uri().description('URL of the uploaded document'),
    // Task type metadata
    completedBy: Joi.string().description('User who completed the task'),
    completedDate: Joi.date().description('Date when task was completed'),
    // Common metadata
    priority: Joi.string().valid('low', 'medium', 'high'),
    notes: Joi.string().description('Additional notes'),
    category: Joi.string().description('Category of the checklist item')
  }).description('Additional configuration based on checklist item type')
}).min(1)

/**
 * @type { import('@hapi/hapi').Plugin<void> }
 */
export default {
  name: 'checklist-item-instance-routes',
  register: (server) => {
    server.route([
      {
        method: 'GET',
        path: '/api/v1/checklist-item-instances',
        handler: getChecklistItemInstancesHandler,
        options: {
          tags: ['api', 'checklist-item-instance'],
          description: 'Get checklist item instances for a workflow instance',
          validate: {
            query: Joi.object({
              workflowInstanceId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .description('MongoDB ObjectId of the workflow instance')
            })
          },
          response: {
            schema: Joi.array().items(checklistItemInstanceResponseSchema)
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description:
                    'List of checklist item instances for the workflow',
                  schema: Joi.array().items(checklistItemInstanceResponseSchema)
                },
                400: { description: 'Bad request or validation error' },
                404: { description: 'Workflow instance not found' }
              }
            }
          }
        }
      },
      {
        method: 'PUT',
        path: '/api/v1/checklist-item-instances/{id}',
        handler: updateChecklistItemInstanceHandler,
        options: {
          tags: ['api', 'checklist-item-instance'],
          description: 'Update a checklist item instance',
          validate: {
            params: Joi.object({
              id: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .description('MongoDB ObjectId')
            }),
            payload: updateChecklistItemInstanceSchema
          },
          response: {
            schema: checklistItemInstanceResponseSchema
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description: 'Successfully updated checklist item instance',
                  schema: checklistItemInstanceResponseSchema
                },
                400: { description: 'Bad request or validation error' },
                404: { description: 'Checklist item instance not found' },
                412: {
                  description: 'Dependencies not met for status change'
                }
              }
            }
          }
        }
      }
    ])
  }
}
