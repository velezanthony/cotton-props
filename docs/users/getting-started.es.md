# Primeros pasos

## Instalar

Busca **Cotton Props** en la vista de extensiones, o:

```
ext install velezanthony.cotton-props
```

Necesita VS Code **1.97+** y un proyecto [Django Cotton](https://django-cotton.com/)
con plantillas de componentes.

## La primera vez

Abre cualquier plantilla `.html` o `django-html` y escribe `<c-`. El
autocompletado, la documentación al pasar el ratón y los diagnósticos están
vivos desde el primer momento — la estructura por defecto `templates/cotton/` no
necesita configuración.

## Si no aparece nada

La extensión encuentra los componentes escaneando directorios de plantillas.
Mira bajo `templates/cotton/` por defecto, a cualquier profundidad, así que una
estructura `APP_DIRS` de Django con copias por app funciona sin tocar nada.

Si tus componentes están en otro sitio, apúntala hacia ellos:

```jsonc
{
  "djangoCottonProps.templatePaths": ["templates/cotton", "ui/components"]
}
```

`excludePaths` estrecha el escaneo — y se aplica también a las **definiciones**
de componente, no solo a los usos. Una ruta excluida ahí hace invisibles a sus
componentes, no solo los deja sin referenciar.

Los dos ajustes se aplican en vivo: los cambias y el árbol, los diagnósticos y la
barra de estado te siguen sin recargar la ventana.

## Documentar un componente

La anotación `@prop` documenta una prop; `<c-vars>` la declara para Cotton. Hacen
falta las dos, y los diagnósticos existen para cazar el momento en que se
separan.

```html
{# @description Un botón. #}
{# @prop variant:select['primary','ghost'] | default:"primary" | description:"Estilo visual" #}
{# @prop label:text | required #}

<c-vars variant="primary" label />

<button class="btn btn-{{ variant }}">{{ label }}</button>
```

Todos los filtros, todos los tipos y el contrato completo de `<c-vars>` están en
la [referencia](../REFERENCE.es.md#sintaxis-de-anotaciones).

## Leer un diagnóstico

Los hallazgos llevan un origen y un código, que el panel de Problems muestra
juntos:

```
cotton-props(sync-default)
```

Escribe el código en la caja de filtro del panel para aislar esa regla, o
`cotton-props` para ver solo lo de esta extensión. Cada código tiene su
propia sección en la [referencia](../REFERENCE.es.md#reglas-de-diagnóstico), con
la entrada mínima que lo dispara.
