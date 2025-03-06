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

    // Find the maximum order value for workflow templates with the same governance template ID
    const maxOrderResult = await request.db
      .collection('workflowTemplates')
      .find({
        governanceTemplateId: new ObjectId(request.payload.governanceTemplateId)
      })
      .sort({ order: -1 })
      .limit(1)
      .toArray()

    // Calculate the new order value (max + 1 or 0 if no templates exist)
    const maxOrder = maxOrderResult.length > 0 ? maxOrderResult[0].order : -1
    const newOrder = maxOrder + 1

    // Create the template with the calculated order
    const template = createWorkflowTemplate({
      ...request.payload,
      order: newOrder
    })

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

    // Get the current workflow template to check if order is changing
    const currentTemplate = await request.db
      .collection('workflowTemplates')
      .findOne({ _id: new ObjectId(request.params.id) })

    if (!currentTemplate) {
      throw Boom.notFound('Workflow template not found')
    }

    // Check if order is being updated
    if (
      request.payload.order !== undefined &&
      request.payload.order !== currentTemplate.order
    ) {
      const newOrder = request.payload.order
      const oldOrder = currentTemplate.order

      // Update other workflow templates' order based on the direction of movement
      if (newOrder > oldOrder) {
        // Moving down in the list (increasing order value)
        // Decrement order for templates with order > oldOrder and <= newOrder
        await request.db.collection('workflowTemplates').updateMany(
          {
            governanceTemplateId: currentTemplate.governanceTemplateId,
            order: { $gt: oldOrder, $lte: newOrder }
          },
          { $inc: { order: -1 } }
        )
      } else if (newOrder < oldOrder) {
        // Moving up in the list (decreasing order value)
        // Increment order for templates with order >= newOrder and < oldOrder
        await request.db.collection('workflowTemplates').updateMany(
          {
            governanceTemplateId: currentTemplate.governanceTemplateId,
            order: { $gte: newOrder, $lt: oldOrder }
          },
          { $inc: { order: 1 } }
        )
      }
    }

    // Update the workflow template
    const result = await request.db
      .collection('workflowTemplates')
      .findOneAndUpdate(
        { _id: new ObjectId(request.params.id) },
        { $set: { ...request.payload, updatedAt: now } },
        { returnDocument: 'after' }
      )

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

    // Get the workflow template to be deleted
    const workflowTemplate = await request.db
      .collection('workflowTemplates')
      .findOne({ _id: workflowId })

    if (!workflowTemplate) {
      throw Boom.notFound('Workflow template not found')
    }

    // Store the order and governanceTemplateId for reordering
    const { order, governanceTemplateId } = workflowTemplate

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

    // Reorder remaining workflow templates
    await request.db.collection('workflowTemplates').updateMany(
      {
        governanceTemplateId,
        order: { $gt: order }
      },
      { $inc: { order: -1 } }
    )

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
      query.governanceTemplateId = new ObjectId(
        request.query.governanceTemplateId
      )
    }

    const templates = await request.db
      .collection('workflowTemplates')
      .find(query)
      .sort(
        request.query.governanceTemplateId ? { order: 1 } : { createdAt: -1 }
      )
      .toArray()
    return h.response(templates).code(200)
  } catch (error) {
    throw Boom.badRequest(error.message)
  }
}
