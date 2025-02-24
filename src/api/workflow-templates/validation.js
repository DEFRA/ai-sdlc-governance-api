import Joi from 'joi'
import { ObjectId } from 'mongodb'

// Custom Joi extension for MongoDB ObjectId validation
const objectIdSchema = Joi.string().custom((value, helpers) => {
  if (!ObjectId.isValid(value)) {
    return helpers.error('any.invalid')
  }
  return value
}, 'MongoDB ObjectId validation')

export const createWorkflowTemplateSchema = Joi.object({
  governanceTemplateId: objectIdSchema.required(),
  name: Joi.string().required(),
  description: Joi.string().allow(''),
  metadata: Joi.object().default({})
})

export const updateWorkflowTemplateSchema = Joi.object({
  name: Joi.string(),
  description: Joi.string().allow(''),
  metadata: Joi.object()
}).min(1)

export const idSchema = Joi.object({
  id: objectIdSchema.required().description('MongoDB ObjectId')
})
