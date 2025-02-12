import { createChecklistItemTemplate } from './model.js'
import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'

export const createChecklistItemTemplateHandler = async (request, h) => {
  try {
    // Verify workflowTemplateId exists
    const workflowTemplate = await request.db
      .collection('workflowTemplates')
      .findOne({ _id: new ObjectId(request.payload.workflowTemplateId) })

    if (!workflowTemplate) {
      throw Boom.notFound('Workflow template not found')
    }

    // Create the template
    const template = createChecklistItemTemplate(request.payload)
    const result = await request.db
      .collection('checklistItemTemplates')
      .insertOne(template)

    return h.response({ ...template, _id: result.insertedId }).code(201)
  } catch (error) {
    if (error.isBoom) throw error
    if (error.code === 11000) {
      throw Boom.conflict(
        'A checklist item with this key already exists in this workflow'
      )
    }
    throw Boom.badRequest(error.message)
  }
}

export const getChecklistItemTemplateHandler = async (request, h) => {
  try {
    const template = await request.db
      .collection('checklistItemTemplates')
      .findOne({ _id: new ObjectId(request.params.id) })

    if (!template) {
      throw Boom.notFound('Checklist item template not found')
    }
    return h.response(template).code(200)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}

export const updateChecklistItemTemplateHandler = async (request, h) => {
  try {
    const now = new Date()
    const result = await request.db
      .collection('checklistItemTemplates')
      .findOneAndUpdate(
        { _id: new ObjectId(request.params.id) },
        { $set: { ...request.payload, updatedAt: now } },
        { returnDocument: 'after' }
      )

    if (!result) {
      throw Boom.notFound('Checklist item template not found')
    }
    return h.response(result).code(200)
  } catch (error) {
    if (error.isBoom) throw error
    if (error.code === 11000) {
      throw Boom.conflict(
        'A checklist item with this key already exists in this workflow'
      )
    }
    throw Boom.badRequest(error.message)
  }
}

export const deleteChecklistItemTemplateHandler = async (request, h) => {
  try {
    await request.db
      .collection('checklistItemTemplates')
      .deleteOne({ _id: new ObjectId(request.params.id) })

    return h.response().code(204)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}

export const getAllChecklistItemTemplatesHandler = async (request, h) => {
  try {
    const query = {}
    if (request.query.workflowTemplateId) {
      query.workflowTemplateId = request.query.workflowTemplateId
    }

    const templates = await request.db
      .collection('checklistItemTemplates')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray()
    return h.response(templates).code(200)
  } catch (error) {
    throw Boom.badRequest(error.message)
  }
}
