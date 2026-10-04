// @ts-check
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
  site: 'https://discussing-the-divine-comedy-with-dante.netlify.app',
  vite: {
    plugins: [tailwindcss()]
  }
})
