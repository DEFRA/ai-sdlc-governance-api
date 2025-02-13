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
    if (checklistItemTemplateId) {
      await request.delete(
        `/api/v1/checklist-item-templates/${checklistItemTemplateId}`
      )
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

  test('should get a checklist item template by id with dependencies', async ({
    request
  }) => {
    const response = await request.get(
      `/api/v1/checklist-item-templates/${checklistItemTemplateId}`
    )

    if (!response.ok()) {
      test.info().annotations.push({
        type: 'error',
        description: `Failed to get checklist item template: ${await response.text()}`
      })
    }
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data._id).toBe(checklistItemTemplateId)
    expect(data.name).toBe(checklistItemTemplate.name)
    expect(data).toHaveProperty('dependencies_requires')
    expect(data).toHaveProperty('dependencies_requiredBy')
  })

  test('should update a checklist item template', async ({ request }) => {
    const updatedTemplate = {
      ...checklistItemTemplate,
      description: 'Updated checklist item description',
      dependencies_requires: []
    }

    const response = await request.put(
      `/api/v1/checklist-item-templates/${checklistItemTemplateId}`,
      {
        data: updatedTemplate
      }
    )

    if (!response.ok()) {
      test.info().annotations.push({
        type: 'error',
        description: `Failed to update checklist item template: ${await response.text()}`
      })
    }
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data.description).toBe(updatedTemplate.description)
  })

  test('should handle dependencies correctly', async ({ request }) => {
    // Create a second checklist item that depends on the first one
    const dependentItem = {
      name: 'Dependent Checklist Item',
      description: 'This item depends on the first checklist item',
      type: 'approval',
      workflowTemplateId,
      dependencies_requires: [checklistItemTemplateId]
    }

    const createResponse = await request.post(
      '/api/v1/checklist-item-templates',
      {
        data: dependentItem
      }
    )

    if (!createResponse.ok()) {
      test.info().annotations.push({
        type: 'error',
        description: `Failed to create dependent checklist item: ${await createResponse.text()}`
      })
    }
    expect(createResponse.ok()).toBeTruthy()

    const newItemId = (await createResponse.json())._id

    // Verify that the original item shows up in dependencies_requiredBy
    const getResponse = await request.get(
      `/api/v1/checklist-item-templates/${checklistItemTemplateId}`
    )

    if (!getResponse.ok()) {
      test.info().annotations.push({
        type: 'error',
        description: `Failed to get checklist item with dependencies: ${await getResponse.text()}`
      })
    }
    expect(getResponse.ok()).toBeTruthy()

    const data = await getResponse.json()
    expect(data.dependencies_requiredBy).toContainEqual(
      expect.objectContaining({
        _id: newItemId,
        name: dependentItem.name
      })
    )

    // Clean up the dependent item
    await request.delete(`/api/v1/checklist-item-templates/${newItemId}`)
  })
})
