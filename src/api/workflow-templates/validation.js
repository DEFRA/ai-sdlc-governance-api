import Joi from 'joi'

export const createWorkflowTemplateSchema = Joi.object({
  governanceTemplateId: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().required(),
  metadata: Joi.object().default({})
})

export const updateWorkflowTemplateSchema = Joi.object({
  name: Joi.string(),
  description: Joi.string(),
  metadata: Joi.object()
}).min(1)
