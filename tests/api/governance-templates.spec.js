import { test, expect } from '@playwright/test'

const getUniqueId = () =>
  `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

const createGovernanceTemplate = (uniqueId) => ({
  name: `Test Governance Template ${uniqueId}`,
  version: '1.0.0',
  description: 'Test governance template for E2E testing'
})

test.describe('Governance Template API', () => {
  let governanceTemplateId
  const uniqueId = getUniqueId()
  const governanceTemplate = createGovernanceTemplate(uniqueId)

  test.afterAll(async ({ request }) => {
    if (governanceTemplateId) {
      await request.delete(
        `/api/v1/governance-templates/${governanceTemplateId}`
      )
    }
  })

  test('should create a new governance template', async ({ request }) => {
    const response = await request.post('/api/v1/governance-templates', {
      data: governanceTemplate
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data).toHaveProperty('_id')
    expect(data.name).toBe(governanceTemplate.name)
    expect(data.version).toBe(governanceTemplate.version)
    expect(data.description).toBe(governanceTemplate.description)

    governanceTemplateId = data._id
  })

  test('should get a governance template by id', async ({ request }) => {
    const response = await request.get(
      `/api/v1/governance-templates/${governanceTemplateId}`
    )

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data._id).toBe(governanceTemplateId)
    expect(data.name).toBe(governanceTemplate.name)
  })

  test('should update a governance template', async ({ request }) => {
    const updatedTemplate = {
      ...governanceTemplate,
      description: 'Updated description'
    }

    const response = await request.put(
      `/api/v1/governance-templates/${governanceTemplateId}`,
      {
        data: updatedTemplate
      }
    )

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.description).toBe(updatedTemplate.description)
  })

  test('should cascade delete workflow templates and checklist items when deleting governance template', async ({
    request
  }) => {
    const cascadeUniqueId = getUniqueId()
    // Create a new governance template specifically for testing deletion
    const govResponse = await request.post('/api/v1/governance-templates', {
      data: {
        name: `Cascade Delete Test Template ${cascadeUniqueId}`,
        version: '2.0.0',
        description: 'Testing cascade deletion'
      }
    })
    expect(govResponse.ok()).toBeTruthy()
    const cascadeGovId = (await govResponse.json())._id

    // Create multiple workflow templates
    const workflowIds = []
    const checklistIds = []

    for (let i = 0; i < 2; i++) {
      const workflowResponse = await request.post(
        '/api/v1/workflow-templates',
        {
          data: {
            name: `Workflow Template ${cascadeUniqueId}-${i}`,
            description: 'Testing cascade deletion',
            governanceTemplateId: cascadeGovId,
            metadata: { test: true }
          }
        }
      )
      expect(workflowResponse.ok()).toBeTruthy()
      const workflowId = (await workflowResponse.json())._id
      workflowIds.push(workflowId)

      // Create checklist items for each workflow
      for (let j = 0; j < 2; j++) {
        const checklistResponse = await request.post(
          '/api/v1/checklist-item-templates',
          {
            data: {
              name: `Checklist Template ${cascadeUniqueId}-${i}-${j}`,
              description: 'Testing cascade deletion',
              type: 'approval',
              workflowTemplateId: workflowId,
              dependencies_requires: []
            }
          }
        )
        expect(checklistResponse.ok()).toBeTruthy()
        checklistIds.push((await checklistResponse.json())._id)
      }
    }

    // Delete the governance template
    const deleteResponse = await request.delete(
      `/api/v1/governance-templates/${cascadeGovId}`
    )
    expect(deleteResponse.ok()).toBeTruthy()

    // Verify that all workflow templates have been deleted
    for (const workflowId of workflowIds) {
      const workflowResponse = await request.get(
        `/api/v1/workflow-templates/${workflowId}`
      )
      expect(workflowResponse.ok()).toBeFalsy()
      expect(workflowResponse.status()).toBe(404)
    }

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
