//@ts-check
import { join } from 'path'
import { promisify } from 'util'
import fs from 'fs'
import { oneOf } from '@zardoy/utils'
import JSZip from 'jszip'
import * as browserfs from 'browserfs'
import { options } from './optionsStorage'

import { fsState, loadSave } from './loadSave'
import { installTexturePack, updateTexturePackInstalledState } from './texturePack'

browserfs.install(window)
// todo migrate to StorageManager API for localsave as localstorage has only 5mb limit, when localstorage is fallback test limit warning on 4mb
const deafultMountablePoints = {
  '/world': { fs: 'LocalStorage' },
  '/userData': { fs: 'IndexedDB' },
}
browserfs.configure({
  fs: 'MountableFileSystem',
  options: deafultMountablePoints,
}, (e) => {
  // todo disable singleplayer button
  if (e) throw e
  updateTexturePackInstalledState()
})

export const forceCachedDataPaths = {}

//@ts-expect-error
fs.promises = new Proxy(Object.fromEntries(['readFile', 'writeFile', 'stat', 'mkdir', 'rmdir', 'unlink', 'rename', /* 'copyFile',  */'readdir'].map(key => [key, promisify(fs[key])])), {
  get (target, p: string, receiver) {
    if (!target[p]) throw new Error(`Not implemented fs.promises.${p}`)
    return (...args) => {
      // browser fs bug: if path doesn't start with / dirname will return . which would cause infinite loop, so we need to normalize paths
      if (typeof args[0] === 'string' && !args[0].startsWith('/')) args[0] = '/' + args[0]
      // Write methods
      // todo issue one-time warning (in chat I guess)
      if (fsState.isReadonly) {
        if (oneOf(p, 'readFile', 'writeFile') && forceCachedDataPaths[args[0]]) {
          if (p === 'readFile') {
            return Promise.resolve(forceCachedDataPaths[args[0]])
          } else if (p === 'writeFile') {
            forceCachedDataPaths[args[0]] = args[1]
            return Promise.resolve()
          }
        }
        if (oneOf(p, 'writeFile', 'mkdir', 'rename')) return
      }
      if (p === 'open' && fsState.isReadonly) {
        args[1] = 'r' // read-only, zipfs throw otherwise
      }
      return target[p](...args)
    }
  }
})
//@ts-expect-error
fs.promises.open = async (...args) => {
  const fd = await promisify(fs.open)(...args)
  return {
    ...Object.fromEntries(['read', 'write', 'close'].map(x => [x, async (...args) => {
      return new Promise(resolve => {
        // todo it results in world corruption on interactions eg block placements
        if (x === 'write' && fsState.isReadonly) {
          resolve({ buffer: Buffer.from([]), bytesRead: 0 })
          return
        }

        fs[x](fd, ...args, (err, bytesRead, buffer) => {
          if (err) throw err
          // todo if readonly probably there is no need to open at all (return some mocked version - check reload)?
          if (x === 'write' && !fsState.isReadonly && fsState.syncFs) {
            // flush data, though alternatively we can rely on close in unload
            fs.fsync(fd, () => { })
          }
          resolve({ buffer, bytesRead })
        })
      })
    }])),
    // for debugging
    fd,
    filename: args[0],
    async close () {
      return new Promise<void>(resolve => {
        fs.close(fd, (err) => {
          if (err) {
            throw err
          } else {
            resolve()
          }
        })
      })
    }
  }
}

// for testing purposes, todo move it to core patch
const removeFileRecursiveSync = (path) => {
  for (const file of fs.readdirSync(path)) {
    const curPath = join(path, file)
    if (fs.lstatSync(curPath).isDirectory()) {
      // recurse
      removeFileRecursiveSync(curPath)
      fs.rmdirSync(curPath)
    } else {
      // delete file
      fs.unlinkSync(curPath)
    }
  }
}

window.removeFileRecursiveSync = removeFileRecursiveSync

// todo it still doesnt clean the storage, need to debug
export async function removeFileRecursiveAsync (path) {
  const files = await fs.promises.readdir(path)
  for (const file of files) {
    const curPath = join(path, file)
    const stats = await fs.promises.stat(curPath)
    if (stats.isDirectory()) {
      // Recurse
      await removeFileRecursiveAsync(curPath)
    } else {
      // Delete file
      await fs.promises.unlink(curPath)
    }
  }
  await fs.promises.rmdir(path)
}


const SUPPORT_WRITE = true

export const openWorldDirectory = async (dragndropHandle?: FileSystemDirectoryHandle) => {
  let _directoryHandle: FileSystemDirectoryHandle
  if (dragndropHandle) {
    _directoryHandle = dragndropHandle
  } else {
    try {
      _directoryHandle = await window.showDirectoryPicker()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      throw err
    }
  }
  const directoryHandle = _directoryHandle

  const requestResult = SUPPORT_WRITE && !options.preferLoadReadonly ? await directoryHandle.requestPermission?.({ mode: 'readwrite' }) : undefined
  const writeAccess = requestResult === 'granted'

  const doContinue = writeAccess || !SUPPORT_WRITE || options.disableLoadPrompts || confirm('Continue in readonly mode?')
  if (!doContinue) return
  await new Promise<void>(resolve => {
    browserfs.configure({
      // todo
      fs: 'MountableFileSystem',
      options: {
        '/world': {
          fs: 'FileSystemAccess',
          options: {
            handle: directoryHandle
          }
        }
      },
    }, (e) => {
      if (e) throw e
      resolve()
    })
  })

  fsState.isReadonly = !writeAccess
  fsState.syncFs = false
  fsState.inMemorySave = false
  loadSave()
}

const tryToDetectResourcePack = async (file: File | ArrayBuffer) => {
  const askInstall = async () => {
    return alert('ATM You can install texturepacks only via options menu. WIll be fixed')
    // if (confirm('Resource pack detected, do you want to install it?')) {
    //   await installTexturePack(file)
    // }
  }

  if (fs.existsSync('/world/pack.mcmeta')) {
    askInstall()
    return true
  }
  // const jszip = new JSZip()
  // let loaded = await jszip.loadAsync(file)
  // if (loaded.file('pack.mcmeta')) {
  //   loaded = null
  //   askInstall()
  //   return true
  // }
  // loaded = null
}

export const possiblyCleanHandle = () => {
  if (!fsState.saveLoaded) {
    // todo clean handle
    browserfs.configure({
      fs: 'MountableFileSystem',
      options: deafultMountablePoints,
    }, (e) => {
      if (e) throw e
    })
  }
}

// todo rename method
const openWorldZipInner = async (file: File | ArrayBuffer, name = file['name']) => {
  await new Promise<void>(async resolve => {
    browserfs.configure({
      // todo
      fs: 'MountableFileSystem',
      options: {
        ...deafultMountablePoints,
        '/world': {
          fs: 'ZipFS',
          options: {
            zipData: Buffer.from(file instanceof File ? (await file.arrayBuffer()) : file),
            name
          }
        }
      },
    }, (e) => {
      if (e) throw e
      resolve()
    })
  })

  fsState.saveLoaded = false
  fsState.isReadonly = true
  fsState.syncFs = true
  fsState.inMemorySave = false

  if (fs.existsSync('/world/level.dat')) {
    await loadSave()
  } else {
    const dirs = fs.readdirSync('/world')
    const availableWorlds: string[] = []
    for (const dir of dirs) {
      if (fs.existsSync(`/world/${dir}/level.dat`)) {
        availableWorlds.push(dir)
      }
    }

    if (availableWorlds.length === 0) {
      if (await tryToDetectResourcePack(file)) return
      alert('No worlds found in the zip')
      return
    }

    if (availableWorlds.length === 1) {
      await loadSave(`/world/${availableWorlds[0]}`)
      return
    }

    alert(`Many (${availableWorlds.length}) worlds found in the zip!`)
    // todo prompt picker
    // const selectWorld
  }
}

export const openWorldZip = async (...args: Parameters<typeof openWorldZipInner>) => {
  try {
    return await openWorldZipInner(...args)
  } finally {
    possiblyCleanHandle()
  }
}

export const resetLocalStorageWorld = () => {
  for (const key of Object.keys(localStorage)) {
    if (/^[\da-fA-F]{8}(?:\b-[\da-fA-F]{4}){3}\b-[\da-fA-F]{12}$/g.test(key) || key === '/') {
      localStorage.removeItem(key)
    }
  }
}

window.resetLocalStorageWorld = resetLocalStorageWorld
