import { updateChecklistItemInstanceHandler } from './controller.js'
import Joi from 'joi'

const checklistItemInstanceResponseSchema = Joi.object({
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
  description: Joi.string().example(
    'Validate the AI model performance and fairness'
  ),
  type: Joi.string().example('task'),
  status: Joi.string()
    .valid('incomplete', 'complete', 'not_required')
    .example('complete'),
  dependencies_requires: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .example(['60d21bbfe3d5d533d9fc1e4f']),
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
  createdAt: Joi.date().example('2024-03-20T10:00:00.000Z'),
  updatedAt: Joi.date().example('2024-03-20T10:00:00.000Z')
})

const updateChecklistItemInstanceSchema = Joi.object({
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
                .description('Checklist item instance ID')
            }),
            payload: updateChecklistItemInstanceSchema
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
