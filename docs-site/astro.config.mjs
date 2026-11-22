// Publishes https://velezanthony.github.io/cotton-props/
import { defineDocsSite } from '@velezanthony/design/integration';
import docsConfig from './docs.config.mjs';

export default defineDocsSite(docsConfig, {
  base: '/cotton-props',
  site: 'https://velezanthony.github.io',
});
