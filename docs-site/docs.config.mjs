import { defineDocsConfig, MissingTranslation, NavIcon } from '@velezanthony/design/integration';

const REPO = 'https://github.com/velezanthony/cotton-props';

export default defineDocsConfig({
  site: {
    name: 'Cotton Props',
    social: { github: REPO },
    footer: { license: { label: 'MIT', href: `${REPO}/blob/main/LICENSE` } },
    // Analytics only when the build sees PUBLIC_GTM_ID (docs.yml passes the secret).
    analytics: {
      privacyUrl: {
        es: 'https://velezanthony.github.io/privacidad/',
        en: 'https://velezanthony.github.io/en/privacy/',
      },
    },
  },
  // English lives in the unsuffixed files (the ones GitHub and the Marketplace read), Spanish in
  // `.es.md` siblings; an untranslated page shows the English one instead of a 404.
  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
    missing: MissingTranslation.FALLBACK,
  },
  content: {
    repoRoot: '..',
    editUrl: `${REPO}/edit/main`,
    // Every page is an `external`, so each slug keeps the URL the MkDocs site published
    // (`/CHANGELOG/`, `/docs/REFERENCE/`…). README, CHANGELOG, CONTRIBUTING and SECURITY stay at the
    // root, where the Marketplace and GitHub read them. No page carries frontmatter (GitHub renders
    // them all). A new page under docs/ needs an entry;
    // docs-workflow.test.ts fails until it has one.
    external: [
      {
        slug: 'index',
        file: '../README.md',
      },
      {
        slug: 'docs/users/getting-started',
        file: '../docs/users/getting-started.md',
      },
      {
        slug: 'docs/REFERENCE',
        file: '../docs/REFERENCE.md',
      },
      {
        slug: 'docs/contributors',
        file: '../docs/contributors/index.md',
      },
      {
        slug: 'docs/contributors/development',
        file: '../docs/contributors/development.md',
      },
      {
        slug: 'docs/contributors/testing',
        file: '../docs/contributors/testing.md',
      },
      {
        slug: 'docs/ARCHITECTURE',
        file: '../docs/ARCHITECTURE.md',
      },
      {
        slug: 'docs/contributors/conventions',
        file: '../docs/contributors/conventions.md',
      },
      {
        slug: 'docs/contributors/release',
        file: '../docs/contributors/release.md',
      },
      {
        slug: 'CHANGELOG',
        file: '../CHANGELOG.md',
      },
      {
        slug: 'SECURITY',
        file: '../SECURITY.md',
      },
      {
        slug: 'CONTRIBUTING',
        file: '../CONTRIBUTING.md',
      },
      {
        slug: 'src/core/providers',
        file: '../src/core/providers/README.md',
      },
      {
        slug: 'src/core/views',
        file: '../src/core/views/README.md',
      },
    ],
    nav: [
      { label: { en: 'Home', es: 'Inicio' }, slug: 'index' },
      {
        label: { en: 'For users', es: 'Para usuarios' },
        sidebar: ['docs/users/getting-started', 'docs/REFERENCE', 'CHANGELOG', 'SECURITY'],
      },
      {
        label: { en: 'For contributors', es: 'Para quien contribuye' },
        sidebar: [
          'docs/contributors',
          'CONTRIBUTING',
          'docs/contributors/development',
          'docs/contributors/testing',
          'docs/ARCHITECTURE',
          'docs/contributors/conventions',
          'docs/contributors/release',
          {
            label: { en: 'Layer notes', es: 'Notas por capa' },
            items: ['src/core/providers', 'src/core/views'],
          },
        ],
      },
      { label: 'GitHub', href: REPO, icon: NavIcon.GITHUB },
    ],
  },
});
