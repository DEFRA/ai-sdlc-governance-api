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

    // Find the maximum order value for checklist item templates with the same workflow template ID
    const maxOrderResult = await request.db
      .collection('checklistItemTemplates')
      .find({
        workflowTemplateId: new ObjectId(request.payload.workflowTemplateId)
      })
      .sort({ order: -1 })
      .limit(1)
      .toArray()

    // Calculate the new order value (max + 1 or 0 if no templates exist)
    const maxOrder = maxOrderResult.length > 0 ? maxOrderResult[0].order : -1
    const newOrder = maxOrder + 1

    // Create the template with the calculated order
    const template = createChecklistItemTemplate({
      ...request.payload,
      order: newOrder
    })

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
    const templateId = new ObjectId(request.params.id)

    // Get the current checklist item template to check if order is changing
    const currentTemplate = await request.db
      .collection('checklistItemTemplates')
      .findOne({ _id: templateId })

    if (!currentTemplate) {
      throw Boom.notFound('Checklist item template not found')
    }

    // Convert dependencies_requires to ObjectIds if present and filter out self-dependency
    if (updatePayload.dependencies_requires) {
      updatePayload.dependencies_requires = updatePayload.dependencies_requires
        .map((id) => new ObjectId(id))
        .filter((id) => !id.equals(templateId))
    }

    // Check if order is being updated
    if (
      updatePayload.order !== undefined &&
      updatePayload.order !== currentTemplate.order
    ) {
      const newOrder = updatePayload.order
      const oldOrder = currentTemplate.order

      // Update other checklist item templates' order based on the direction of movement
      if (newOrder > oldOrder) {
        // Moving down in the list (increasing order value)
        // Decrement order for templates with order > oldOrder and <= newOrder
        await request.db.collection('checklistItemTemplates').updateMany(
          {
            workflowTemplateId: currentTemplate.workflowTemplateId,
            order: { $gt: oldOrder, $lte: newOrder }
          },
          { $inc: { order: -1 } }
        )
      } else if (newOrder < oldOrder) {
        // Moving up in the list (decreasing order value)
        // Increment order for templates with order >= newOrder and < oldOrder
        await request.db.collection('checklistItemTemplates').updateMany(
          {
            workflowTemplateId: currentTemplate.workflowTemplateId,
            order: { $gte: newOrder, $lt: oldOrder }
          },
          { $inc: { order: 1 } }
        )
      }
    }

    const result = await request.db
      .collection('checklistItemTemplates')
      .findOneAndUpdate(
        { _id: templateId },
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
    const templateId = new ObjectId(request.params.id)

    // Get the checklist item template to be deleted
    const template = await request.db
      .collection('checklistItemTemplates')
      .findOne({ _id: templateId })

    if (!template) {
      throw Boom.notFound('Checklist item template not found')
    }

    // Store the order and workflowTemplateId for reordering
    const { order, workflowTemplateId } = template

    // Remove this template from dependencies_requires arrays of other templates
    await request.db
      .collection('checklistItemTemplates')
      .updateMany(
        { dependencies_requires: templateId },
        { $pull: { dependencies_requires: templateId } }
      )

    // Delete the template
    const result = await request.db
      .collection('checklistItemTemplates')
      .deleteOne({ _id: templateId })

    if (result.deletedCount === 0) {
      throw Boom.notFound('Checklist item template not found')
    }

    // Reorder remaining checklist item templates
    await request.db.collection('checklistItemTemplates').updateMany(
      {
        workflowTemplateId,
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

export const getAllChecklistItemTemplatesHandler = async (request, h) => {
  try {
    const query = {}

    if (request.query.governanceTemplateId) {
      // First find all workflow templates for this governance template
      const workflowTemplates = await request.db
        .collection('workflowTemplates')
        .find({
          governanceTemplateId: new ObjectId(request.query.governanceTemplateId)
        })
        .toArray()

      // Get all workflow template IDs
      const workflowTemplateIds = workflowTemplates.map((wt) => wt._id)

      // Add workflow template IDs to query
      if (workflowTemplateIds.length > 0) {
        query.workflowTemplateId = { $in: workflowTemplateIds }
      } else {
        // If no workflow templates found, return empty array
        return h.response([]).code(200)
      }
    } else if (request.query.workflowTemplateId) {
      query.workflowTemplateId = new ObjectId(request.query.workflowTemplateId)
    }

    const templates = await request.db
      .collection('checklistItemTemplates')
      .find(query)
      .sort({ order: 1 }) // Sort by order instead of createdAt
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
