import Joi from 'joi'
import { ObjectId } from 'mongodb'

// Custom Joi extension for MongoDB ObjectId validation
const objectIdSchema = Joi.string().custom((value, helpers) => {
  if (!ObjectId.isValid(value)) {
    return helpers.error('any.invalid')
  }
  return value
}, 'MongoDB ObjectId validation')

export const createChecklistItemInstanceSchema = Joi.object({
  workflowInstanceId: objectIdSchema.required(),
  checklistItemTemplateId: objectIdSchema.required(),
  name: Joi.string().required(),
  description: Joi.string().allow(''),
  type: Joi.string().required().valid('approval', 'document', 'task'),
  status: Joi.string()
    .required()
    .valid('incomplete', 'complete', 'not_required')
    .default('incomplete'),
  dependencies_requires: Joi.array().items(objectIdSchema).default([]),
  metadata: Joi.object().default({})
})

export const updateChecklistItemInstanceSchema = Joi.object({
  name: Joi.string(),
  description: Joi.string().allow(''),
  type: Joi.string().valid('approval', 'document', 'task'),
  status: Joi.string().valid('incomplete', 'complete', 'not_required'),
  metadata: Joi.object(),
  dependencies_requires: Joi.array().items(objectIdSchema),
  order: Joi.number().integer().min(0)
}).min(1)

export const idSchema = Joi.object({
  id: objectIdSchema.required().description('MongoDB ObjectId')
})
