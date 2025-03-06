import { test, expect } from '@playwright/test'

const getUniqueId = () =>
  `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

const createWorkflowTemplate = (uniqueId) => ({
  name: `Test Workflow Template ${uniqueId}`,
  description: 'Test workflow template for E2E testing',
  metadata: {
    category: 'test',
    priority: 'high'
  }
})

test.describe('Workflow Template API', () => {
  let governanceTemplateId
  let workflowTemplateId
  const uniqueId = getUniqueId()
  const workflowTemplate = createWorkflowTemplate(uniqueId)

  test.beforeAll(async ({ request }) => {
    // Create a governance template for testing
    const response = await request.post('/api/v1/governance-templates', {
      data: {
        name: `Test Governance Template ${uniqueId}`,
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

  test('should reorder workflow templates after deletion', async ({
    request
  }) => {
    // Create three more workflow templates with sequential order
    const workflowData1 = {
      name: `Test Workflow Template 1 ${uniqueId}`,
      description: 'Test workflow template 1',
      governanceTemplateId
    }
    const workflowData2 = {
      name: `Test Workflow Template 2 ${uniqueId}`,
      description: 'Test workflow template 2',
      governanceTemplateId
    }
    const workflowData3 = {
      name: `Test Workflow Template 3 ${uniqueId}`,
      description: 'Test workflow template 3',
      governanceTemplateId
    }

    // Create the workflow templates
    const response1 = await request.post('/api/v1/workflow-templates', {
      data: workflowData1
    })
    const data1 = await response1.json()
    const workflowId1 = data1._id
    const order1 = data1.order

    const response2 = await request.post('/api/v1/workflow-templates', {
      data: workflowData2
    })
    const data2 = await response2.json()
    const workflowId2 = data2._id
    const order2 = data2.order

    const response3 = await request.post('/api/v1/workflow-templates', {
      data: workflowData3
    })
    const data3 = await response3.json()
    const workflowId3 = data3._id
    const order3 = data3.order

    // Verify the initial orders are sequential
    expect(order2).toBe(order1 + 1)
    expect(order3).toBe(order2 + 1)

    // Delete the middle workflow template
    const deleteResponse = await request.delete(
      `/api/v1/workflow-templates/${workflowId2}`
    )
    expect(deleteResponse.ok()).toBeTruthy()

    // Verify the first workflow template's order remains unchanged
    const getResponse1 = await request.get(
      `/api/v1/workflow-templates/${workflowId1}`
    )
    const updatedData1 = await getResponse1.json()
    expect(updatedData1.order).toBe(order1)

    // Verify the third workflow template's order has been decremented
    const getResponse3 = await request.get(
      `/api/v1/workflow-templates/${workflowId3}`
    )
    const updatedData3 = await getResponse3.json()
    expect(updatedData3.order).toBe(order2) // Should now have the order of the deleted template

    // Clean up the remaining test workflow templates
    await request.delete(`/api/v1/workflow-templates/${workflowId1}`)
    await request.delete(`/api/v1/workflow-templates/${workflowId3}`)
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

  test('should reorder workflow templates when updating order', async ({
    request
  }) => {
    // Create three workflow templates with sequential order
    const workflowData1 = {
      name: `Test Workflow Template 1 ${uniqueId}`,
      description: 'Test workflow template 1',
      governanceTemplateId
    }
    const workflowData2 = {
      name: `Test Workflow Template 2 ${uniqueId}`,
      description: 'Test workflow template 2',
      governanceTemplateId
    }
    const workflowData3 = {
      name: `Test Workflow Template 3 ${uniqueId}`,
      description: 'Test workflow template 3',
      governanceTemplateId
    }

    // Create the workflow templates
    const response1 = await request.post('/api/v1/workflow-templates', {
      data: workflowData1
    })
    const data1 = await response1.json()
    const workflowId1 = data1._id
    const order1 = data1.order

    const response2 = await request.post('/api/v1/workflow-templates', {
      data: workflowData2
    })
    const data2 = await response2.json()
    const workflowId2 = data2._id
    const order2 = data2.order

    const response3 = await request.post('/api/v1/workflow-templates', {
      data: workflowData3
    })
    const data3 = await response3.json()
    const workflowId3 = data3._id
    const order3 = data3.order

    // Verify the initial orders are sequential
    expect(order2).toBe(order1 + 1)
    expect(order3).toBe(order2 + 1)

    // Move the first workflow template to the end (order 2)
    const updateResponse = await request.put(
      `/api/v1/workflow-templates/${workflowId1}`,
      {
        data: { order: order3 }
      }
    )
    expect(updateResponse.ok()).toBeTruthy()

    // Verify the updated order of the first workflow template
    const getResponse1 = await request.get(
      `/api/v1/workflow-templates/${workflowId1}`
    )
    const updatedData1 = await getResponse1.json()
    expect(updatedData1.order).toBe(order3)

    // Verify the second workflow template's order has been decremented
    const getResponse2 = await request.get(
      `/api/v1/workflow-templates/${workflowId2}`
    )
    const updatedData2 = await getResponse2.json()
    expect(updatedData2.order).toBe(order1)

    // Verify the third workflow template's order has been decremented
    const getResponse3 = await request.get(
      `/api/v1/workflow-templates/${workflowId3}`
    )
    const updatedData3 = await getResponse3.json()
    expect(updatedData3.order).toBe(order2)

    // Now move the third workflow template to the beginning (order 0)
    const updateResponse2 = await request.put(
      `/api/v1/workflow-templates/${workflowId3}`,
      {
        data: { order: order1 }
      }
    )
    expect(updateResponse2.ok()).toBeTruthy()

    // Verify the updated order of the third workflow template
    const getResponse3b = await request.get(
      `/api/v1/workflow-templates/${workflowId3}`
    )
    const updatedData3b = await getResponse3b.json()
    expect(updatedData3b.order).toBe(order1)

    // Verify the first workflow template's order has been incremented
    const getResponse1b = await request.get(
      `/api/v1/workflow-templates/${workflowId1}`
    )
    const updatedData1b = await getResponse1b.json()
    expect(updatedData1b.order).toBe(order3)

    // Verify the second workflow template's order has been incremented
    const getResponse2b = await request.get(
      `/api/v1/workflow-templates/${workflowId2}`
    )
    const updatedData2b = await getResponse2b.json()
    expect(updatedData2b.order).toBe(order1 + 1)

    // Clean up the test workflow templates
    await request.delete(`/api/v1/workflow-templates/${workflowId1}`)
    await request.delete(`/api/v1/workflow-templates/${workflowId2}`)
    await request.delete(`/api/v1/workflow-templates/${workflowId3}`)
  })

  test('should cascade delete checklist items when deleting workflow template', async ({
    request
  }) => {
    const cascadeUniqueId = getUniqueId()
    // Create a new workflow template specifically for testing deletion
    const workflowResponse = await request.post('/api/v1/workflow-templates', {
      data: {
        name: `Cascade Delete Test Workflow ${cascadeUniqueId}`,
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
          name: `First Checklist Template ${cascadeUniqueId}`,
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
            name: `Dependent Checklist Template ${cascadeUniqueId}-${i}`,
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

  test('should filter workflow templates by governanceTemplateId', async ({
    request
  }) => {
    // Create another governance template for testing filtering
    const anotherGovResponse = await request.post(
      '/api/v1/governance-templates',
      {
        data: {
          name: `Another Gov Template ${uniqueId}`,
          version: '1.0.0',
          description: 'Another governance template for filter tests'
        }
      }
    )
    expect(anotherGovResponse.ok()).toBeTruthy()
    const anotherGovId = (await anotherGovResponse.json())._id

    // Create another workflow template with the new governance template
    const anotherWorkflowResponse = await request.post(
      '/api/v1/workflow-templates',
      {
        data: {
          name: `Another Workflow Template ${uniqueId}`,
          description: 'Another workflow template for filter tests',
          governanceTemplateId: anotherGovId,
          metadata: { test: true }
        }
      }
    )
    expect(anotherWorkflowResponse.ok()).toBeTruthy()
    const anotherWorkflowId = (await anotherWorkflowResponse.json())._id

    // Test filtering by original governanceTemplateId
    const filterResponse = await request.get(
      `/api/v1/workflow-templates?governanceTemplateId=${governanceTemplateId}`
    )
    expect(filterResponse.ok()).toBeTruthy()
    const filteredData = await filterResponse.json()

    // Verify filtered results
    expect(Array.isArray(filteredData)).toBeTruthy()
    expect(filteredData.length).toBeGreaterThan(0)
    expect(
      filteredData.every(
        (template) => template.governanceTemplateId === governanceTemplateId
      )
    ).toBeTruthy()
    expect(
      filteredData.some(
        (template) => template.governanceTemplateId === anotherGovId
      )
    ).toBeFalsy()

    // Clean up
    await request.delete(`/api/v1/workflow-templates/${anotherWorkflowId}`)
    await request.delete(`/api/v1/governance-templates/${anotherGovId}`)
  })
})
