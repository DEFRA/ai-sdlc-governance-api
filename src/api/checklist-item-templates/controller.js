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

    // If there are dependencies, populate them
    if (
      template.dependencies_requires &&
      template.dependencies_requires.length > 0
    ) {
      const dependencies = await request.db
        .collection('checklistItemTemplates')
        .find({ _id: { $in: template.dependencies_requires } })
        .toArray()

      template.dependencies_requires = dependencies
    }

    // Find all templates that require this template
    const requiredBy = await request.db
      .collection('checklistItemTemplates')
      .find({ dependencies_requires: template._id })
      .toArray()

    template.dependencies_requiredBy = requiredBy

    return h.response(template).code(200)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}

export const updateChecklistItemTemplateHandler = async (request, h) => {
  try {
    const now = new Date()
    const updatePayload = { ...request.payload }

    // Convert dependencies_requires to ObjectIds if present
    if (updatePayload.dependencies_requires) {
      updatePayload.dependencies_requires =
        updatePayload.dependencies_requires.map((id) => new ObjectId(id))
    }

    const result = await request.db
      .collection('checklistItemTemplates')
      .findOneAndUpdate(
        { _id: new ObjectId(request.params.id) },
        { $set: { ...updatePayload, updatedAt: now } },
        { returnDocument: 'after' }
      )

    if (!result) {
      throw Boom.notFound('Checklist item template not found')
    }

    // If there are dependencies, populate them
    if (
      result.dependencies_requires &&
      result.dependencies_requires.length > 0
    ) {
      const dependencies = await request.db
        .collection('checklistItemTemplates')
        .find({ _id: { $in: result.dependencies_requires } })
        .toArray()

      result.dependencies_requires = dependencies
    }

    // Find all templates that require this template
    const requiredBy = await request.db
      .collection('checklistItemTemplates')
      .find({ dependencies_requires: result._id })
      .toArray()

    result.dependencies_requiredBy = requiredBy

    return h.response(result).code(200)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}

export const deleteChecklistItemTemplateHandler = async (request, h) => {
  try {
    const result = await request.db
      .collection('checklistItemTemplates')
      .deleteOne({ _id: new ObjectId(request.params.id) })

    if (result.deletedCount === 0) {
      throw Boom.notFound('Checklist item template not found')
    }

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
      query.workflowTemplateId = new ObjectId(request.query.workflowTemplateId)
    }

    const templates = await request.db
      .collection('checklistItemTemplates')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray()

    // If there are templates with dependencies, populate them
    for (const template of templates) {
      if (
        template.dependencies_requires &&
        template.dependencies_requires.length > 0
      ) {
        const dependencies = await request.db
          .collection('checklistItemTemplates')
          .find({ _id: { $in: template.dependencies_requires } })
          .toArray()

        template.dependencies_requires = dependencies
      }

      // Find all templates that require this template
      const requiredBy = await request.db
        .collection('checklistItemTemplates')
        .find({ dependencies_requires: template._id })
        .toArray()

      template.dependencies_requiredBy = requiredBy
    }

    return h.response(templates).code(200)
  } catch (error) {
    throw Boom.badRequest(error.message)
  }
}
