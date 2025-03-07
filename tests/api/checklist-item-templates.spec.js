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
})
