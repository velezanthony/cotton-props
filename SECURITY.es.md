# Seguridad

## Hasta dónde llega la extensión

Lee los ficheros de plantilla del workspace abierto y escribe en ellos a través
de los comandos de refactorización y renombrado. **No hace peticiones de red**,
no envía telemetría y no ejecuta nada de tu proyecto — el proyecto Django de
`test-django-cotton/` son datos de prueba para la suite, nunca se ejecuta.

El webview de la barra lateral renderiza el código del componente con un
resaltador hecho a mano y escapa todo lo que emite. Corre con los scripts
deshabilitados.

## Reportar una vulnerabilidad

No abras una issue pública.

Usa el reporte privado de GitHub en
[github.com/velezanthony/django-cotton-props/security/advisories/new](https://github.com/velezanthony/django-cotton-props/security/advisories/new).

Incluye la versión, la entrada mínima que lo reproduce y qué observaste.
Recibirás acuse de recibo en unos días.

## Versiones con soporte

La última publicada. Esto lo mantiene una sola persona, así que los arreglos
salen como versión nueva en vez de como parches a versiones anteriores.
