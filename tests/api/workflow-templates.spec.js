import { test, expect } from '@playwright/test'

const workflowTemplate = {
  name: 'Test Workflow Template',
  description: 'Test workflow template for E2E testing',
  metadata: {
    category: 'test',
    priority: 'high'
  }
}

test.describe('Workflow Template API', () => {
  let governanceTemplateId
  let workflowTemplateId

  test.beforeAll(async ({ request }) => {
    // Create a governance template for testing
    const response = await request.post('/api/v1/governance-templates', {
      data: {
        name: 'Test Governance Template',
        version: '1.0.0',
        description: 'Test governance template for workflow tests'
      }
    })
    const data = await response.json()
    governanceTemplateId = data._id
  })

  test.afterAll(async ({ request }) => {
    if (workflowTemplateId) {
      await request.delete(`/api/v1/workflow-templates/${workflowTemplateId}`)
    }
    if (governanceTemplateId) {
      await request.delete(
        `/api/v1/governance-templates/${governanceTemplateId}`
      )
    }
  })

  test('should create a new workflow template', async ({ request }) => {
    const workflowData = {
      ...workflowTemplate,
      governanceTemplateId
    }

    const response = await request.post('/api/v1/workflow-templates', {
      data: workflowData
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data).toHaveProperty('_id')
    expect(data.name).toBe(workflowTemplate.name)
    expect(data.governanceTemplateId).toBe(governanceTemplateId)

    workflowTemplateId = data._id
  })

  test('should get a workflow template by id', async ({ request }) => {
    const response = await request.get(
      `/api/v1/workflow-templates/${workflowTemplateId}`
    )

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data._id).toBe(workflowTemplateId)
    expect(data.name).toBe(workflowTemplate.name)
  })

  test('should update a workflow template', async ({ request }) => {
    const updatedTemplate = {
      ...workflowTemplate,
      description: 'Updated workflow description'
    }

    const response = await request.put(
      `/api/v1/workflow-templates/${workflowTemplateId}`,
      {
        data: updatedTemplate
      }
    )

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.description).toBe(updatedTemplate.description)
  })

  test('should cascade delete checklist items when deleting workflow template', async ({
    request
  }) => {
    // Create a new workflow template specifically for testing deletion
    const workflowResponse = await request.post('/api/v1/workflow-templates', {
      data: {
        name: 'Cascade Delete Test Workflow',
        description: 'Testing cascade deletion',
        governanceTemplateId,
        metadata: { test: true }
      }
    })
    expect(workflowResponse.ok()).toBeTruthy()
    const cascadeWorkflowId = (await workflowResponse.json())._id

    // Create multiple checklist items with dependencies between them
    const checklistIds = []

    // Create first checklist item
    const firstChecklistResponse = await request.post(
      '/api/v1/checklist-item-templates',
      {
        data: {
          name: 'First Checklist Template',
          description: 'Testing cascade deletion',
          type: 'approval',
          workflowTemplateId: cascadeWorkflowId,
          dependencies_requires: []
        }
      }
    )
    expect(firstChecklistResponse.ok()).toBeTruthy()
    const firstChecklistId = (await firstChecklistResponse.json())._id
    checklistIds.push(firstChecklistId)

    // Create dependent checklist items
    for (let i = 0; i < 2; i++) {
      const checklistResponse = await request.post(
        '/api/v1/checklist-item-templates',
        {
          data: {
            name: `Dependent Checklist Template ${i}`,
            description: 'Testing cascade deletion',
            type: 'approval',
            workflowTemplateId: cascadeWorkflowId,
            dependencies_requires: [firstChecklistId] // These depend on the first checklist item
          }
        }
      )
      expect(checklistResponse.ok()).toBeTruthy()
      checklistIds.push((await checklistResponse.json())._id)
    }

    // Delete the workflow template
    const deleteResponse = await request.delete(
      `/api/v1/workflow-templates/${cascadeWorkflowId}`
    )
    expect(deleteResponse.ok()).toBeTruthy()

    // Verify that all checklist items have been deleted
    for (const checklistId of checklistIds) {
      const checklistResponse = await request.get(
        `/api/v1/checklist-item-templates/${checklistId}`
      )
      expect(checklistResponse.ok()).toBeFalsy()
      expect(checklistResponse.status()).toBe(404)
    }
  })
})
