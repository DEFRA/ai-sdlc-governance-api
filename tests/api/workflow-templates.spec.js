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
})
