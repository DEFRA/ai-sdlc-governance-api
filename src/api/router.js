import { health } from '~/src/api/health/index.js'
import { example } from '~/src/api/example/index.js'
import governanceTemplateRoutes from '~/src/api/governance-template/index.js'
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
        jsonPath: '/docs/swagger.json'
      }

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
      await server.register([example, governanceTemplateRoutes])
    }
  }
}

export { router }
