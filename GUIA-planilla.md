# Planilla de atletas: guía rápida

App web gratuita que el atleta instala en su teléfono desde un link. No usa servidor ni cuentas: cada atleta guarda sus registros en su propio teléfono y te envía su semana como archivo. Tú cargas esos archivos en tu panel y de ahí salen las métricas y el reporte trimestral o semestral.

## Qué hay en la carpeta

| Archivo | Para qué |
|---|---|
| `index.html` | La app del atleta |
| `coach.html` + `editor.js` | Tu panel: crear y editar planes, cargar semanas, ver métricas, generar reporte PDF y exportar a Excel |
| `planes/` | Un archivo `.json` por atleta con su plan. El nombre del archivo es su código |
| `planes/plantilla.json` | Ejemplo de plan para copiar |
| `planes/marcelo-x7k3.json` | Tu plan actual del Bloque 1, ya convertido |
| `manifest.webmanifest`, `sw.js`, `icons/` | Hacen que se instale como app y funcione sin conexión. No hay que tocarlos |

## 1. Publicar gratis (una vez, ~10 minutos)

**Opción A · Netlify Drop (la más simple, sin programación)**
1. Entra a `app.netlify.com/drop`.
2. Arrastra la carpeta completa `planilla-atletas`.
3. Te entrega un link tipo `https://algo.netlify.app`. Crea la cuenta gratis y **reclama el sitio** para que no se borre.
4. En la configuración del sitio puedes cambiarle el nombre (por ejemplo `planilla-marcelo.netlify.app`).

**Opción B · GitHub Pages**
1. Crea una cuenta gratis en GitHub y un repositorio nuevo.
2. Sube el contenido de la carpeta (botón «Add file › Upload files»).
3. En «Settings › Pages», elige la rama `main` y la carpeta raíz. El link queda como `https://tuusuario.github.io/repositorio/`.
4. Ojo: en el plan gratis el repositorio es público, así que cualquiera podría ver los archivos de plan. Por eso conviene la opción A.

## 2. Entrar como coach y cargar planes

Tu panel está en `https://TU-SITIO.netlify.app/coach.html`. También aparece como «¿Eres coach? Entrar al panel» en la pantalla de inicio de la app. Guárdalo en favoritos y úsalo siempre en el mismo computador y navegador.

En la pestaña **Planes**:

1. **+ Nuevo atleta**: escribes el nombre y se crea un código único (ej. `ana-wc8m`).
2. Agregas días (sesión, clase, carrera, viaje o descanso). Cada día viene con secciones de ejemplo:
   - **Ejercicios con registro**: el atleta anota series con kg, reps o segundos. Esto alimenta las marcas y el reporte.
   - **Lista para marcar**: calentamiento, movilidad, accesorios.
   - **Solo indicaciones**: WOD u otras instrucciones.
3. **Duplicar semana a la siguiente** copia la semana completa para que solo ajustes cargas. **Duplicar** (en la lista) copia el plan de un atleta a otro como punto de partida.
4. Para entregarlo tienes dos caminos:
   - **Enviar plan al atleta** (recomendado): genera el archivo `codigo.json`. Se lo mandas por WhatsApp y él lo carga en la app con «Tengo un archivo de plan» (primera vez) o «⋯ › Cargar plan desde archivo». No necesitas republicar el sitio y el plan no queda en internet.
   - **Descargar para publicar**: pones el archivo en la carpeta `planes/` y vuelves a arrastrar la carpeta en Netlify (Deploys). El atleta lo recibe solo con «⋯ › Actualizar mi plan».
5. La etiqueta «Sin entregar» te recuerda qué planes cambiaste y el atleta todavía no tiene.

Si un atleta tiene las dos versiones, la app usa la más reciente. Sus registros no se pierden al cambiar el plan.

Para traer tu plan actual al editor: **Importar archivo de plan** › `planes/marcelo-x7k3.json`.

**No pongas datos de salud en los archivos de plan publicados**: cualquiera con el link y el código puede verlos. Los registros (RPE, molestias, notas) nunca se suben.

## 3. Lo que hace el atleta

1. Abre el link en Safari (iPhone) o Chrome (Android) y lo agrega a la pantalla de inicio.
2. **Desde ahí en adelante, lo abre siempre desde el ícono.** En iPhone, lo que se anota en Safari y lo que se anota en el ícono se guardan por separado.
3. Registra cada sesión: series, RPE, molestias y notas. Se guarda solo.
4. El domingo toca «Enviar mi semana al coach» y te manda el archivo por WhatsApp o correo.
5. Cada cierto tiempo, «⋯ › Descargar respaldo» y lo guarda en su correo o nube. Si cambia de teléfono, «Restaurar respaldo».

## 4. Tu rutina como coach

1. Junta en una carpeta los archivos `semana_….json` que te llegan.
2. Abre `coach.html` (el de tu sitio publicado) **siempre en el mismo navegador y computador**, y arrastra los archivos. Si alguien reenvía una semana, se reemplaza.
3. La tabla de atletas muestra quién está al día, cumplimiento, RPE y molestia de las últimas 4 semanas.
4. Haz clic en un atleta, elige periodo (3 meses, 6 meses, año o personalizado) y toca «Reporte en PDF». Guárdalo como PDF y envíaselo.
5. «Exportar a Excel (CSV)» saca todas las series con kg y reps, por si quieres hacer tus propios análisis.
6. **Respalda tu base cada mes** (incluye tus planes y las semanas) con «Respaldar base» y guarda el archivo en tu Drive. Los datos del panel viven solo en ese navegador; si borras el historial o cambias de computador, los recuperas con «Restaurar base».

## Formato del plan (resumen)

Cada día del plan es un objeto en `dias` con:

- `fecha` (AAAA-MM-DD), `dia` (texto visible), `bloque`, `semana`, `fase`
- `tipo`: `sesion`, `clase`, `carrera`, `viaje` o `descanso`
- `titulo`, `objetivo`
- `registro`: campos de texto extra al final (ej. `"WOD (rondas + reps)"`)
- `secciones`: bloques con `titulo`, `nota`, `check` (true = lista para marcar) e `items`
  - Un item con `series` y `campos` (`kg`, `reps`, `seg`) genera casillas para anotar cada serie. Esos datos alimentan las marcas y la progresión del reporte.

Opciones del plan completo:

- `zonaMolestia`: nombre de la zona que se sigue (ej. `"Lumbar"`). Si no se define, el atleta indica la zona.
- `avisoAmarillo`: mensaje que ve el atleta cuando marca molestia 4-5.
- `resumenCampos`: preguntas del resumen semanal del día de descanso.
- `ejercicios`, `focosClase`: listas sugeridas en los días de clase.
