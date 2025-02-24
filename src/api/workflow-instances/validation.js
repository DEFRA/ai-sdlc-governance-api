import Joi from 'joi'
import { ObjectId } from 'mongodb'

// Custom Joi extension for MongoDB ObjectId validation
const objectIdSchema = Joi.string().custom((value, helpers) => {
  if (!ObjectId.isValid(value)) {
    return helpers.error('any.invalid')
  }
  return value
}, 'MongoDB ObjectId validation')

export const createWorkflowInstanceSchema = Joi.object({
  projectId: objectIdSchema.required(),
  workflowTemplateId: objectIdSchema.required(),
  name: Joi.string().required(),
  description: Joi.string().allow(''),
  metadata: Joi.object().default({}),
  status: Joi.string().valid('active', 'completed').default('active')
})

export const updateWorkflowInstanceSchema = Joi.object({
  name: Joi.string(),
  description: Joi.string().allow(''),
  metadata: Joi.object(),
  status: Joi.string().valid('active', 'completed')
}).min(1)

export const idSchema = Joi.object({
  id: objectIdSchema.required().description('MongoDB ObjectId')
})
