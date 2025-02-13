import { test, expect } from '@playwright/test'

const governanceTemplate = {
  name: 'Test Governance Template',
  version: '1.0.0',
  description: 'Test governance template for E2E testing'
}

test.describe('Governance Template API', () => {
  let governanceTemplateId

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
})
