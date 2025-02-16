// @ts-check
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3001',
    extraHTTPHeaders: {
      Accept: 'application/json'
    }
  },
  reporter: [['list']],
  projects: [
    {
      name: 'api-tests',
      testMatch: /.*\.spec\.js/
    }
  ]
})
