import { createWorkflowTemplate } from './model.js'
import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'

export const createWorkflowTemplateHandler = async (request, h) => {
  try {
    // Verify governanceTemplateId exists
    const governanceTemplate = await request.db
      .collection('governanceTemplates')
      .findOne({ _id: new ObjectId(request.payload.governanceTemplateId) })

    if (!governanceTemplate) {
      throw Boom.notFound('Governance template not found')
    }

    const template = createWorkflowTemplate(request.payload)
    const result = await request.db
      .collection('workflowTemplates')
      .insertOne(template)

    return h.response({ ...template, _id: result.insertedId }).code(200)
  } catch (error) {
    if (error.isBoom) throw error
    if (error.code === 11000) {
      throw Boom.conflict('A workflow template with this name already exists')
    }
    throw Boom.badRequest(error.message)
  }
}

export const getWorkflowTemplateHandler = async (request, h) => {
  try {
    const template = await request.db
      .collection('workflowTemplates')
      .findOne({ _id: new ObjectId(request.params.id) })

    if (!template) {
      throw Boom.notFound('Workflow template not found')
    }
    return h.response(template).code(200)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}

export const updateWorkflowTemplateHandler = async (request, h) => {
  try {
    const now = new Date()
    const result = await request.db
      .collection('workflowTemplates')
      .findOneAndUpdate(
        { _id: new ObjectId(request.params.id) },
        { $set: { ...request.payload, updatedAt: now } },
        { returnDocument: 'after' }
      )

    if (!result) {
      throw Boom.notFound('Workflow template not found')
    }
    return h.response(result).code(200)
  } catch (error) {
    if (error.isBoom) throw error
    if (error.code === 11000) {
      throw Boom.conflict('A workflow template with this name already exists')
    }
    throw Boom.badRequest(error.message)
  }
}

export const deleteWorkflowTemplateHandler = async (request, h) => {
  try {
    const workflowId = new ObjectId(request.params.id)

    // Delete all associated checklist items
    await request.db
      .collection('checklistItemTemplates')
      .deleteMany({ workflowTemplateId: workflowId })

    // Delete the workflow template
    const result = await request.db
      .collection('workflowTemplates')
      .deleteOne({ _id: workflowId })

    if (result.deletedCount === 0) {
      throw Boom.notFound('Workflow template not found')
    }

    return h.response().code(204)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}

export const getAllWorkflowTemplatesHandler = async (request, h) => {
  try {
    const query = {}
    if (request.query.governanceTemplateId) {
      query.governanceTemplateId = request.query.governanceTemplateId
    }

    const templates = await request.db
      .collection('workflowTemplates')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray()
    return h.response(templates).code(200)
  } catch (error) {
    throw Boom.badRequest(error.message)
  }
}
