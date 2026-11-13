# Fotos y reels sin activar Blaze

Para este proyecto escolar, conserva Firebase **Spark** para Authentication y Firestore. El código usa **Cloudinary** para las fotos, portadas y videos cuando `EXPO_PUBLIC_MEDIA_PROVIDER=cloudinary` (también es la opción predeterminada).

El plan **Free de Image and Video APIs** de Cloudinary es gratuito y no pide tarjeta, con límites de uso. Elige ese producto, no una prueba temporal de Assets/DAM. [Planes oficiales](https://cloudinary.com/pricing).

## Configuración

1. Crea una cuenta Free en [Cloudinary](https://cloudinary.com/users/register_free).
2. En la consola de **Image and Video APIs**, copia tu **Cloud name**.
3. Ve a **Settings → Upload → Upload presets** y crea un preset con un nombre nuevo.
4. Selecciona **Signing mode: Unsigned**. Conserva los identificadores aleatorios y deja **Disallow public ID** apagado, porque la app envía un identificador único.
5. En **Optimize and Deliver → Allowed formats**, añade `jpg,jpeg,png,webp,mp4,mov`. Deja **Format** vacío para no forzar la conversión de imágenes y videos a un único formato. Pulsa **Save**. No hay un campo de tamaño máximo por preset: la app valida 10 MB para imágenes y 50 MB para videos, y Cloudinary aplica los límites de archivo de la cuenta. Para la presentación usa videos cortos. [Opciones del formulario](https://cloudinary.com/documentation/dam_admin_upload_presets) y [límites de los presets](https://cloudinary.com/documentation/upload_presets).
6. Completa estos valores en `.env.local`, sin borrar los de Firebase:

```dotenv
EXPO_PUBLIC_MEDIA_PROVIDER=cloudinary
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=tu_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=nombre_de_tu_preset
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=
```

Solo necesitamos el **Cloud name** y el **Upload preset**. No uses el **API Secret** dentro de la app ni lo compartas.

7. **Vuelve a publicar el contenido completo de [firestore.rules](./firestore.rules) en Firestore → Reglas.** Se añadió permiso para guardar las URLs `https://res.cloudinary.com/...` en los perfiles y publicaciones. El índice que ya creaste sigue sirviendo.
8. Reinicia Expo con `npx expo start --clear` (o agrega `--tunnel` si necesitas compartir entre redes).
9. Desde una cuenta publica una foto o un reel pequeño y comprueba desde otra cuenta que aparece. Las imágenes de perfil y portada usan el mismo proveedor.

No tienes que crear un bucket de Firebase Storage ni activar Blaze. El campo `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` puede conservarse: no se utiliza para nuevas subidas mientras esté seleccionado Cloudinary.

## Alcance de esta opción escolar

Las cuentas y la autoría de las publicaciones siguen protegidas por Firebase. El contenido multimedia de Cloudinary es público por URL. Un preset **unsigned** permite subir a cualquiera que conozca su nombre y no verifica el inicio de sesión de Firebase. Configura los formatos permitidos en el preset. La validación de tamaño de la app puede eludirse con peticiones externas; Cloudinary aplica sus límites de cuenta, no un límite de tamaño configurable por preset. Es una opción para una demostración controlada; al terminar puedes desactivar el preset y borrar los archivos de prueba en Media Library. Para publicar abiertamente la app habría que añadir subidas firmadas desde un servidor que valide las cuentas. [Documentación de subidas unsigned](https://cloudinary.com/documentation/upload_images#unauthenticated_requests).

No se borran automáticamente de Cloudinary los archivos reemplazados, de publicaciones/reels/historias eliminados desde CUT o cuya publicación falle después de subir. Puedes eliminarlos desde su consola, en **Assets → Media Library → cut**. El borrado desde CUT retira el documento de Firestore y su aparición en la app; una URL directa al archivo sigue funcionando hasta eliminarlo también del proveedor. El plan Free tiene límites de almacenamiento, transferencia y procesamiento; controla el consumo en Dashboard y mantén el plan Free.

## Validación de desarrollo

`tests/cloudinary.spec.ts` comprueba las subidas de imagen y video, las URLs compartidas y la conservación del borrador si falla la subida. Usa respuestas simuladas de Cloudinary y emuladores reales de Firebase; no consume el plan Free. Con los emuladores iniciados, ejecuta en PowerShell:

```powershell
$env:CUT_TEST_CLOUDINARY = '1'
npx playwright test tests/cloudinary.spec.ts
```

Las pruebas habituales seleccionan explícitamente el proveedor Firebase para comprobar también su compatibilidad. La subida a una cuenta Cloudinary real debe probarse después de configurar su cloud name y preset.
