module.exports = {
  mongodbMemoryServerOptions: {
    binary: {
      version: '4.0.3',
      skipMD5: true
    },
    instance: {
      dbName: 'ai-sdlc-governance-api',
      replSet: {
        name: 'testset'
      }
    }
  }
}
