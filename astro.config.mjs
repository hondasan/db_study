import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://hondasan.github.io',
  base: '/db_study',
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark-dimmed',
      },
    },
  },
});
