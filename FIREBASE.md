# Activar CUT para compartir entre teléfonos

La app usa el SDK JavaScript de Firebase incluido en el proyecto. Funciona en Expo Go compatible con SDK 58 y en web. No necesitas publicar en las tiendas para compartir perfiles y publicaciones.

## 1. Abrir el mismo proyecto de las cuentas

Entra a [Firebase Console](https://console.firebase.google.com/). Selecciona el proyecto cuyo ID aparece en `EXPO_PUBLIC_FIREBASE_PROJECT_ID` dentro de `.env.local` (este proyecto ya tenía configuradas cuentas con Firebase).

En **Compilación / Build → Authentication → Sign-in method**, habilita **Correo electrónico/contraseña** si aún no está activo. Las cuentas existentes siguen sirviendo.

## 2. Crear Cloud Firestore

1. Ve a **Compilación / Build → Firestore Database → Crear base de datos**.
2. Usa **Cloud Firestore Standard**, base de datos **(default)**. Escoge la ubicación que quieras conservar para tus datos.
3. Comienza con **reglas de producción**.
4. En la pestaña **Reglas**, reemplaza el contenido con el archivo completo [firestore.rules](./firestore.rules) y pulsa **Publicar**.

No uses reglas abiertas de prueba. Las reglas incluidas permiten leer contenido de la comunidad a cuentas autenticadas, protegen el propietario de cada dato y reservan los nombres de usuario de forma atómica. Correo y contraseña se administran en Authentication y no se publican en los perfiles.

## 3. Crear el índice de publicaciones

En **Firestore Database → Índices → Compuestos → Crear índice**:

| Campo              | Valor                    |
| ------------------ | ------------------------ |
| ID de colección    | `posts`                  |
| Primer campo       | `creatorId`, Ascendente  |
| Segundo campo      | `createdAt`, Descendente |
| Ámbito de consulta | Colección                |

Espera hasta que aparezca como **Habilitado**. El mismo índice está definido en [firestore.indexes.json](./firestore.indexes.json). Se necesita para publicaciones propias, perfiles y personas seguidas; el feed general usa un índice automático.

### Índice adicional para historias

Para la fila de historias de las personas seguidas, crea también un índice compuesto con **colección `stories`**, **`creatorId` Ascendente**, **`createdAt` Descendente** y **ámbito Colección**. Espera a que esté **Habilitado**. Este índice está incluido en `firestore.indexes.json` junto al de `posts`.

Si ya habías publicado las reglas antes de añadir las historias, vuelve a pegar y publicar **todo `firestore.rules`**: ahora también protege `stories`, permitiendo lectura solo al autor y a sus seguidores.

## 4. Activar fotos y videos

**Proyecto escolar sin tarjeta ni presupuesto:** usa la alternativa ya implementada en **[CLOUDINARY.md](./CLOUDINARY.md)**. Mantiene Firebase Spark y usa Cloudinary Free para los archivos. Sigue esa guía y salta los pasos de Firebase Storage de esta sección. Después de configurar Cloudinary, vuelve a publicar `firestore.rules` para admitir sus URLs.

Los pasos siguientes solo corresponden al proveedor opcional Firebase Storage (`EXPO_PUBLIC_MEDIA_PROVIDER=firebase`):

1. Entra a **Compilación / Build → Storage → Comenzar**.
2. Firebase requiere el plan **Blaze** con una cuenta de facturación vinculada para usar Cloud Storage. Revisa sus condiciones y configura una alerta de presupuesto antes de activarlo. Las alertas avisan; no son un límite de gasto. [Requisitos de Storage](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024) y [alertas de presupuesto](https://docs.cloud.google.com/billing/docs/how-to/budgets).
3. Crea el bucket y copia su nombre exacto, por ejemplo `tu-proyecto.firebasestorage.app`. Algunos proyectos anteriores usan `tu-proyecto.appspot.com`.
4. En **Storage → Reglas**, pega [storage.rules](./storage.rules) y pulsa **Publicar**.
5. En `.env.local`, establece `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` con ese nombre, sin `gs://`.

Las reglas admiten imágenes de hasta **10 MB** y videos de hasta **50 MB**, subidos a la carpeta de la cuenta propietaria. La app espera a que termine la subida y luego publica la URL compartida. Las URLs de descarga se pueden compartir: este almacenamiento está pensado para contenido de la comunidad, no para documentos privados.

Puedes comenzar probando **perfiles sin imágenes, publicaciones de texto, encuestas, comentarios y likes** con Authentication y Firestore. Las fotos, portadas y reels requieren Cloudinary configurado o Firebase Storage operativo.

## 5. Revisar la configuración y reiniciar

En **Configuración del proyecto → General → Tus apps → App web**, encontrarás la configuración del cliente. Compara estos campos con `.env.local`:

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=valor_de_apiKey
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=valor_de_authDomain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=valor_de_projectId
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=nombre_exacto_del_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=valor_de_messagingSenderId
EXPO_PUBLIC_FIREBASE_APP_ID=valor_de_appId
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=
```

Deja **EMULATOR_HOST vacío** para conectarte a Firebase en internet. Las variables `EXPO_PUBLIC_*` son configuración pública incluida en la app. No pongas claves de administrador ni archivos de cuentas de servicio en ellas.

Reinicia Expo:

```sh
npx expo start --clear
```

Si los teléfonos están en redes distintas:

```sh
npx expo start --tunnel
```

Cada teléfono necesita internet y acceso al servidor de desarrollo, además de una versión de Expo Go compatible. Mientras compartes el QR de desarrollo, deja la computadora y Expo encendidos. En iPhone, Expo Go requiere que CLI y Expo Go usen la misma cuenta de Expo; esto es independiente de las cuentas de CUT. Para distribuir pruebas sin depender de ese servidor o de esa cuenta, puedes preparar después una compilación de prueba. [Abrir el proyecto y conexiones de red](https://docs.expo.dev/get-started/start-developing/).

## 6. Probar con dos cuentas

1. Abre CUT en el teléfono A, inicia sesión y completa tu perfil. El usuario se guarda en minúsculas y no puede repetirse.
2. Abre el mismo proyecto en el teléfono B e inicia sesión con **otra cuenta de CUT** y otro usuario.
3. Publica texto desde A: debe aparecer en B sin recargar.
4. Desde B, abre el perfil del autor, síguelo, da un like y escribe un comentario. A debe ver el like y comentario.
5. Guarda una publicación en B: aparecerá en sus guardados, sin añadirse a los guardados de A.
6. Prueba una foto y un reel después de configurar Cloudinary o el proveedor opcional Firebase Storage.
7. Desde **TU HISTORIA** publica una foto o video. Otra cuenta solo debe ver la historia en esa fila si sigue a su autor. Un perfil sin historias no aparece. Al dejar de seguirlo, desaparece de la fila. Al cumplirse 24 horas desde la publicación, la historia se oculta sin tener que recargar.
8. Cierra y vuelve a abrir CUT o inicia sesión en otro dispositivo: el perfil y los datos se recuperan de Firebase.

No necesitas crear colecciones o documentos a mano: la app los crea con las primeras acciones.

### Eliminar publicaciones, reels e historias

En los tres puntos del contenido propio aparece **Eliminar publicación**, **Eliminar reel** o **Eliminar historia**. Se pide confirmación y se muestra el error si no se puede guardar el borrado. La autoría se comprueba con el documento del servidor y con las reglas de Firestore; otras cuentas no pueden eliminarlo.

El documento de `posts` (también usado por reels) o de `stories` se elimina de Firestore. Los listeners lo retiran del inicio, perfiles, reels, guardados e historias de las demás cuentas. Un enlace a un post eliminado muestra que ya no está disponible. Al eliminar una historia se muestra la siguiente disponible o el estado sin historias.

**Vuelve a publicar todo `firestore.rules`** para que los comentarios de una publicación eliminada dejen de ser legibles. Firestore no borra subcolecciones en cascada: los comentarios, reacciones, referencias en guardados y avisos históricos pueden permanecer almacenados, aunque ya no dan acceso a la publicación en CUT. Su limpieza administrativa queda pendiente.

El archivo de foto o video tampoco se borra del proveedor de medios. En Cloudinary puedes limpiarlo desde **Assets → Media Library → cut**. Borrarlo de Cloudinary de forma segura desde la app requeriría un servidor con las credenciales privadas; nunca hay que incluir el API Secret en Expo.

## Qué se guarda

### Cámara para publicaciones, historias y reels

El icono de imagen del editor abre la galería con `expo-image-picker`. El icono de cámara abre las opciones **Tomar foto** y **Grabar video**. La captura abre la interfaz de cámara del sistema; en móvil web se solicita captura mediante el selector del navegador y su comportamiento depende del navegador. El editor de reels muestra solo grabación de video. No se sube nada hasta pulsar **Publicar** y cancelar conserva el texto y el archivo previo.

Las capturas de video se limitan a 60 segundos, con validación al volver de la cámara porque algunas aplicaciones de Android no respetan el límite solicitado. Se mantienen los límites de 10 MB por imagen y 50 MB por video. Un video creado desde **Nuevo corte** se guarda como post del inicio (`reel: false`); desde **Nuevo reel**, como reel. Los videos de posts se muestran dentro de la tarjeta como las imágenes, con controles y sin reproducción automática. El feed y el perfil solo mantienen reproductores para tarjetas visibles. La reproducción se pausa al salir de la pantalla o pasar la app al fondo.

Las fotos seleccionadas se preparan una sola vez con `expo-image-manipulator`: hasta 1920 píxeles en su lado mayor, JPEG con calidad 0.72 o PNG para conservar transparencia. Se conserva el archivo original si el resultado no pesa menos o su formato no se puede procesar; los GIF no se convierten. Los videos no se recomprimen. Cloudinary recibe un formulario multipart con la URI nativa del archivo, sin copiar el video completo a JavaScript. La subida muestra bytes enviados cuando están disponibles; después indica procesamiento y guardado sin inventar porcentajes. **Cancelar subida** aborta el envío y conserva el borrador, pero no puede deshacer un archivo que el proveedor ya recibió. No hace falta modificar las reglas ni el preset por esta optimización.

**Vuelve a publicar todo `firestore.rules`** para permitir posts con video que no sean reels. No hacen falta índices adicionales ni cambios en Cloudinary. En Expo Go recarga el proyecto y permite el acceso a cámara y, al grabar, micrófono cuando lo pida el sistema. Si el permiso de cámara quedó bloqueado, el editor permite abrir los ajustes del dispositivo. `app.json` habilita cámara y micrófono y sus mensajes de iOS: una APK/IPA o development build anterior necesita recompilarse para incorporar estos permisos; una recarga de JavaScript no cambia el manifiesto de un binario ya instalado.

En Android se guarda temporalmente el borrador local antes de abrir la cámara/galería. Si el sistema destruye la actividad, al volver a abrir el mismo tipo de editor se consulta `getPendingResultAsync` para recuperar el resultado. El borrador está separado por cuenta, caduca en una hora y no se publica automáticamente. Esta recuperación depende de que Android conserve el resultado pendiente.

Las pruebas automatizadas comprueban permisos con un adaptador simulado, capturas web con archivos de prueba, cancelación, vista previa y publicación contra emuladores de Firebase. La configuración nativa se revisa con `expo config --type introspect`. Hay que probar la cámara real y el audio en un teléfono físico; las pruebas de navegador y la exportación de bundles no prueban el hardware.

### Perfiles, seguidores y seguidos

El perfil propio y los perfiles visitados comparten portada, avatar, biografía, contadores y tarjetas de contenido. Los contadores son **Cortes**, **Siguiendo** y **Seguidores**; los dos últimos abren sus listas. En tu perfil conservas la pestaña privada **Guardados**. En perfiles ajenos se muestran **Cortes**, **Reels** y **Reposts**, sin guardados ni controles de edición. Cada persona de una lista permite abrir su perfil y seguirla o dejar de seguirla, salvo la propia cuenta.

**Vuelve a publicar todo `firestore.rules`**. Las relaciones `accounts/{uid}/following/{otroUid}` pasan a ser legibles para cuentas autenticadas, mientras que solo su dueño puede crearlas o borrarlas. Los guardados, preferencias y notificaciones mantienen sus reglas privadas. Las listas incluyen las relaciones anteriores sin migrar documentos ni volver a seguir a nadie. No requieren índices adicionales ni un plan de pago.

Mientras un perfil o lista tiene el foco, se escucha el grupo de colecciones `following` y se derivan ambos sentidos de las relaciones a partir de las rutas existentes. Al salir de esa pantalla se detiene esa escucha. Las filas se muestran por páginas de 20 y cargan los perfiles correspondientes. Este esquema sirve a la comunidad escolar pequeña; una comunidad grande necesitaría un índice inverso para consultar los seguidores de cada cuenta sin cargar todas las relaciones.

Para probar: B y C siguen a A; A debe mostrar dos seguidores, y B debe poder abrir esa lista desde el perfil de A. Abre C desde la lista, síguela y comprueba los contadores desde C. Al dejar de seguir a una cuenta, se actualizan listas y contadores. B nunca debe ver los guardados privados de A.

### Reposts con publicación original dentro

Un repost crea una entrada de `posts` a nombre de la persona que comparte, con `originalPostId` apuntando al post original. Aparece en el inicio, en Siguiendo cuando se sigue a quien comparte, en sus publicaciones y en REPOSTS. El recuadro interior conserva el autor original y abre su publicación o reel; no copia el texto ni el archivo de medios. Si el original se elimina, muestra que ya no está disponible.

La reacción y la entrada del repost se guardan o se retiran en la misma transacción. Borrar tu entrada desde los tres puntos también retira tu repost y conserva el original. Sus likes y comentarios pertenecen a la entrada de quien comparte; el contador de reposts corresponde al original. Repostear una entrada que ya es un repost apunta al original para evitar cadenas de recuadros.

**Vuelve a publicar todo `firestore.rules`** antes de probar. No requiere índices nuevos ni servicios de pago. Las reglas verifican la autoría del repost, la referencia original y la reacción activa. Al entrar a la app se convierten los reposts anteriores de esa cuenta que todavía tienen un original disponible, sin volver a enviar notificaciones; como antes no se guardaba la fecha del repost, esas entradas usan la fecha de conversión. Las cuentas deben abrir la versión actualizada para convertir sus reposts anteriores.

### Buscador y notificaciones

Para activar estas funciones en un proyecto ya creado, **vuelve a publicar todo `firestore.rules`**. No requieren índices compuestos nuevos: conservan los de `posts` y `stories` y usan índices automáticos para el resto.

El buscador acepta nombres y @usuarios, sin distinguir mayúsculas ni acentos. Muestra perfiles completados en `profiles`, aunque no tengan publicaciones; las cuentas que solo existen en Authentication todavía necesitan completar su perfil para tener nombre y usuario públicos. Las búsquedas con `#` mantienen el filtro de publicaciones cargadas. Para admitir perfiles anteriores sin migraciones ni un servicio de búsqueda de pago, consulta el directorio por páginas de 50 y filtra el texto; espera 300 ms al escribir y permite cargar más coincidencias. Está pensado para la comunidad pequeña del proyecto escolar: en una red grande convendría un índice de búsqueda dedicado para reducir lecturas. El directorio reciente de 100 perfiles usado para otras pantallas no limita esta búsqueda.

Las nuevas interacciones generan avisos privados en `accounts/{uid}/notifications/{id}`: seguidores, likes, comentarios y reposts. La acción y el aviso se guardan de forma atómica, y las reglas comprueban que el aviso corresponde a una interacción real del emisor sobre el destinatario. Solo el destinatario puede leer su bandeja. Likes, reposts y seguidores se agrupan por emisor y destino para evitar duplicados; una nueva activación actualiza su aviso. Los comentarios tienen un aviso por comentario. No se notifican acciones propias, guardados ni votos. Al retirar un like o dejar de seguir, se conserva el aviso histórico de la acción anterior.

El punto de la campana indica avisos sin leer entre los cargados. Al abrir la bandeja se guarda hasta qué aviso se leyó en `accounts/{uid}/preferences/notifications`, con un marcador que no retrocede si se usan varios dispositivos. La bandeja carga primero 30 avisos y permite cargar más. Los avisos se generan desde esta versión; no se reconstruyen automáticamente las interacciones anteriores.

Son notificaciones **dentro de CUT**, no avisos push del sistema operativo. No necesitan Cloud Functions, un servidor de pago ni activar Blaze. Se aplican las cuotas habituales de Firestore Spark.

Para probar: desde una cuenta A publica un corte; desde otra cuenta B busca a A, síguela, da like y comenta. A debe ver el punto de la campana y los avisos. Ábrelos, vuelve al inicio y recarga: el punto debe permanecer apagado hasta que llegue actividad nueva. B no debe recibir los avisos dirigidos a A.

| Ruta de Firestore                    | Contenido y acceso                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `profiles/{uid}`                     | Nombre, usuario, biografía, foto, portada y fechas. Lectura para cuentas autenticadas; escritura solo de su dueño. |
| `handles/{usuario}`                  | Reserva global del usuario; se actualiza junto con el perfil.                                                      |
| `posts/{postId}`                     | Autor real, texto, hashtag, URLs de medios, encuesta y fecha del servidor.                                         |
| `posts/{postId}/comments/{id}`       | Comentarios con autor autenticado y fecha.                                                                         |
| `reactions/{postId}_{uid}`           | Like, repost y voto de una cuenta. Solo esa cuenta puede modificarlos; el voto no se puede cambiar.                |
| `accounts/{uid}/saved/{postId}`      | Guardados privados de esa cuenta.                                                                                  |
| `accounts/{uid}/following/{otroUid}` | Relaciones públicas para cuentas autenticadas; solo el dueño puede seguir o dejar de seguir.                        |

En `stories/{storyId}` se guarda el autor, la fecha del servidor, la descripción y la URL de la foto o video. Solo su autor y las cuentas que lo siguen pueden leer estos documentos.

En el proveedor opcional Firebase Storage: `users/{uid}/{archivo}`. En Cloudinary: los medios aparecen en **Assets → Media Library**, carpeta `cut` si configuraste ese asset folder. No se guardan correos ni contraseñas en las colecciones públicas.

Para añadir contenido propio, crea una cuenta oficial y publica desde CUT. Los catálogos de categorías, anuncios o retos pueden añadirse después con una colección y su pantalla correspondiente; la app no muestra automáticamente colecciones arbitrarias que agregues en la consola.

## Datos anteriores y alcance

Las cuentas ya registradas se conservan. Los perfiles y publicaciones de la versión local **no se suben automáticamente**: permanecen en el almacenamiento anterior del teléfono. En el primer acceso a esta versión, completa el perfil compartido y vuelve a publicar lo que quieras compartir. Así no se publican archivos o borradores antiguos sin que lo decidas.

El feed carga primero 20 publicaciones y permite cargar más. Los perfiles tienen su propia consulta; abrir un enlace directo o un guardado recupera esa publicación aunque no esté en la página inicial. La búsqueda de publicaciones filtra el contenido cargado; la búsqueda de personas recorre los perfiles públicos por páginas. El directorio auxiliar de otras pantallas muestra los 100 perfiles actualizados más recientemente. Los likes, votos y comentarios se calculan desde documentos reales con listeners: es una base para una comunidad de prueba. Antes de un lanzamiento amplio conviene agregar agregados de servidor, un índice dedicado de búsqueda, moderación y límites contra spam. Las imágenes reemplazadas se conservan en el proveedor de medios; su limpieza automática queda pendiente. Mensajes y notificaciones push aún no están implementados.

Las historias se publican desde **TU HISTORIA**, con una foto o video y hasta 180 caracteres opcionales. Cada autor aparece una sola vez en la fila y el visor permite recorrer sus historias vigentes. Se muestran las propias y las de personas seguidas, ordenadas por actividad reciente; no se usan las fotos de todos los perfiles como historias. Su vigencia se calcula desde la fecha del servidor, con un temporizador que las retira al vencer y una comprobación al volver a la app. Las vistas se marcan durante la sesión. El vencimiento oculta las historias en la app; no borra sus documentos ni archivos del proveedor. No se configura TTL ni tareas de pago para este proyecto escolar.

## Si aparece un error

- **Permisos:** comprueba que pegaste y publicaste las reglas en el mismo proyecto que usa `.env.local`.
- **Índices:** espera a que el índice de `posts` termine de crearse.
- **Subida fallida:** revisa el nombre del bucket, plan Blaze, reglas de Storage y tamaño del archivo.
- **No carga el perfil:** confirma que existe Firestore `(default)` y que el dispositivo tiene internet. Usa **REINTENTAR**.
- **No abre el QR:** revisa compatibilidad de Expo Go, red y servidor de desarrollo. Eso es independiente de la base de datos.

## Alternativa con Firebase CLI

Después de crear Firestore y Storage, puedes desplegar reglas e índices desde tu equipo:

```sh
npx --yes firebase-tools login
npx --yes firebase-tools deploy --only "firestore:rules,firestore:indexes,storage" --project TU_PROJECT_ID
```

Este trabajo deja los archivos preparados; no ejecuta ese despliegue contra tu proyecto.

## Pruebas locales para desarrollo

Las pruebas usan el proyecto ficticio `demo-cut` y emuladores de Authentication, Firestore y Storage. Necesitas Java compatible con Firebase CLI y Chromium de Playwright:

```sh
npx playwright install chromium
npm run test:local
```

O inicia los emuladores por separado y ejecuta `npm run test:firebase` y `npm run test:e2e`:

```sh
npx --yes firebase-tools emulators:start --only auth,firestore,storage --project demo-cut
```

El entorno de Playwright ya apunta a `127.0.0.1`, con configuración ficticia. No usa `.env.local` para acceder a tu proyecto real. Las pruebas limpian únicamente los emuladores. El comando `npm run test:serve` por sí solo usa las variables del entorno; reserva la configuración de emuladores para pruebas y déjala vacía para compartir con Firebase real.
