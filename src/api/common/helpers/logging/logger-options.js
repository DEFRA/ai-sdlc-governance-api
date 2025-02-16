import { ecsFormat } from '@elastic/ecs-pino-format'
import { config } from '~/src/config/index.js'
import { getTraceId } from '@defra/hapi-tracing'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'

const logConfig = config.get('log')
const serviceName = config.get('serviceName')
const serviceVersion = config.get('serviceVersion')
const isDevelopment = config.get('isDevelopment')

// Override log level to debug in development mode
if (isDevelopment && !process.env.LOG_LEVEL) {
  config.set('log.level', 'debug')
}

// Ensure logs directory exists and clear log file in development mode
if (isDevelopment) {
  const logDir = join(process.cwd(), 'logs')
  const logFile = join(logDir, 'app.log')
  await mkdir(logDir, { recursive: true })
  writeFileSync(logFile, '', { flag: 'w' }) // Clear/create the log file
}

/**
 * @type {{ecs: Omit<LoggerOptions, "mixin"|"transport">, "pino-pretty": {transport: {target: string}}}}
 */
const formatters = {
  ecs: {
    ...ecsFormat({
      serviceVersion,
      serviceName
    })
  },
  'pino-pretty': {
    transport: {
      targets: [
        { target: 'pino-pretty' },
        ...(isDevelopment
          ? [
              {
                target: 'pino/file',
                options: { destination: './logs/app.log', append: true }
              }
            ]
          : [])
      ]
    }
  }
}

/**
 * @satisfies {Options}
 */
export const loggerOptions = {
  enabled: logConfig.enabled,
  ignorePaths: ['/health'],
  redact: {
    paths: logConfig.redact,
    remove: true
  },
  level: logConfig.level,
  ...formatters[logConfig.format],
  nesting: true,
  mixin() {
    const mixinValues = {}
    const traceId = getTraceId()
    if (traceId) {
      mixinValues.trace = { id: traceId }
    }
    return mixinValues
  }
}

/**
 * @import { Options } from 'hapi-pino'
 * @import { LoggerOptions } from 'pino'
 */
