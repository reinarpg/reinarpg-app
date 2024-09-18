import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      'prismarine-registry': './noop.js',
      'reinarpg-nbt': './noop.js'
    },
  },
})
