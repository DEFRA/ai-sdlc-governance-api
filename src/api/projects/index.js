import {
  createProjectHandler,
  getProjectHandler,
  updateProjectHandler,
  deleteProjectHandler,
  getAllProjectsHandler
} from './controller.js'
import {
  createProjectSchema,
  updateProjectSchema,
  idSchema
} from './validation.js'
import Joi from 'joi'

const projectResponseSchema = Joi.object({
  _id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .description('MongoDB ObjectId')
    .example('60d21bbfe3d5d533d9fc1e4c'),
  name: Joi.string().example('AI Model Development Project'),
  description: Joi.string().example('Project for developing a new AI model'),
  governanceTemplateId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .example('60d21bbfe3d5d533d9fc1e4d'),
  selectedWorkflowTemplateIds: Joi.array().items(
    Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .example('60d21bbfe3d5d533d9fc1e4e')
  ),
  metadata: Joi.object().example({
    priority: 'high',
    department: 'AI Research'
  }),
  createdAt: Joi.date().example('2024-03-20T10:00:00.000Z'),
  updatedAt: Joi.date().example('2024-03-20T10:00:00.000Z')
})

/**
 * @type { import('@hapi/hapi').Plugin<void> }
 */
export default {
  name: 'project-routes',
  register: (server) => {
    server.route([
      {
        method: 'POST',
        path: '/api/v1/projects',
        handler: createProjectHandler,
        options: {
          tags: ['api', 'project'],
          description: 'Create a new project',
          validate: {
            payload: createProjectSchema
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                201: {
                  description: 'Successfully created project',
                  schema: projectResponseSchema
                },
                400: { description: 'Bad request' },
                404: {
                  description:
                    'Governance template or workflow template not found'
                }
              }
            }
          }
        }
      },
      {
        method: 'GET',
        path: '/api/v1/projects/{id}',
        handler: getProjectHandler,
        options: {
          tags: ['api', 'project'],
          description: 'Get a project by ID',
          validate: {
            params: idSchema
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description: 'Successfully retrieved project',
                  schema: projectResponseSchema
                },
                404: { description: 'Project not found' },
                400: { description: 'Bad request' }
              }
            }
          }
        }
      },
      {
        method: 'PUT',
        path: '/api/v1/projects/{id}',
        handler: updateProjectHandler,
        options: {
          tags: ['api', 'project'],
          description: 'Update a project',
          validate: {
            params: idSchema,
            payload: updateProjectSchema
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description: 'Successfully updated project',
                  schema: projectResponseSchema
                },
                404: { description: 'Project not found' },
                400: { description: 'Bad request' }
              }
            }
          }
        }
      },
      {
        method: 'DELETE',
        path: '/api/v1/projects/{id}',
        handler: deleteProjectHandler,
        options: {
          tags: ['api', 'project'],
          description: 'Delete a project',
          validate: {
            params: idSchema
          },
          plugins: {
            'hapi-swagger': {
              responses: {
                204: { description: 'Successfully deleted project' },
                404: { description: 'Project not found' },
                400: { description: 'Bad request' }
              }
            }
          }
        }
      },
      {
        method: 'GET',
        path: '/api/v1/projects',
        handler: getAllProjectsHandler,
        options: {
          tags: ['api', 'project'],
          description: 'Get all projects',
          plugins: {
            'hapi-swagger': {
              responses: {
                200: {
                  description: 'Successfully retrieved projects',
                  schema: Joi.array().items(projectResponseSchema)
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
