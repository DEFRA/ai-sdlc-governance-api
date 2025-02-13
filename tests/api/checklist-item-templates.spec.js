/* eslint-disable */
import { test, expect } from '@playwright/test'

const checklistItemTemplate = {
  name: 'Test Checklist Item Template',
  description: 'Test checklist item template for E2E testing',
  type: 'approval',
  metadata: {
    approver: 'manager',
    requiredEvidence: true
  }
}

test.describe('Checklist Item Template API', () => {
  let governanceTemplateId
  let workflowTemplateId
  let checklistItemTemplateId
  let dependentTemplateId
  let dependencyTemplateId

  test.beforeAll(async ({ request }) => {
    // Create a governance template for testing
    const govResponse = await request.post('/api/v1/governance-templates', {
      data: {
        name: 'Test Governance Template',
        version: '1.0.0',
        description: 'Test governance template for checklist tests'
      }
    })

    if (!govResponse.ok()) {
      test.info().annotations.push({
        type: 'error',
        description: `Failed to create governance template: ${await govResponse.text()}`
      })
    }
    expect(govResponse.ok()).toBeTruthy()

    const govData = await govResponse.json()
    governanceTemplateId = govData._id

    // Create a workflow template for testing
    const workflowResponse = await request.post('/api/v1/workflow-templates', {
      data: {
        name: 'Test Workflow Template',
        description: 'Test workflow template for checklist tests',
        governanceTemplateId,
        metadata: {
          category: 'test',
          priority: 'high'
        }
      }
    })

    if (!workflowResponse.ok()) {
      test.info().annotations.push({
        type: 'error',
        description: `Failed to create workflow template: ${await workflowResponse.text()}`
      })
    }
    expect(workflowResponse.ok()).toBeTruthy()

    const workflowData = await workflowResponse.json()
    workflowTemplateId = workflowData._id
  })

  test.afterAll(async ({ request }) => {
    // Clean up all created templates
    const templatesForDeletion = [
      dependentTemplateId,
      dependencyTemplateId,
      checklistItemTemplateId
    ].filter(Boolean)

    for (const id of templatesForDeletion) {
      await request.delete(`/api/v1/checklist-item-templates/${id}`)
    }

    if (workflowTemplateId) {
      await request.delete(`/api/v1/workflow-templates/${workflowTemplateId}`)
    }
    if (governanceTemplateId) {
      await request.delete(
        `/api/v1/governance-templates/${governanceTemplateId}`
      )
    }
  })

  test('should create a new checklist item template', async ({ request }) => {
    const checklistData = {
      ...checklistItemTemplate,
      workflowTemplateId,
      dependencies_requires: []
    }

    const response = await request.post('/api/v1/checklist-item-templates', {
      data: checklistData
    })

    if (!response.ok()) {
      test.info().annotations.push({
        type: 'error',
        description: `Failed to create checklist item template: ${await response.text()}`
      })
    }
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toHaveProperty('_id')
    expect(data.name).toBe(checklistItemTemplate.name)
    expect(data.workflowTemplateId).toBe(workflowTemplateId)

    checklistItemTemplateId = data._id
  })

  test('should create a dependency template and update main template to depend on it', async ({
    request
  }) => {
    // First create a template that will be a dependency
    const dependencyData = {
      name: 'Dependency Template',
      description: 'This template will be a dependency',
      type: 'approval',
      workflowTemplateId,
      dependencies_requires: []
    }

    const dependencyResponse = await request.post(
      '/api/v1/checklist-item-templates',
      {
        data: dependencyData
      }
    )

    expect(dependencyResponse.ok()).toBeTruthy()
    const dependency = await dependencyResponse.json()
    dependencyTemplateId = dependency._id

    // Update the main template to depend on the new template
    const updateResponse = await request.put(
      `/api/v1/checklist-item-templates/${checklistItemTemplateId}`,
      {
        data: {
          dependencies_requires: [dependencyTemplateId]
        }
      }
    )

    expect(updateResponse.ok()).toBeTruthy()
    const updatedTemplate = await updateResponse.json()

    // Verify dependencies_requires is populated with full template data
    expect(updatedTemplate.dependencies_requires).toHaveLength(1)
    expect(updatedTemplate.dependencies_requires[0]).toMatchObject({
      _id: dependencyTemplateId,
      name: 'Dependency Template'
    })
  })

  test('should create a dependent template that requires the main template', async ({
    request
  }) => {
    const dependentData = {
      name: 'Dependent Template',
      description: 'This template depends on the main template',
      type: 'approval',
      workflowTemplateId,
      dependencies_requires: [checklistItemTemplateId]
    }

    const dependentResponse = await request.post(
      '/api/v1/checklist-item-templates',
      {
        data: dependentData
      }
    )

    expect(dependentResponse.ok()).toBeTruthy()
    const dependent = await dependentResponse.json()
    dependentTemplateId = dependent._id

    // Verify the dependency relationship by getting the main template
    const mainTemplateResponse = await request.get(
      `/api/v1/checklist-item-templates/${checklistItemTemplateId}`
    )

    expect(mainTemplateResponse.ok()).toBeTruthy()
    const mainTemplate = await mainTemplateResponse.json()

    // Check that the dependent template appears in dependencies_requiredBy
    expect(mainTemplate.dependencies_requiredBy).toContainEqual(
      expect.objectContaining({
        _id: dependentTemplateId,
        name: 'Dependent Template'
      })
    )
  })

  test('should get a template with full dependency information', async ({
    request
  }) => {
    const response = await request.get(
      `/api/v1/checklist-item-templates/${checklistItemTemplateId}`
    )

    expect(response.ok()).toBeTruthy()
    const template = await response.json()

    // Verify dependencies_requires is populated
    expect(template.dependencies_requires).toHaveLength(1)
    expect(template.dependencies_requires[0]).toMatchObject({
      _id: dependencyTemplateId,
      name: 'Dependency Template'
    })

    // Verify dependencies_requiredBy is populated
    expect(template.dependencies_requiredBy).toHaveLength(1)
    expect(template.dependencies_requiredBy[0]).toMatchObject({
      _id: dependentTemplateId,
      name: 'Dependent Template'
    })
  })

  test('should update dependencies and verify relationships', async ({
    request
  }) => {
    // Remove all dependencies
    const updateResponse = await request.put(
      `/api/v1/checklist-item-templates/${checklistItemTemplateId}`,
      {
        data: {
          dependencies_requires: []
        }
      }
    )

    expect(updateResponse.ok()).toBeTruthy()
    const updatedTemplate = await updateResponse.json()

    // Verify dependencies_requires is empty
    expect(updatedTemplate.dependencies_requires).toHaveLength(0)

    // But dependencies_requiredBy should still show templates that depend on this one
    expect(updatedTemplate.dependencies_requiredBy).toHaveLength(1)
    expect(updatedTemplate.dependencies_requiredBy[0]).toMatchObject({
      _id: dependentTemplateId,
      name: 'Dependent Template'
    })
  })
})
