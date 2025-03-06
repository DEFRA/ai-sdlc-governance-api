import { createGovernanceTemplate } from './model.js'
import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'

export const createGovernanceTemplateHandler = async (request, h) => {
  try {
    const template = createGovernanceTemplate(request.payload)
    const result = await request.db
      .collection('governanceTemplates')
      .insertOne(template)
    return h.response({ ...template, _id: result.insertedId }).code(200)
  } catch (error) {
    if (error.code === 11000) {
      throw Boom.conflict(
        'A template with this name and version already exists'
      )
    }
    throw Boom.badRequest(error.message)
  }
}

export const getGovernanceTemplateHandler = async (request, h) => {
  try {
    const template = await request.db
      .collection('governanceTemplates')
      .findOne({ _id: new ObjectId(request.params.id) })

    if (!template) {
      throw Boom.notFound('Governance template not found')
    }
    return h.response(template).code(200)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}

export const updateGovernanceTemplateHandler = async (request, h) => {
  try {
    const now = new Date()
    const result = await request.db
      .collection('governanceTemplates')
      .findOneAndUpdate(
        { _id: new ObjectId(request.params.id) },
        { $set: { ...request.payload, updatedAt: now } },
        { returnDocument: 'after' }
      )

    if (!result) {
      throw Boom.notFound('Governance template not found')
    }
    return h.response(result).code(200)
  } catch (error) {
    if (error.isBoom) throw error
    if (error.code === 11000) {
      throw Boom.conflict(
        'A template with this name and version already exists'
      )
    }
    throw Boom.badRequest(error.message)
  }
}

export const deleteGovernanceTemplateHandler = async (request, h) => {
  try {
    const governanceId = new ObjectId(request.params.id)

    // Find all workflow templates for this governance template
    const workflowTemplates = await request.db
      .collection('workflowTemplates')
      .find({ governanceTemplateId: governanceId })
      .toArray()

    // Delete all associated checklist items for each workflow template
    for (const workflow of workflowTemplates) {
      await request.db
        .collection('checklistItemTemplates')
        .deleteMany({ workflowTemplateId: workflow._id })
    }

    // Delete all workflow templates
    await request.db
      .collection('workflowTemplates')
      .deleteMany({ governanceTemplateId: governanceId })

    // Delete the governance template
    const result = await request.db
      .collection('governanceTemplates')
      .deleteOne({ _id: governanceId })

    if (result.deletedCount === 0) {
      throw Boom.notFound('Governance template not found')
    }

    return h.response().code(204)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}

export const getAllGovernanceTemplatesHandler = async (request, h) => {
  try {
    const templates = await request.db
      .collection('governanceTemplates')
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    // For each governance template, fetch and include its workflow templates
    for (const template of templates) {
      const workflowTemplates = await request.db
        .collection('workflowTemplates')
        .find({ governanceTemplateId: template._id })
        .sort({ order: 1 }) // Sort by order field (ascending)
        .toArray()

      // Add the sorted workflow templates to the governance template
      template.workflowTemplates = workflowTemplates
    }

    return h.response(templates).code(200)
  } catch (error) {
    throw Boom.badRequest(error.message)
  }
}
