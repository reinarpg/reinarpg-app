import { LocalServer } from './customServer'

const { createMCServer } = require('reinarpg-server/dist')

export const startLocalServer = (serverOptions) => {
  const passOptions = { ...serverOptions, Server: LocalServer }
  const server: NonNullable<typeof localServer> = createMCServer(passOptions)
  server.formatMessage = (message) => `[server] ${message}`
  server.options = passOptions
  //@ts-expect-error todo remove
  server.looseProtocolMode = true
  return server
}

// features that reinarpg-server doesn't support at all
// todo move & generate in reinarpg-server
export const unsupportedLocalServerFeatures = ['transactionPacketExists', 'teleportUsesOwnPacket']
