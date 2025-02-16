import { getWorkflowInstancesHandler } from './controller.js'
import Joi from 'joi'

const workflowInstanceResponseSchema = Joi.object({
  _id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .description('MongoDB ObjectId')
    .example('60d21bbfe3d5d533d9fc1e4c'),
  projectId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .example('60d21bbfe3d5d533d9fc1e4d'),
  workflowTemplateId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .example('60d21bbfe3d5d533d9fc1e4e'),
  name: Joi.string().example('Model Validation Workflow'),
  description: Joi.string().example('Workflow for validating AI models'),
  metadata: Joi.object().example({
    priority: 'high',
    category: 'validation'
  }),
  status: Joi.string().valid('active', 'completed').example('active'),
  createdAt: Joi.date().example('2024-03-20T10:00:00.000Z'),
  updatedAt: Joi.date().example('2024-03-20T10:00:00.000Z')
})

/**
 * @type { import('@hapi/hapi').Plugin<void> }
 */
export default {
  name: 'workflow-instance-routes',
  register: (server) => {
    server.route([
      {
        method: 'GET',
        path: '/api/v1/workflow-instances',
        handler: getWorkflowInstancesHandler,
        options: {
          tags: ['api', 'workflow-instance'],
          description: 'Get workflow instances for a project',
          validate: {
            query: Joi.object({
              projectId: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .description('MongoDB ObjectId of the project')
            })
          },
          response: {
            schema: Joi.array().items(workflowInstanceResponseSchema)
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description: 'List of workflow instances for the project',
                  schema: Joi.array().items(workflowInstanceResponseSchema)
                },
                400: { description: 'Bad request or validation error' },
                404: { description: 'Project not found' }
              }
            }
          }
        }
      }
    ])
  }
}
