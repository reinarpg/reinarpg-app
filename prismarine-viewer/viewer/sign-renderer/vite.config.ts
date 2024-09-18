import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      'reinarpg-registry': './noop.js',
      'reinarpg-nbt': './noop.js'
    },
  },
})
