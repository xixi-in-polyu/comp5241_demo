import react from '@astrojs/react'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://xixi-in-polyu.github.io',
  base: '/comp5241_demo',
  output: 'static',
  build: {
    format: 'directory',
  },
  integrations: [react()],
})
