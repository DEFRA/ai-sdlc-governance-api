import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { logger } from '~/src/api/common/helpers/logging/logger.js'

// Custom Joi extension for MongoDB ObjectId validation
const objectIdSchema = Joi.string().custom((value, helpers) => {
  if (!ObjectId.isValid(value)) {
    logger.error({ value }, 'Invalid ObjectId')
    return helpers.error('any.invalid')
  }
  return value
}, 'MongoDB ObjectId validation')

export const createProjectSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().empty('').default(''),
  governanceTemplateId: objectIdSchema.required(),
  selectedWorkflowTemplateIds: Joi.array().items(objectIdSchema).required(),
  metadata: Joi.object().default({})
}).error((errors) => {
  logger.error({ errors }, 'Project validation errors')
  return errors
})

export const updateProjectSchema = Joi.object({
  name: Joi.string(),
  description: Joi.string().allow(''),
  metadata: Joi.object()
}).min(1)

export const idSchema = Joi.object({
  id: objectIdSchema.required().description('MongoDB ObjectId')
})
