import { health } from '~/src/api/health/index.js'
import { example } from '~/src/api/example/index.js'
import governanceTemplateRoutes from '~/src/api/governance-templates/index.js'
import workflowTemplateRoutes from '~/src/api/workflow-templates/index.js'
import checklistItemTemplateRoutes from '~/src/api/checklist-item-templates/index.js'
import projectRoutes from '~/src/api/projects/index.js'
import checklistItemInstanceRoutes from './checklist-item-instances/index.js'
import workflowInstanceRoutes from './workflow-instances/index.js'
import Inert from '@hapi/inert'
import Vision from '@hapi/vision'
import HapiSwagger from 'hapi-swagger'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

let packageJson
try {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  packageJson = JSON.parse(
    readFileSync(join(__dirname, '../../package.json'), 'utf8')
  )
} catch (error) {
  // Fallback for test environment
  const __dirname = process.cwd()
  packageJson = JSON.parse(
    readFileSync(join(__dirname, 'package.json'), 'utf8')
  )
}

/**
 * @satisfies { import('@hapi/hapi').ServerRegisterPluginObject<*> }
 */
const router = {
  plugin: {
    name: 'Router',
    register: async (server) => {
      const swaggerOptions = {
        info: {
          title: 'AI SDLC Governance API Documentation',
          version: packageJson.version,
          description: 'API documentation for the AI SDLC Governance service'
        },
        securityDefinitions: {
          jwt: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header'
          }
        },
        security: [{ jwt: [] }],
        documentationPath: '/docs',
        swaggerUIPath: '/docs/swagger',
        jsonPath: '/docs/swagger.json',
        basePath: '/api/v1',
        pathPrefixSize: 2,
        grouping: 'tags',
        expanded: 'list',
        uiOptions: { defaultModelsExpandDepth: -1 },
        tags: [
          {
            name: 'api',
            description: 'API Endpoints'
          },
          {
            name: 'project',
            description:
              '📊 Projects - Project instances created from governance templates'
          },
          {
            name: 'governance-template',
            description:
              '🔷 Governance Templates - Top level templates that define governance processes'
          },
          {
            name: 'workflow-template',
            description:
              '🔶 Workflow Templates - Templates that define workflow steps within a governance template'
          },
          {
            name: 'checklist-item-template',
            description:
              '📋 Checklist Item Templates - Individual checklist items within workflow templates'
          },
          {
            name: 'workflow-instance',
            description:
              '🔸 Workflow Instances - Active workflow instances within projects'
          },
          {
            name: 'checklist-item-instance',
            description:
              '✓ Checklist Item Instances - Active checklist items within workflow instances'
          }
        ]
      }

      // Register swagger plugins first
      await server.register([
        Inert,
        Vision,
        {
          plugin: HapiSwagger,
          options: swaggerOptions
        }
      ])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes, add your own routes here.
      await server.register([
        example,
        governanceTemplateRoutes,
        workflowTemplateRoutes,
        checklistItemTemplateRoutes,
        projectRoutes,
        checklistItemInstanceRoutes,
        workflowInstanceRoutes
      ])
    }
  }
}

export { router }
