# CUT — esqueleto móvil

Adaptación del feed y los reels del mockup de Stitch a Expo SDK 58, React Native y Expo Router. Conserva el estilo oscuro, los acentos verdes, los bordes de sticker y las fuentes Anton y Space Grotesk. El diseño prioriza teléfonos y centra el contenido en pantallas grandes. Los textos principales usan 16–17 px, las etiquetas 12–15 px y los títulos 23–44 px.

## Ejecutar

```sh
npm install
npx expo start
```

Abre la app con Expo Go compatible con SDK 58 o con un development build. Para la vista previa web:

```sh
npm run web
```

## Recorridos funcionales

- Acceso: una pantalla con las opciones **Iniciar sesión** y **Registrarme**, conectada a Firebase Authentication por correo y contraseña. El registro tiene dos pasos: crear la cuenta con confirmación de contraseña y personalizar el perfil antes de entrar. Los errores aparecen en español.
- Personalización inicial: nombre y usuario obligatorios; foto, portada y biografía opcionales, con vista previa y selección desde la galería. El perfil se guarda antes de abrir el inicio. Si una cuenta no ha completado su perfil, vuelve a este paso al iniciar sesión o abrir enlaces interiores. Los perfiles ya personalizados entran directamente.
- Todas las pantallas interiores requieren una sesión de Firebase. Ajustes permite cerrarla.
- Inicio: búsqueda por nombre, @usuario, contenido y hashtag; resultados de personas con acceso a su perfil y botón de seguir. La búsqueda de personas consulta perfiles registrados aunque no tengan publicaciones o estén fuera del directorio reciente. Para ti / Siguiendo y filtros. La fila de historias muestra solo cuentas seguidas con historias vigentes de las últimas 24 horas, además del acceso a las historias propias.
- Historias: foto o video con descripción opcional, publicación independiente del feed y reels, visor y navegación entre historias. Se ocultan al cumplir 24 horas, también si el visor está abierto. Las reglas solo permiten leer las historias propias o de cuentas seguidas.
- Crear cortes: texto, fotos y videos de la galería o de la cámara, emojis, hashtags y encuestas con dos opciones. El icono de imagen abre la galería y el de cámara permite **Tomar foto** o **Grabar video**; las capturas tienen vista previa y solo se suben al pulsar publicar. Las historias admiten foto/video; el editor de reels solo video. Los videos de Nuevo corte se reproducen dentro de su tarjeta en el inicio y el perfil, con controles y sin reproducción automática.
- Subidas: las fotos grandes se reducen hasta 1920 píxeles y se comprimen antes de enviarlas. Se muestra el progreso disponible, el procesamiento y el guardado; cancelar la subida conserva el borrador. Los videos se envían con su tamaño original, por lo que su duración de subida depende del peso y de la conexión.
- Interacciones: me gusta, comentarios, reposts, guardados y compartir mediante el sistema.
- Reposts: entrada a nombre de quien comparte con la publicación original dentro, conservando su autoría. Aparece en el feed y el perfil; quitar o eliminar el repost conserva el original. Si se borra el original, el recuadro indica que ya no está disponible.
- Reels: comienza vacío. Puedes publicar videos de la galería, reproducirlos, pausarlos, comentarlos y guardarlos.
- Eliminar: los tres puntos de tus publicaciones, reels e historias permiten borrarlos tras confirmar. Desaparecen de CUT para las demás cuentas. Los archivos de Cloudinary se limpian desde su consola; no se eliminan automáticamente del proveedor.
- Perfil: diseño compartido entre el propio y los visitados, con portada, avatar, biografía y contadores de cortes, seguidos y seguidores. Los dos últimos abren listas públicas con acceso a perfiles y botones de seguir. Los guardados y la edición solo aparecen para el dueño; los perfiles ajenos muestran cortes, reels y reposts. Las relaciones anteriores siguen funcionando sin migración.
- Notificaciones dentro de la app: nuevos seguidores, likes, comentarios y reposts de otras cuentas, sincronizados en tiempo real. La campana indica actividad sin leer; al abrirla se conserva el estado de lectura entre dispositivos. Cada aviso abre el perfil o la publicación correspondiente. No se generan avisos por acciones propias.

## Datos y alcance

La app comienza con cero publicaciones, reels, creadores, cuentas seguidas, guardados y notificaciones. Cada persona personaliza su propio perfil antes de entrar, sin nombres, fotos ni ubicaciones precargadas. Nombre y usuario son obligatorios; la biografía y las imágenes son opcionales.

Las cuentas se crean y validan en Firebase Authentication. El SDK conserva la sesión con AsyncStorage en Android/iOS y almacenamiento local del navegador en web. La app no guarda contraseñas ni crea sesiones de demostración. Al iniciar, restaura la sesión antes de decidir qué rutas mostrar.

Los perfiles, publicaciones, comentarios, likes, reposts, votos, guardados y personas seguidas usan Cloud Firestore. Las fotos y videos se suben a Cloudinary Free antes de guardar la publicación o el perfil; Firebase Storage es opcional. Para el proyecto escolar sin facturación, sigue [CLOUDINARY.md](./CLOUDINARY.md). Los autores usan el UID real de Authentication; el contenido de la comunidad se sincroniza entre cuentas y dispositivos. Los guardados conservan su acceso privado; seguidores y seguidos son visibles para cuentas autenticadas.

Los nombres de usuario se normalizan a minúsculas y se reservan mediante transacciones para impedir duplicados. Las reglas incluidas protegen propietarios, campos, votos e historias de cuentas seguidas. La app muestra errores de conexión y ofrece reintentar. No hay mensajes ni notificaciones push implementados.

El contenido de la versión local anterior (`cut-social-v2:<userId>`) permanece en el dispositivo y no se publica automáticamente. Las cuentas de Authentication siguen sirviendo. Hay que completar el nuevo perfil compartido y volver a publicar el contenido que se quiera compartir. Los medios seleccionados se preparan en el dispositivo y se suben al guardar; una ruta local nunca se comparte como publicación.

La app no incluye fotos ni videos de demostración. Los archivos de `tests/fixtures` solo se usan para probar subidas; sus fuentes están en `tests/fixtures/SOURCES.md`. Las tipografías están en assets/fonts. Los archivos originales del ZIP están en references y se usan solamente como referencia visual.

## Configurar Firebase

1. En Firebase registra una app **web** para obtener el `firebaseConfig` del SDK JavaScript. Este SDK también permite usar la app móvil con Expo Go: [guía de Expo](https://docs.expo.dev/guides/using-firebase/).
2. En **Authentication → Proveedores de acceso**, habilita **Correo electrónico/contraseña**.
3. Copia `.env.example` a `.env.local` y completa sus campos con los valores correspondientes del `firebaseConfig`. Para este equipo, `.env.local` ya apunta al proyecto `cut-utch`. El archivo está excluido de Git y debe configurarse en cualquier otro equipo o entorno de compilación.
4. Reinicia el servidor con `npx expo start --clear` y abre **Registrarme** para crear tu primera cuenta. Aparecerá en **Authentication → Usuarios** de Firebase. Después completa tu perfil y pulsa **Guardar y entrar**.

Las variables `EXPO_PUBLIC_*` se incluyen en la app. Solo contienen la configuración pública cliente; nunca coloques claves de administrador ni cuentas de servicio en ellas. Si falta la configuración esencial, el acceso y el registro permanecen deshabilitados.

**Para activar el contenido compartido sigue [FIREBASE.md](./FIREBASE.md)**: crear Firestore, publicar las reglas, crear el índice y revisar `.env.local`. Para fotos y videos sin tarjeta ni Blaze, configura [Cloudinary Free](./CLOUDINARY.md). Vuelve a publicar `firestore.rules` después de este cambio para admitir las URLs de Cloudinary. Firebase Storage sigue siendo una alternativa opcional con facturación; no es necesario para el proyecto escolar.

## Validación

```sh
npm run lint
npm run typecheck
npx playwright install chromium
npm run test:local
npx expo export --platform web
npx expo export --platform ios --platform android
```

Las pruebas usan Firebase real contra emuladores locales del proyecto ficticio `demo-cut`, sin modificar el proyecto real. Comprueban reglas de acceso, reserva concurrente de usuarios, contenido entre dos sesiones independientes, guardados privados, registro, perfil, fotos, video y diseño móvil. `npm run test:local` inicia los emuladores y ejecuta las pruebas de Firebase y Playwright; requiere Java. Si ya tienes los emuladores abiertos, ejecuta `npm run test:firebase` y `npm run test:e2e`. Para usar un Chromium existente, define `PLAYWRIGHT_CHROMIUM_EXECUTABLE` con la ruta a su ejecutable. Las pruebas exportan la app web y ejecutan un servidor local en el puerto 8082. Para abrir una vista previa usa `npm run test:serve`.

Los bundles móviles se pueden comprobar sin generar ni editar directorios nativos. La compilación del bundle no sustituye una prueba en un dispositivo físico.
