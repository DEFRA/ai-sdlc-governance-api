import Joi from 'joi'

export const createGovernanceTemplateSchema = Joi.object({
  version: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().required()
})

export const updateGovernanceTemplateSchema = Joi.object({
  version: Joi.string(),
  name: Joi.string(),
  description: Joi.string()
}).min(1)
