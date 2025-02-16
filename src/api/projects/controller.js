import { createProject } from './model.js'
import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'

export const createProjectHandler = async (request, h) => {
  try {
    // Verify governanceTemplateId exists
    const governanceTemplate = await request.db
      .collection('governanceTemplates')
      .findOne({ _id: new ObjectId(request.payload.governanceTemplateId) })

    if (!governanceTemplate) {
      throw Boom.notFound('Governance template not found')
    }

    // Verify all workflow template IDs exist and belong to the governance template
    const workflowTemplates = await request.db
      .collection('workflowTemplates')
      .find({
        _id: {
          $in: request.payload.selectedWorkflowTemplateIds.map(
            (id) => new ObjectId(id)
          )
        },
        governanceTemplateId: new ObjectId(request.payload.governanceTemplateId)
      })
      .toArray()

    if (
      workflowTemplates.length !==
      request.payload.selectedWorkflowTemplateIds.length
    ) {
      throw Boom.badRequest(
        'One or more workflow templates are invalid or do not belong to the specified governance template'
      )
    }

    const project = createProject(request.payload)
    const result = await request.db.collection('projects').insertOne(project)

    return h.response({ ...project, _id: result.insertedId }).code(201)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}

export const getProjectHandler = async (request, h) => {
  try {
    const project = await request.db
      .collection('projects')
      .findOne({ _id: new ObjectId(request.params.id) })

    if (!project) {
      throw Boom.notFound('Project not found')
    }

    return h.response(project).code(200)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}

export const updateProjectHandler = async (request, h) => {
  try {
    const result = await request.db
      .collection('projects')
      .findOneAndUpdate(
        { _id: new ObjectId(request.params.id) },
        { $set: { ...request.payload, updatedAt: new Date() } },
        { returnDocument: 'after' }
      )

    if (!result) {
      throw Boom.notFound('Project not found')
    }

    return h.response(result).code(200)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}

export const deleteProjectHandler = async (request, h) => {
  try {
    const result = await request.db
      .collection('projects')
      .deleteOne({ _id: new ObjectId(request.params.id) })

    if (result.deletedCount === 0) {
      throw Boom.notFound('Project not found')
    }

    return h.response().code(204)
  } catch (error) {
    if (error.isBoom) throw error
    throw Boom.badRequest(error.message)
  }
}

export const getAllProjectsHandler = async (request, h) => {
  try {
    const projects = await request.db.collection('projects').find().toArray()
    return h.response(projects).code(200)
  } catch (error) {
    throw Boom.badRequest(error.message)
  }
}
