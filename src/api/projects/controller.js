import { createProject } from './model.js'
import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'

/**
 * Creates checklist item instances for a workflow instance
 * @param {import('mongodb').Db} db - MongoDB database instance
 * @param {import('mongodb').ObjectId} workflowInstanceId - ID of the workflow instance
 * @param {import('mongodb').ObjectId} workflowTemplateId - ID of the workflow template
 * @param {Set<string>} selectedWorkflowIds - Set of selected workflow template IDs
 * @returns {Promise<void>}
 */
async function createChecklistItemInstances(
  db,
  workflowInstanceId,
  workflowTemplateId,
  selectedWorkflowIds
) {
  // Get all checklist item templates for this workflow
  const templates = await db
    .collection('checklistItemTemplates')
    .find({ workflowTemplateId })
    .toArray()

  // Create a map of template ID to instance ID for dependency mapping
  const templateToInstanceMap = new Map()

  // Create instances for each template
  for (const template of templates) {
    const instance = {
      workflowInstanceId,
      checklistItemTemplateId: template._id,
      name: template.name,
      description: template.description || '',
      type: template.type,
      status: 'incomplete',
      dependencies_requires: [], // Will be populated after all instances are created
      metadata: template.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db
      .collection('checklistItemInstances')
      .insertOne(instance)
    templateToInstanceMap.set(template._id.toString(), result.insertedId)
  }

  // Update dependencies for each instance
  for (const template of templates) {
    if (
      template.dependencies_requires &&
      template.dependencies_requires.length > 0
    ) {
      // Filter dependencies to only include those from selected workflows
      const validDependencies = []

      for (const depId of template.dependencies_requires) {
        // Find the template this dependency refers to
        const depTemplate = await db
          .collection('checklistItemTemplates')
          .findOne({ _id: depId })

        // Only include if its workflow was selected
        if (
          depTemplate &&
          selectedWorkflowIds.has(depTemplate.workflowTemplateId.toString())
        ) {
          const instanceId = templateToInstanceMap.get(depId.toString())
          if (instanceId) {
            validDependencies.push(instanceId)
          }
        }
      }

      // Update the instance with valid dependencies
      const instanceId = templateToInstanceMap.get(template._id.toString())
      if (instanceId) {
        await db.collection('checklistItemInstances').updateOne(
          { _id: instanceId },
          {
            $set: {
              dependencies_requires: validDependencies,
              updatedAt: new Date()
            }
          }
        )
      }
    }
  }
}

export const createProjectHandler = async (request, h) => {
  try {
    // Debug logging for incoming request
    request.log(['debug', 'projects'], {
      msg: 'Creating project with payload',
      payload: request.payload
    })

    // Verify governanceTemplateId exists
    const governanceTemplate = await request.db
      .collection('governanceTemplates')
      .findOne({ _id: new ObjectId(request.payload.governanceTemplateId) })

    if (!governanceTemplate) {
      request.log(['error', 'projects'], {
        msg: 'Governance template not found',
        governanceTemplateId: request.payload.governanceTemplateId
      })
      throw Boom.badRequest('Governance template not found')
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
      request.log(['error', 'projects'], {
        msg: 'Invalid workflow templates',
        selectedWorkflowTemplateIds:
          request.payload.selectedWorkflowTemplateIds,
        foundWorkflowTemplates: workflowTemplates.map((wt) => wt._id)
      })
      throw Boom.badRequest(
        'One or more workflow templates are invalid or do not belong to the specified governance template'
      )
    }

    // Create the project
    const project = createProject(request.payload)

    // Insert the project
    let projectId
    try {
      const result = await request.db.collection('projects').insertOne(project)
      projectId = result.insertedId
    } catch (error) {
      request.log(['error', 'projects'], {
        msg: 'Failed to insert project',
        error: error.message,
        code: error.code,
        codeName: error.codeName,
        errInfo: error.errInfo
      })
      throw Boom.badRequest('Failed to create project')
    }

    // Create workflow instances
    const workflowInstances = []
    const selectedWorkflowIds = new Set(
      request.payload.selectedWorkflowTemplateIds.map((id) => id.toString())
    )

    try {
      for (const template of workflowTemplates) {
        const workflowInstance = {
          projectId,
          workflowTemplateId: template._id,
          name: template.name,
          description: template.description || '',
          metadata: template.metadata || {},
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const workflowResult = await request.db
          .collection('workflowInstances')
          .insertOne(workflowInstance)

        workflowInstances.push({
          ...workflowInstance,
          _id: workflowResult.insertedId
        })

        // Create checklist item instances for this workflow
        try {
          await createChecklistItemInstances(
            request.db,
            workflowResult.insertedId,
            template._id,
            selectedWorkflowIds
          )
        } catch (error) {
          request.log(['error', 'projects', 'checklist-items'], {
            msg: 'Failed to create checklist items for workflow',
            workflowTemplateId: template._id,
            error: error.message,
            code: error.code,
            codeName: error.codeName,
            errInfo: error.errInfo
          })
          throw Boom.badRequest('Failed to create checklist items for workflow')
        }
      }

      return h
        .response({ ...project, _id: projectId, workflowInstances })
        .code(201)
    } catch (error) {
      request.log(['error', 'projects', 'workflows'], {
        msg: 'Failed to create workflow instances',
        error: error.message,
        code: error.code,
        codeName: error.codeName,
        errInfo: error.errInfo
      })
      throw error
    }
  } catch (error) {
    request.log(['error', 'projects'], {
      msg: 'Failed to create project',
      error: error.message,
      stack: error.stack,
      payload: request.payload
    })
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
