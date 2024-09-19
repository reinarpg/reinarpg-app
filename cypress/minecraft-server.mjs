//@ts-check
import mcServer from 'reinarpg-server'
import defaultOptions from 'reinarpg-server/config/default-settings.json' assert { type: 'json' }

/** @type {Options} */
const serverOptions = {
  ...defaultOptions,
  'online-mode': false,
  'logging': false,
  'gameMode': 0,
  'difficulty': 0,
  'worldFolder': undefined,
  // todo set sid, disable entities auto-spawn
  'generation': {
    'name': 'superflat',
    options: {}
    // 'options': {
    //   'worldHeight': 80
    // }
  },
  'modpe': false,
  'view-distance': 4,
  'everybody-op': true,
  'version': '1.16.1'
}
const server = mcServer.createMCServer(serverOptions)
