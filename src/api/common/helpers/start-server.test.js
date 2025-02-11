const mockLoggerInfo = jest.fn()
const mockLoggerError = jest.fn()

const mockHapiLoggerInfo = jest.fn()
const mockHapiLoggerError = jest.fn()

const mockServer = {
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  logger: {
    info: mockHapiLoggerInfo,
    error: mockHapiLoggerError
  }
}

jest.mock('@hapi/hapi', () => ({
  server: jest.fn().mockReturnValue(mockServer)
}))

jest.mock('hapi-pino', () => ({
  register: (server) => {
    server.decorate('server', 'logger', {
      info: mockHapiLoggerInfo,
      error: mockHapiLoggerError
    })
  },
  name: 'mock-hapi-pino'
}))

jest.mock('~/src/api/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

const mockCreateServer = jest.fn().mockResolvedValue(mockServer)
jest.mock('~/src/api/index.js', () => ({
  createServer: mockCreateServer
}))

describe('#startServer', () => {
  const PROCESS_ENV = process.env
  let server

  beforeAll(() => {
    process.env = { ...PROCESS_ENV }
    process.env.PORT = '3098' // Set to obscure port to avoid conflicts
  })

  afterAll(() => {
    process.env = PROCESS_ENV
    jest.resetAllMocks()
  })

  describe('When server starts', () => {
    beforeEach(async () => {
      mockCreateServer.mockResolvedValueOnce(mockServer)
      const { startServer } = await import('./start-server.js')
      server = await startServer()
    })

    afterEach(async () => {
      await server?.stop({ timeout: 0 })
      jest.clearAllMocks()
    })

    test('Should start up server as expected', () => {
      expect(mockCreateServer).toHaveBeenCalled()
      expect(server.start).toHaveBeenCalled()
      expect(mockHapiLoggerInfo).toHaveBeenCalledWith(
        'Server started successfully'
      )
      expect(mockHapiLoggerInfo).toHaveBeenCalledWith(
        'Access your backend on http://localhost:3098'
      )
    })
  })

  describe('When server start fails', () => {
    beforeEach(() => {
      const error = new Error('Server failed to start')
      mockCreateServer.mockRejectedValueOnce(error)
    })

    test('Should log failed startup message', async () => {
      const { startServer } = await import('./start-server.js')
      await expect(startServer()).rejects.toThrow('Server failed to start')
      expect(mockLoggerInfo).toHaveBeenCalledWith('Server failed to start :(')
      expect(mockLoggerError).toHaveBeenCalledWith(expect.any(Error))
    })
  })
})
