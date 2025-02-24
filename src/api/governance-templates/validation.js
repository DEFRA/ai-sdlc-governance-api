import Joi from 'joi'
import { ObjectId } from 'mongodb'

// Custom Joi extension for MongoDB ObjectId validation
const objectIdSchema = Joi.string().custom((value, helpers) => {
  if (!ObjectId.isValid(value)) {
    return helpers.error('any.invalid')
  }
  return value
}, 'MongoDB ObjectId validation')

export const createGovernanceTemplateSchema = Joi.object({
  version: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().allow('')
})

export const updateGovernanceTemplateSchema = Joi.object({
  version: Joi.string(),
  name: Joi.string(),
  description: Joi.string().allow('')
})

export const idSchema = Joi.object({
  id: objectIdSchema.required().description('MongoDB ObjectId')
})
