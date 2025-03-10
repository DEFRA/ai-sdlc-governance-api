/* eslint-disable */
import { test, expect } from '@playwright/test'

const getUniqueId = () =>
  `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

const createChecklistItemTemplate = (uniqueId) => ({
  name: `Test Checklist Item Template ${uniqueId}`,
  description: 'Test checklist item template for E2E testing',
  type: 'approval',
  metadata: {
    approver: 'manager',
    requiredEvidence: true
  }
})

test.describe('Checklist Item Template API', () => {
  let governanceTemplateId
  let workflowTemplateId
  let checklistItemTemplateId
  let dependentTemplateId
  let dependencyTemplateId
  const uniqueId = getUniqueId()
  const checklistItemTemplate = createChecklistItemTemplate(uniqueId)

  test.beforeAll(async ({ request }) => {
    // Create a governance template for testing
    const govResponse = await request.post('/api/v1/governance-templates', {
      data: {
        name: `Test Governance Template ${uniqueId}`,
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
        name: `Test Workflow Template ${uniqueId}`,
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
      name: `Dependency Template ${uniqueId}`,
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
      name: `Dependency Template ${uniqueId}`
    })
  })

  test('should create a dependent template that requires the main template', async ({
    request
  }) => {
    const dependentData = {
      name: `Dependent Template ${uniqueId}`,
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
        name: `Dependent Template ${uniqueId}`
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
      name: `Dependency Template ${uniqueId}`
    })

    // Verify dependencies_requiredBy is populated
    expect(template.dependencies_requiredBy).toHaveLength(1)
    expect(template.dependencies_requiredBy[0]).toMatchObject({
      _id: dependentTemplateId,
      name: `Dependent Template ${uniqueId}`
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
      name: `Dependent Template ${uniqueId}`
    })
  })

  test('should remove deleted template from dependencies_requires of other templates', async ({
    request
  }) => {
    // Create template A that will be a dependency
    const templateAResponse = await request.post(
      '/api/v1/checklist-item-templates',
      {
        data: {
          name: `Template A ${uniqueId}`,
          description: 'This template will be deleted',
          type: 'approval',
          workflowTemplateId,
          dependencies_requires: []
        }
      }
    )
    expect(templateAResponse.ok()).toBeTruthy()
    const templateA = await templateAResponse.json()

    // Create template B that depends on template A
    const templateBResponse = await request.post(
      '/api/v1/checklist-item-templates',
      {
        data: {
          name: `Template B ${uniqueId}`,
          description: 'This template depends on Template A',
          type: 'approval',
          workflowTemplateId,
          dependencies_requires: [templateA._id]
        }
      }
    )
    expect(templateBResponse.ok()).toBeTruthy()
    const templateB = await templateBResponse.json()

    // Create template C that also depends on template A
    const templateCResponse = await request.post(
      '/api/v1/checklist-item-templates',
      {
        data: {
          name: `Template C ${uniqueId}`,
          description: 'This template also depends on Template A',
          type: 'approval',
          workflowTemplateId,
          dependencies_requires: [templateA._id]
        }
      }
    )
    expect(templateCResponse.ok()).toBeTruthy()
    const templateC = await templateCResponse.json()

    // Delete template A
    const deleteResponse = await request.delete(
      `/api/v1/checklist-item-templates/${templateA._id}`
    )
    expect(deleteResponse.ok()).toBeTruthy()

    // Verify template B no longer has template A in its dependencies
    const templateBAfterResponse = await request.get(
      `/api/v1/checklist-item-templates/${templateB._id}`
    )
    expect(templateBAfterResponse.ok()).toBeTruthy()
    const templateBAfter = await templateBAfterResponse.json()
    expect(templateBAfter.dependencies_requires).toHaveLength(0)

    // Verify template C no longer has template A in its dependencies
    const templateCAfterResponse = await request.get(
      `/api/v1/checklist-item-templates/${templateC._id}`
    )
    expect(templateCAfterResponse.ok()).toBeTruthy()
    const templateCAfter = await templateCAfterResponse.json()
    expect(templateCAfter.dependencies_requires).toHaveLength(0)

    // Clean up
    await request.delete(`/api/v1/checklist-item-templates/${templateB._id}`)
    await request.delete(`/api/v1/checklist-item-templates/${templateC._id}`)
  })

  test('should filter checklist item templates by workflowTemplateId', async ({
    request
  }) => {
    // Create another workflow template for testing filtering
    const anotherWorkflowResponse = await request.post(
      '/api/v1/workflow-templates',
      {
        data: {
          name: `Another Workflow Template ${uniqueId}`,
          description: 'Another workflow template for filter tests',
          governanceTemplateId,
          metadata: { test: true }
        }
      }
    )
    expect(anotherWorkflowResponse.ok()).toBeTruthy()
    const anotherWorkflowId = (await anotherWorkflowResponse.json())._id

    // Create a checklist item for the new workflow
    const anotherChecklistResponse = await request.post(
      '/api/v1/checklist-item-templates',
      {
        data: {
          name: `Another Checklist Template ${uniqueId}`,
          description: 'Another checklist template for filter tests',
          type: 'approval',
          workflowTemplateId: anotherWorkflowId,
          dependencies_requires: []
        }
      }
    )
    expect(anotherChecklistResponse.ok()).toBeTruthy()
    const anotherChecklistId = (await anotherChecklistResponse.json())._id

    // Test filtering by original workflowTemplateId
    const filterResponse = await request.get(
      `/api/v1/checklist-item-templates?workflowTemplateId=${workflowTemplateId}`
    )
    expect(filterResponse.ok()).toBeTruthy()
    const filteredData = await filterResponse.json()

    // Verify filtered results
    expect(Array.isArray(filteredData)).toBeTruthy()
    expect(filteredData.length).toBeGreaterThan(0)
    expect(
      filteredData.every(
        (template) => template.workflowTemplateId === workflowTemplateId
      )
    ).toBeTruthy()
    expect(
      filteredData.some(
        (template) => template.workflowTemplateId === anotherWorkflowId
      )
    ).toBeFalsy()

    // Clean up
    await request.delete(
      `/api/v1/checklist-item-templates/${anotherChecklistId}`
    )
    await request.delete(`/api/v1/workflow-templates/${anotherWorkflowId}`)
  })

  test('should filter checklist item templates by governanceTemplateId', async ({
    request
  }) => {
    // Create another workflow template under the same governance template
    const anotherWorkflowResponse = await request.post(
      '/api/v1/workflow-templates',
      {
        data: {
          name: `Another Workflow Template ${uniqueId}`,
          description: 'Another workflow template for filter tests',
          governanceTemplateId,
          metadata: { test: true }
        }
      }
    )
    expect(anotherWorkflowResponse.ok()).toBeTruthy()
    const anotherWorkflowId = (await anotherWorkflowResponse.json())._id

    // Create a checklist item for the new workflow
    const anotherChecklistResponse = await request.post(
      '/api/v1/checklist-item-templates',
      {
        data: {
          name: `Another Checklist Template ${uniqueId}`,
          description: 'Another checklist template for filter tests',
          type: 'approval',
          workflowTemplateId: anotherWorkflowId,
          dependencies_requires: []
        }
      }
    )
    expect(anotherChecklistResponse.ok()).toBeTruthy()
    const anotherChecklistId = (await anotherChecklistResponse.json())._id

    // Create a different governance template and associated workflow/checklist
    const differentGovResponse = await request.post(
      '/api/v1/governance-templates',
      {
        data: {
          name: `Different Governance Template ${uniqueId}`,
          version: '1.0.0',
          description: 'Different governance template for filter tests'
        }
      }
    )
    expect(differentGovResponse.ok()).toBeTruthy()
    const differentGovId = (await differentGovResponse.json())._id

    const differentWorkflowResponse = await request.post(
      '/api/v1/workflow-templates',
      {
        data: {
          name: `Different Workflow Template ${uniqueId}`,
          description: 'Different workflow template for filter tests',
          governanceTemplateId: differentGovId,
          metadata: { test: true }
        }
      }
    )
    expect(differentWorkflowResponse.ok()).toBeTruthy()
    const differentWorkflowId = (await differentWorkflowResponse.json())._id

    const differentChecklistResponse = await request.post(
      '/api/v1/checklist-item-templates',
      {
        data: {
          name: `Different Checklist Template ${uniqueId}`,
          description: 'Different checklist template for filter tests',
          type: 'approval',
          workflowTemplateId: differentWorkflowId,
          dependencies_requires: []
        }
      }
    )
    expect(differentChecklistResponse.ok()).toBeTruthy()
    const differentChecklistId = (await differentChecklistResponse.json())._id

    // Test filtering by original governanceTemplateId
    const filterResponse = await request.get(
      `/api/v1/checklist-item-templates?governanceTemplateId=${governanceTemplateId}`
    )
    expect(filterResponse.ok()).toBeTruthy()
    const filteredData = await filterResponse.json()

    // Verify filtered results
    expect(Array.isArray(filteredData)).toBeTruthy()
    expect(filteredData.length).toBeGreaterThanOrEqual(2) // Should have at least 2 items (one from each workflow)

    // All items should be from workflows in the original governance template
    const workflowIds = [workflowTemplateId, anotherWorkflowId]
    expect(
      filteredData.every((template) =>
        workflowIds.includes(template.workflowTemplateId)
      )
    ).toBeTruthy()

    // Should not include items from the different governance template
    expect(
      filteredData.some(
        (template) => template.workflowTemplateId === differentWorkflowId
      )
    ).toBeFalsy()

    // Clean up
    await request.delete(
      `/api/v1/checklist-item-templates/${anotherChecklistId}`
    )
    await request.delete(
      `/api/v1/checklist-item-templates/${differentChecklistId}`
    )
    await request.delete(`/api/v1/workflow-templates/${anotherWorkflowId}`)
    await request.delete(`/api/v1/workflow-templates/${differentWorkflowId}`)
    await request.delete(`/api/v1/governance-templates/${differentGovId}`)
  })

  test('should filter out self-dependency when updating dependencies_requires', async ({
    request
  }) => {
    // Create a template that will try to depend on itself
    const templateResponse = await request.post(
      '/api/v1/checklist-item-templates',
      {
        data: {
          name: `Self Dependency Test Template ${uniqueId}`,
          description: 'Template that will try to depend on itself',
          type: 'approval',
          workflowTemplateId,
          dependencies_requires: []
        }
      }
    )
    expect(templateResponse.ok()).toBeTruthy()
    const template = await templateResponse.json()

    // Try to update the template to depend on itself
    const updateResponse = await request.put(
      `/api/v1/checklist-item-templates/${template._id}`,
      {
        data: {
          dependencies_requires: [template._id]
        }
      }
    )
    expect(updateResponse.ok()).toBeTruthy()
    const updatedTemplate = await updateResponse.json()

    // Verify dependencies_requires is empty since self-dependency was filtered out
    expect(updatedTemplate.dependencies_requires).toHaveLength(0)

    // Clean up
    await request.delete(`/api/v1/checklist-item-templates/${template._id}`)
  })

  test('should reorder checklist item templates after deletion', async ({
    request
  }) => {
    // Create three more checklist item templates with sequential order
    const checklistData1 = {
      name: `Test Checklist Item Template 1 ${uniqueId}`,
      description: 'Test checklist item template 1',
      type: 'approval',
      workflowTemplateId
    }
    const checklistData2 = {
      name: `Test Checklist Item Template 2 ${uniqueId}`,
      description: 'Test checklist item template 2',
      type: 'approval',
      workflowTemplateId
    }
    const checklistData3 = {
      name: `Test Checklist Item Template 3 ${uniqueId}`,
      description: 'Test checklist item template 3',
      type: 'approval',
      workflowTemplateId
    }

    // Create the checklist item templates
    const response1 = await request.post('/api/v1/checklist-item-templates', {
      data: checklistData1
    })
    const data1 = await response1.json()
    const checklistId1 = data1._id
    const order1 = data1.order

    const response2 = await request.post('/api/v1/checklist-item-templates', {
      data: checklistData2
    })
    const data2 = await response2.json()
    const checklistId2 = data2._id
    const order2 = data2.order

    const response3 = await request.post('/api/v1/checklist-item-templates', {
      data: checklistData3
    })
    const data3 = await response3.json()
    const checklistId3 = data3._id
    const order3 = data3.order

    // Verify the initial orders are sequential
    expect(order2).toBe(order1 + 1)
    expect(order3).toBe(order2 + 1)

    // Delete the middle checklist item template
    const deleteResponse = await request.delete(
      `/api/v1/checklist-item-templates/${checklistId2}`
    )
    expect(deleteResponse.ok()).toBeTruthy()

    // Verify the first checklist item template's order remains unchanged
    const getResponse1 = await request.get(
      `/api/v1/checklist-item-templates/${checklistId1}`
    )
    const updatedData1 = await getResponse1.json()
    expect(updatedData1.order).toBe(order1)

    // Verify the third checklist item template's order has been decremented
    const getResponse3 = await request.get(
      `/api/v1/checklist-item-templates/${checklistId3}`
    )
    const updatedData3 = await getResponse3.json()
    expect(updatedData3.order).toBe(order3 - 1)

    // Clean up
    await request.delete(`/api/v1/checklist-item-templates/${checklistId1}`)
    await request.delete(`/api/v1/checklist-item-templates/${checklistId3}`)
  })

  test('should reorder checklist item templates when updating order', async ({
    request
  }) => {
    // Create three checklist item templates with sequential order
    const checklistData1 = {
      name: `Test Checklist Item Template 1 ${uniqueId}`,
      description: 'Test checklist item template 1',
      type: 'approval',
      workflowTemplateId
    }
    const checklistData2 = {
      name: `Test Checklist Item Template 2 ${uniqueId}`,
      description: 'Test checklist item template 2',
      type: 'approval',
      workflowTemplateId
    }
    const checklistData3 = {
      name: `Test Checklist Item Template 3 ${uniqueId}`,
      description: 'Test checklist item template 3',
      type: 'approval',
      workflowTemplateId
    }

    // Create the checklist item templates
    const response1 = await request.post('/api/v1/checklist-item-templates', {
      data: checklistData1
    })
    const data1 = await response1.json()
    const checklistId1 = data1._id
    const order1 = data1.order

    const response2 = await request.post('/api/v1/checklist-item-templates', {
      data: checklistData2
    })
    const data2 = await response2.json()
    const checklistId2 = data2._id
    const order2 = data2.order

    const response3 = await request.post('/api/v1/checklist-item-templates', {
      data: checklistData3
    })
    const data3 = await response3.json()
    const checklistId3 = data3._id
    const order3 = data3.order

    // Verify the initial orders are sequential
    expect(order2).toBe(order1 + 1)
    expect(order3).toBe(order2 + 1)

    // Move the first checklist item template to the end (order 2)
    const updateResponse = await request.put(
      `/api/v1/checklist-item-templates/${checklistId1}`,
      {
        data: { order: order3 }
      }
    )
    expect(updateResponse.ok()).toBeTruthy()

    // Verify the updated order of the first checklist item template
    const getResponse1 = await request.get(
      `/api/v1/checklist-item-templates/${checklistId1}`
    )
    const updatedData1 = await getResponse1.json()
    expect(updatedData1.order).toBe(order3)

    // Verify the second checklist item template's order has been decremented
    const getResponse2 = await request.get(
      `/api/v1/checklist-item-templates/${checklistId2}`
    )
    const updatedData2 = await getResponse2.json()
    expect(updatedData2.order).toBe(order2 - 1)

    // Verify the third checklist item template's order has been decremented
    const getResponse3 = await request.get(
      `/api/v1/checklist-item-templates/${checklistId3}`
    )
    const updatedData3 = await getResponse3.json()
    expect(updatedData3.order).toBe(order3 - 1)

    // Clean up
    await request.delete(`/api/v1/checklist-item-templates/${checklistId1}`)
    await request.delete(`/api/v1/checklist-item-templates/${checklistId2}`)
    await request.delete(`/api/v1/checklist-item-templates/${checklistId3}`)
  })

  test('should return checklist item templates in order when filtering by workflowTemplateId', async ({
    request
  }) => {
    // Create three checklist item templates with different orders
    const orderTestUniqueId = getUniqueId()

    // Create checklist item templates with specific orders
    const checklistData1 = {
      name: `Order Test Checklist 1 ${orderTestUniqueId}`,
      description: 'First checklist for order test',
      type: 'approval',
      workflowTemplateId
    }
    const checklistData2 = {
      name: `Order Test Checklist 2 ${orderTestUniqueId}`,
      description: 'Second checklist for order test',
      type: 'approval',
      workflowTemplateId
    }
    const checklistData3 = {
      name: `Order Test Checklist 3 ${orderTestUniqueId}`,
      description: 'Third checklist for order test',
      type: 'approval',
      workflowTemplateId
    }

    // Create the checklist item templates
    const response1 = await request.post('/api/v1/checklist-item-templates', {
      data: checklistData1
    })
    const data1 = await response1.json()
    const checklistId1 = data1._id
    const order1 = data1.order

    const response2 = await request.post('/api/v1/checklist-item-templates', {
      data: checklistData2
    })
    const data2 = await response2.json()
    const checklistId2 = data2._id
    const order2 = data2.order

    const response3 = await request.post('/api/v1/checklist-item-templates', {
      data: checklistData3
    })
    const data3 = await response3.json()
    const checklistId3 = data3._id
    const order3 = data3.order

    // Verify the initial orders are sequential
    expect(order2).toBe(order1 + 1)
    expect(order3).toBe(order2 + 1)

    // Reorder the templates: move the third template to the beginning
    await request.put(`/api/v1/checklist-item-templates/${checklistId3}`, {
      data: { order: 0 }
    })

    // Get all checklist item templates filtered by workflowTemplateId
    const filterResponse = await request.get(
      `/api/v1/checklist-item-templates?workflowTemplateId=${workflowTemplateId}`
    )
    expect(filterResponse.ok()).toBeTruthy()
    const filteredData = await filterResponse.json()

    // Find our test templates in the filtered results
    const testTemplates = filteredData.filter(
      (template) =>
        template._id === checklistId1 ||
        template._id === checklistId2 ||
        template._id === checklistId3
    )

    // Verify they are sorted by order
    for (let i = 1; i < testTemplates.length; i++) {
      expect(testTemplates[i - 1].order).toBeLessThanOrEqual(
        testTemplates[i].order
      )
    }

    // Verify the third template is now first in our test templates
    const sortedIds = testTemplates.map((t) => t._id)
    expect(sortedIds.indexOf(checklistId3)).toBeLessThan(
      sortedIds.indexOf(checklistId1)
    )
    expect(sortedIds.indexOf(checklistId3)).toBeLessThan(
      sortedIds.indexOf(checklistId2)
    )

    // Clean up the test checklist item templates
    await request.delete(`/api/v1/checklist-item-templates/${checklistId1}`)
    await request.delete(`/api/v1/checklist-item-templates/${checklistId2}`)
    await request.delete(`/api/v1/checklist-item-templates/${checklistId3}`)
  })

  test('should prevent duplicate order numbers', async ({ request }) => {
    // Create first checklist item template
    const checklistData1 = {
      name: `Test Checklist Item Template 1 ${uniqueId}`,
      description: 'Test checklist item template 1',
      type: 'approval',
      workflowTemplateId
    }

    const response1 = await request.post('/api/v1/checklist-item-templates', {
      data: checklistData1
    })
    expect(response1.ok()).toBeTruthy()
    const data1 = await response1.json()
    const checklistId1 = data1._id
    const order1 = data1.order

    // Try to update another template to have the same order
    const checklistData2 = {
      name: `Test Checklist Item Template 2 ${uniqueId}`,
      description: 'Test checklist item template 2',
      type: 'approval',
      workflowTemplateId
    }

    const response2 = await request.post('/api/v1/checklist-item-templates', {
      data: checklistData2
    })
    expect(response2.ok()).toBeTruthy()
    const data2 = await response2.json()
    const checklistId2 = data2._id

    // Try to update second template to have same order as first
    const updateResponse = await request.put(
      `/api/v1/checklist-item-templates/${checklistId2}`,
      {
        data: { order: order1 }
      }
    )
    expect(updateResponse.ok()).toBeFalsy()
    expect(updateResponse.status()).toBe(400)

    const errorData = await updateResponse.json()
    expect(errorData.message).toBe('Duplicate order number detected')

    // Clean up
    await request.delete(`/api/v1/checklist-item-templates/${checklistId1}`)
    await request.delete(`/api/v1/checklist-item-templates/${checklistId2}`)
  })
})
