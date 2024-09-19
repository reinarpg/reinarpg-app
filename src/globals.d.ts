/// <reference types="wicg-file-system-access" />

// todo make optional
declare const bot: Omit<import('reinarpg-bot').Bot, 'world' | '_client'> & {
  world: Omit<import('reinarpg-world').world.WorldSync, 'getBlock'> & {
    getBlock: (pos: import('vec3').Vec3) => import('reinarpg-block').Block | null
  }
  _client: Omit<import('reinarpg-protocol').Client, 'on'> & {
    write: typeof import('./generatedClientPackets').clientWrite
    on: typeof import('./generatedServerPackets').clientOn
  }
}
declare const __type_bot: typeof bot
declare const viewer: import('prismarine-viewer/viewer/lib/viewer').Viewer
declare const worldView: import('prismarine-viewer/viewer/lib/worldDataEmitter').WorldDataEmitter | undefined
declare const addStatPerSec: (name: string) => void
declare const localServer: import('reinarpg-server/dist/index').FullServer & { options } | undefined
/** all currently loaded mc data */
declare const mcData: Record<string, any>
declare const loadedData: import('reinarpg-data').IndexedData & { sounds: Record<string, { id, name }> }
declare const customEvents: import('typed-emitter').default<{
  /** Singleplayer load requested */
  singleplayer (): void
  digStart ()
  gameLoaded (): void
  mineflayerBotCreated (): void
  search (q: string): void
  activateItem (item: Item, slot: number, offhand: boolean): void
}>
declare const beforeRenderFrame: Array<() => void>

declare interface Document {
  exitPointerLock?(): void
}

declare interface Window extends Record<string, any> { }
