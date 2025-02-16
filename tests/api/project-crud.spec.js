/* eslint-disable */
import { test, expect } from '@playwright/test'

const getUniqueId = () =>
  `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

const createProject = (uniqueId) => ({
  name: `Test Project ${uniqueId}`,
  description: 'Test project for E2E testing'
})

// E2E tests for Project CRUD operations
// Base URL is set to /api/v1 via request fixture configuration
// Test setup: create a GovernanceTemplate and two WorkflowTemplates

test.describe('Project API', () => {
  let governanceTemplateId
  let workflowTemplateIdA
  let workflowTemplateIdB
  let projectId
  const uniqueId = getUniqueId()
  const project = createProject(uniqueId)

  test.beforeAll(async ({ request }) => {
    // Create test dependencies
    const gtResponse = await request.post('/api/v1/governance-templates', {
      data: {
        name: `Test Governance Template ${uniqueId}`,
        version: '1.0',
        description: 'Test governance template description.'
      }
    })

    if (!gtResponse.ok()) {
      test.info().annotations.push({
        type: 'error',
        description: `Failed to create governance template: ${await gtResponse.text()}`
      })
    }
    expect(gtResponse.ok()).toBeTruthy()
    governanceTemplateId = (await gtResponse.json())._id

    // Create test workflow templates
    const wtResponseA = await request.post('/api/v1/workflow-templates', {
      data: {
        governanceTemplateId,
        name: `Test Workflow Template A ${uniqueId}`,
        description: 'Workflow Template A description',
        metadata: {}
      }
    })

    if (!wtResponseA.ok()) {
      test.info().annotations.push({
        type: 'error',
        description: `Failed to create workflow template A: ${await wtResponseA.text()}`
      })
    }
    expect(wtResponseA.ok()).toBeTruthy()
    workflowTemplateIdA = (await wtResponseA.json())._id

    const wtResponseB = await request.post('/api/v1/workflow-templates', {
      data: {
        governanceTemplateId,
        name: `Test Workflow Template B ${uniqueId}`,
        description: 'Workflow Template B description',
        metadata: {}
      }
    })

    if (!wtResponseB.ok()) {
      test.info().annotations.push({
        type: 'error',
        description: `Failed to create workflow template B: ${await wtResponseB.text()}`
      })
    }
    expect(wtResponseB.ok()).toBeTruthy()
    workflowTemplateIdB = (await wtResponseB.json())._id
  })

  test('should create a new project', async ({ request }) => {
    const projectData = {
      ...project,
      governanceTemplateId,
      selectedWorkflowTemplateIds: [workflowTemplateIdA, workflowTemplateIdB]
    }

    const response = await request.post('/api/v1/projects', {
      data: projectData
    })

    if (!response.ok()) {
      test.info().annotations.push({
        type: 'error',
        description: `Failed to create project: ${await response.text()}`
      })
    }
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    projectId = data._id

    expect(data.name).toBe(projectData.name)
    expect(data.governanceTemplateId).toBe(governanceTemplateId)
    expect(data.selectedWorkflowTemplateIds).toContain(workflowTemplateIdA)
    expect(data.selectedWorkflowTemplateIds).toContain(workflowTemplateIdB)
  })

  test('should get a project by id', async ({ request }) => {
    const response = await request.get(`/api/v1/projects/${projectId}`)

    if (!response.ok()) {
      test.info().annotations.push({
        type: 'error',
        description: `Failed to get project: ${await response.text()}`
      })
    }
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data._id).toBe(projectId)
    expect(data.name).toBe(project.name)
  })

  test('should update a project', async ({ request }) => {
    const updatedProject = {
      name: `Updated ${project.name}`,
      description: 'Updated Description',
      metadata: { status: 'in-progress' }
    }

    const response = await request.put(`/api/v1/projects/${projectId}`, {
      data: updatedProject
    })

    if (!response.ok()) {
      test.info().annotations.push({
        type: 'error',
        description: `Failed to update project: ${await response.text()}`
      })
    }
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data.name).toBe(updatedProject.name)
    expect(data.description).toBe(updatedProject.description)
    expect(data.metadata).toEqual(updatedProject.metadata)
  })

  test('should delete a project', async ({ request }) => {
    const response = await request.delete(`/api/v1/projects/${projectId}`)

    if (!response.ok()) {
      test.info().annotations.push({
        type: 'error',
        description: `Failed to delete project: ${await response.text()}`
      })
    }
    expect(response.ok()).toBeTruthy()

    // Verify deletion
    const getResponse = await request.get(`/api/v1/projects/${projectId}`)
    expect(getResponse.status()).toBe(404)
  })

  test.afterAll(async ({ request }) => {
    // Cleanup test dependencies in reverse order of creation
    if (projectId) {
      await request.delete(`/api/v1/projects/${projectId}`)
    }

    const templatesForDeletion = [
      workflowTemplateIdA,
      workflowTemplateIdB
    ].filter(Boolean)

    for (const id of templatesForDeletion) {
      await request.delete(`/api/v1/workflow-templates/${id}`)
    }

    if (governanceTemplateId) {
      await request.delete(
        `/api/v1/governance-templates/${governanceTemplateId}`
      )
    }
  })
})
