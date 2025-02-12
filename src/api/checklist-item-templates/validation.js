import Joi from 'joi'

export const createChecklistItemTemplateSchema = Joi.object({
  workflowTemplateId: Joi.string().required(),
  itemKey: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().required(),
  type: Joi.string().required().valid('approval', 'document', 'task'),
  dependencies: Joi.object({
    requires: Joi.array().items(Joi.string()).default([]),
    requiredBy: Joi.array().items(Joi.string()).default([])
  }).default({}),
  metadata: Joi.object().default({})
})

export const updateChecklistItemTemplateSchema = Joi.object({
  name: Joi.string(),
  description: Joi.string(),
  type: Joi.string().valid('approval', 'document', 'task'),
  dependencies: Joi.object({
    requires: Joi.array().items(Joi.string()),
    requiredBy: Joi.array().items(Joi.string())
  }),
  metadata: Joi.object()
}).min(1)
