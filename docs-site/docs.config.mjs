import { defineDocsConfig, MissingTranslation, NavIcon } from '@velezanthony/design/integration';

const REPO = 'https://github.com/velezanthony/cotton-props';

export default defineDocsConfig({
  site: {
    name: 'Cotton Props',
    // A copy of the extension's own icon.svg; the library takes a single favicon.
    favicon: 'logo.svg',
    social: { github: REPO },
    footer: { license: { label: 'MIT', href: `${REPO}/blob/main/LICENSE` } },
    // The "how to use it" searches land here; the story and the decisions live in the portfolio's
    // case study, which docs/ARCHITECTURE.md links once.
    seo: {
      description: {
        en: 'Docs for Cotton Props, the Django Cotton extension for VS Code: prop autocomplete, hover docs, diagnostics with quick fixes and the full rule reference.',
        es: 'Documentación de Cotton Props, la extensión de Django Cotton para VS Code: autocompletado de props, hover, diagnósticos con quick fix y la referencia de reglas.',
      },
      image: {
        src: '/og.png',
        alt: {
          en: 'The Cotton Props logo beside its name: full IntelliSense, validation and tooling for Django Cotton components in VS Code',
          es: 'El logo de Cotton Props junto a su nombre: IntelliSense, validación y herramientas para componentes de Django Cotton en VS Code',
        },
      },
      ogLocales: { en: 'en_GB', es: 'es_ES' },
      schema: [
        {
          '@type': 'SoftwareApplication',
          name: 'Cotton Props',
          description:
            'IntelliSense, validation and refactoring for Django Cotton components in VS Code.',
          applicationCategory: 'DeveloperApplication',
          applicationSubCategory: 'Visual Studio Code extension',
          operatingSystem: 'Windows, macOS, Linux (Visual Studio Code 1.97+)',
          url: 'https://velezanthony.github.io/cotton-props/',
          downloadUrl:
            'https://marketplace.visualstudio.com/items?itemName=velezanthony.cotton-props',
          codeRepository: REPO,
          license: 'https://opensource.org/licenses/MIT',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          sameAs: [
            REPO,
            'https://marketplace.visualstudio.com/items?itemName=velezanthony.cotton-props',
            'https://open-vsx.org/extension/velezanthony/cotton-props',
          ],
          author: {
            '@type': 'Person',
            '@id': 'https://velezanthony.github.io/#anthony',
            name: 'Anthony Velez Tapia',
            url: 'https://velezanthony.github.io/',
          },
        },
      ],
    },
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
    // them all), so their SEO lives here. A new page under docs/ needs an entry;
    // docs-workflow.test.ts fails until it has one.
    external: [
      {
        slug: 'index',
        file: '../README.md',
        seo: {
          title: { en: 'Django Cotton IntelliSense for VS Code', es: 'IntelliSense de Django Cotton para VS Code' },
          description: {
            en: 'Cotton Props adds Django Cotton support to VS Code: prop autocomplete, hover docs, 19 diagnostics with quick fixes, refactoring and a component explorer.',
            es: 'Cotton Props trae Django Cotton a VS Code: autocompletado de props, hover con su documentación, 19 diagnósticos con quick fix y un explorador de componentes.',
          },
        },
      },
      {
        slug: 'docs/users/getting-started',
        file: '../docs/users/getting-started.md',
        seo: {
          title: { en: 'Get started with Django Cotton in VS Code', es: 'Empezar con Django Cotton en VS Code' },
          description: {
            en: 'Install Cotton Props for VS Code, see Django Cotton prop autocomplete on first run, fix it when nothing appears, document a component and read a diagnostic.',
            es: 'Instala Cotton Props en VS Code, prueba el autocompletado de props de Django Cotton, qué hacer si no aparece, documenta un componente y lee un diagnóstico.',
          },
        },
      },
      {
        slug: 'docs/REFERENCE',
        file: '../docs/REFERENCE.md',
        seo: {
          title: { en: 'Diagnostics, prop syntax and settings', es: 'Diagnósticos, sintaxis de props y ajustes' },
          description: {
            en: 'Every Cotton Props diagnostic code with the input that triggers it, the @prop annotation and <c-vars> grammar for Django Cotton, and each cottonProps setting.',
            es: 'Cada código de diagnóstico de Cotton Props con la entrada que lo dispara, la gramática de @prop y <c-vars> de Django Cotton y cada ajuste cottonProps.',
          },
        },
      },
      {
        slug: 'docs/contributors',
        file: '../docs/contributors/index.md',
        seo: {
          title: { en: 'Contributor guide', es: 'Guía para contribuir' },
          description: {
            en: 'Where to start contributing to Cotton Props, the Django Cotton extension for VS Code: development setup, tests, architecture, conventions and releases.',
            es: 'Por dónde empezar a contribuir a Cotton Props, la extensión de Django Cotton para VS Code: entorno, tests, arquitectura, convenciones y publicación.',
          },
        },
      },
      {
        slug: 'docs/contributors/development',
        file: '../docs/contributors/development.md',
        seo: {
          title: { en: 'Develop the extension locally', es: 'Desarrollar la extensión en local' },
          description: {
            en: 'Set up Cotton Props for development: npm install, launch the Extension Development Host with F5, the npm scripts and where to start reading the source.',
            es: 'Prepara Cotton Props para desarrollar: npm install, el Extension Development Host con F5, los scripts de npm y por dónde empezar a leer el código.',
          },
        },
      },
      {
        slug: 'docs/contributors/testing',
        file: '../docs/contributors/testing.md',
        seo: {
          title: { en: 'Run the integration test suite', es: 'Ejecutar la suite de tests de integración' },
          description: {
            en: 'Run the Cotton Props tests in a real headless VS Code against a Django Cotton fixture: pure and hosted tests, guard tests, the rm -rf out trap and CI.',
            es: 'Ejecuta los tests de Cotton Props en un VS Code real sin interfaz contra un proyecto Django Cotton: tests puros y alojados, guardianes y la trampa de out/.',
          },
        },
      },
      {
        slug: 'docs/ARCHITECTURE',
        file: '../docs/ARCHITECTURE.md',
        seo: {
          title: { en: 'Architecture of the VS Code extension', es: 'Arquitectura de la extensión de VS Code' },
          description: {
            en: 'How Cotton Props resolves a Django Cotton tag to its component file and props: the scanner, the parser, the tag scanner and the providers built on them.',
            es: 'Cómo resuelve Cotton Props una etiqueta de Django Cotton hasta su archivo y sus props: el scanner, el parser, el lector de etiquetas y los providers de encima.',
          },
        },
      },
      {
        slug: 'docs/contributors/conventions',
        file: '../docs/contributors/conventions.md',
        seo: {
          title: { en: 'Code conventions', es: 'Convenciones de código' },
          description: {
            en: 'The conventions Cotton Props follows and why: when a comment earns its place, commit messages, load-bearing code rules and how documents are written.',
            es: 'Las convenciones de Cotton Props y por qué: cuándo vale la pena un comentario, los mensajes de commit, las reglas de código y cómo se escriben los documentos.',
          },
        },
      },
      {
        slug: 'docs/contributors/release',
        file: '../docs/contributors/release.md',
        seo: {
          title: { en: 'Release to the Marketplace and Open VSX', es: 'Publicar en el Marketplace y Open VSX' },
          description: {
            en: 'How a Cotton Props version ships: development to main, the release workflow, and one .vsix published to both the VS Code Marketplace and Open VSX.',
            es: 'Cómo sale una versión de Cotton Props: de development a main, el workflow de release y un mismo .vsix publicado en el Marketplace de VS Code y en Open VSX.',
          },
        },
      },
      {
        slug: 'CHANGELOG',
        file: '../CHANGELOG.md',
        seo: {
          title: { en: 'Changelog', es: 'Registro de cambios' },
          description: {
            en: 'Every Cotton Props release and what changed in it: new Django Cotton features, diagnostic fixes and breaking changes, following Keep a Changelog and SemVer.',
            es: 'Cada versión de Cotton Props y qué cambió: novedades para Django Cotton, diagnósticos corregidos y cambios incompatibles, según Keep a Changelog y SemVer.',
          },
        },
      },
      {
        slug: 'SECURITY',
        file: '../SECURITY.md',
        seo: {
          title: { en: 'Security and privacy', es: 'Seguridad y privacidad' },
          description: {
            en: 'What Cotton Props can reach in your workspace: it reads and edits Django templates, makes no network requests and sends no telemetry. How to report a flaw.',
            es: 'Qué toca Cotton Props en tu workspace: lee y edita plantillas de Django, no hace peticiones de red ni envía telemetría. Cómo informar de una vulnerabilidad.',
          },
        },
      },
      {
        slug: 'CONTRIBUTING',
        file: '../CONTRIBUTING.md',
        seo: {
          title: { en: 'How to contribute', es: 'Cómo contribuir' },
          description: {
            en: 'Contribute to Cotton Props, the Django Cotton extension for VS Code: what to run before a pull request, what gets pushed back and how to report a bug.',
            es: 'Contribuye a Cotton Props, la extensión de Django Cotton para VS Code: qué ejecutar antes de abrir un pull request, qué se rechaza y cómo informar de un error.',
          },
        },
      },
      {
        slug: 'src/core/providers',
        file: '../src/core/providers/README.md',
        seo: {
          title: { en: 'Language providers: completion and hover', es: 'Providers: autocompletado y hover' },
          description: {
            en: 'The VS Code providers behind Cotton Props: completion, hover, definition, rename, inlay hints and diagnostics for Django Cotton tags, each thin over the core.',
            es: 'Los providers de VS Code de Cotton Props: autocompletado, hover, definición, renombrado, inlay hints y diagnósticos para etiquetas de Django Cotton.',
          },
        },
      },
      {
        slug: 'src/core/views',
        file: '../src/core/views/README.md',
        seo: {
          title: { en: 'Component explorer sidebar', es: 'Barra lateral de componentes' },
          description: {
            en: 'How the Cotton Props sidebar works: the Django Cotton component tree built as a trie from dotted tags, its usage badges and the component detail webview.',
            es: 'Cómo funciona la barra lateral de Cotton Props: el árbol de componentes de Django Cotton a partir de etiquetas con puntos, sus insignias y la vista de detalle.',
          },
        },
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
