import { createProject } from './model.js'
import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'

/**
 * Creates checklist item instances for all workflow instances
 * @param {import('mongodb').Db} db - MongoDB database instance
 * @param {import('mongodb').ObjectId[]} workflowInstanceIds - Array of workflow instance IDs
 * @param {Map<string, import('mongodb').ObjectId>} workflowTemplateToInstanceMap - Map of workflow template IDs to instance IDs
 * @param {Set<string>} selectedWorkflowIds - Set of selected workflow template IDs
 * @returns {Promise<Map<string, import('mongodb').ObjectId>>} Map of template IDs to instance IDs
 */
async function createAllChecklistItemInstances(
  db,
  workflowInstanceIds,
  workflowTemplateToInstanceMap,
  selectedWorkflowIds
) {
  // Create a map to store template ID to instance ID mappings
  const templateToInstanceMap = new Map()

  // Get all templates for all selected workflows
  const templates = await db
    .collection('checklistItemTemplates')
    .find({
      workflowTemplateId: {
        $in: Array.from(selectedWorkflowIds).map((id) => new ObjectId(id))
      }
    })
    .toArray()

  // Create instances for each template
  for (const template of templates) {
    const workflowInstanceId = workflowTemplateToInstanceMap.get(
      template.workflowTemplateId.toString()
    )
    const instance = {
      workflowInstanceId,
      checklistItemTemplateId: template._id,
      name: template.name,
      description: template.description || '',
      type: template.type,
      status: 'incomplete',
      dependencies_requires: [], // Will be populated in second phase
      metadata: template.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db
      .collection('checklistItemInstances')
      .insertOne(instance)
    templateToInstanceMap.set(template._id.toString(), result.insertedId)
  }

  return templateToInstanceMap
}

/**
 * Updates dependencies for all checklist item instances
 * @param {import('mongodb').Db} db - MongoDB database instance
 * @param {Map<string, import('mongodb').ObjectId>} templateToInstanceMap - Map of template IDs to instance IDs
 * @param {Set<string>} selectedWorkflowIds - Set of selected workflow template IDs
 * @returns {Promise<void>}
 */
async function updateAllInstanceDependencies(
  db,
  templateToInstanceMap,
  selectedWorkflowIds
) {
  // Get all templates with their dependencies
  const templates = await db
    .collection('checklistItemTemplates')
    .find({
      workflowTemplateId: {
        $in: Array.from(selectedWorkflowIds).map((id) => new ObjectId(id))
      }
    })
    .toArray()

  // Update dependencies for each template's instance
  for (const template of templates) {
    if (
      template.dependencies_requires &&
      template.dependencies_requires.length > 0
    ) {
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
    const workflowTemplateToInstanceMap = new Map()

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

        workflowTemplateToInstanceMap.set(
          template._id.toString(),
          workflowResult.insertedId
        )
      }

      // Phase 1: Create all checklist item instances
      const templateToInstanceMap = await createAllChecklistItemInstances(
        request.db,
        workflowInstances.map((wi) => wi._id),
        workflowTemplateToInstanceMap,
        selectedWorkflowIds
      )

      // Phase 2: Update all dependencies
      await updateAllInstanceDependencies(
        request.db,
        templateToInstanceMap,
        selectedWorkflowIds
      )

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
