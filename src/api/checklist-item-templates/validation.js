import Joi from 'joi'
import { ObjectId } from 'mongodb'

// Custom Joi extension for MongoDB ObjectId validation
const objectIdSchema = Joi.string().custom((value, helpers) => {
  if (!ObjectId.isValid(value)) {
    return helpers.error('any.invalid')
  }
  return value
}, 'MongoDB ObjectId validation')

export const createChecklistItemTemplateSchema = Joi.object({
  workflowTemplateId: objectIdSchema.required(),
  name: Joi.string().required(),
  description: Joi.string(),
  type: Joi.string().required().valid('approval', 'document', 'task'),
  dependencies_requires: Joi.array().items(objectIdSchema).default([]),
  metadata: Joi.object().default({})
})

export const updateChecklistItemTemplateSchema = Joi.object({
  name: Joi.string(),
  description: Joi.string(),
  type: Joi.string().valid('approval', 'document', 'task'),
  dependencies_requires: Joi.array().items(objectIdSchema),
  metadata: Joi.object()
}).min(1)

export const idSchema = Joi.object({
  id: objectIdSchema.required().description('MongoDB ObjectId')
})
