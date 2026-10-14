# CUT — prototipo móvil funcional

Adaptación del feed y los reels del mockup de Stitch a Expo SDK 57, React Native y Expo Router. Conserva el estilo oscuro, los acentos verdes, los bordes de sticker y las fuentes Anton y Space Grotesk. El diseño prioriza teléfonos y centra el contenido en pantallas grandes. Los textos principales usan 16–17 px, las etiquetas 12–15 px y los títulos 23–44 px.

## Ejecutar

```sh
npm install
npx expo start
```

Abre la app con Expo Go compatible con SDK 57 o con un development build. Para la vista previa web:

```sh
npm run web
```

## Recorridos funcionales

- Inicio: búsqueda por contenido, creador y hashtag; Para ti / Siguiendo; filtros; tendencias desplegables; historias de ejemplo y perfiles de creadores.
- Crear cortes: texto, fotos de la galería, emojis, hashtags y encuestas con dos opciones.
- Interacciones: me gusta, comentarios, reposts, guardados y compartir mediante el sistema.
- Reels: video real, reproducción / pausa, sonido, progreso, seguimiento, comentarios y guardados. Puedes publicar videos de la galería.
- Perfil: publicaciones propias, guardados, reposts y edición de nombre, usuario, foto y biografía.
- Ajustes: gestionar creadores seguidos. Notificaciones: actividad de demostración con navegación a su contenido.

## Datos y alcance

Es un prototipo local: no hay autenticación, servidor, mensajes a otros usuarios ni notificaciones push. Los creadores y su actividad son ficticios. Publicaciones, comentarios, votos, perfil e interacciones persisten mediante AsyncStorage. Los medios propios se copian a documentos de la app en iOS / Android y se guardan en IndexedDB en web; eliminar los datos de la app o del navegador elimina ese contenido local.

Las fotos y el video iniciales están incluidos en assets/media. Sus fuentes están documentadas en assets/media/SOURCES.md. Las tipografías están en assets/fonts. Los archivos originales del ZIP están en references y se usan solamente como referencia visual.

## Validación

```sh
npm run lint
npm run typecheck
npx playwright install chromium
npm run test:e2e
npx expo export --platform web
npx expo export --platform ios --platform android
```

Las pruebas recorren búsqueda, navegación, publicación, comentarios, encuesta, edición de perfil, subida de fotos, persistencia y reproducción. Para usar un Chromium existente, define PLAYWRIGHT_CHROMIUM_EXECUTABLE con la ruta a su ejecutable. Las pruebas exportan la app web y ejecutan un servidor local en el puerto 8082. Para abrir esa misma vista previa manualmente usa npm run test:serve.

Los bundles móviles se pueden comprobar sin generar ni editar directorios nativos. La compilación del bundle no sustituye una prueba en un dispositivo físico.
