# App Android «Varita» (envoltorio nativo mínimo)

> Antes «Sello»: el equipo renombró la herramienta a Varita y el icono es el
> de la web (morado `#7F56D9` con la varita). Los PNG salen de `public/`
> (`icon-192.png` e `icon-maskable-512.png`), así que si la identidad cambia
> de nuevo basta copiarlos y reconstruir.

Existen dos formas de que «Varita» salga en la hoja de **Compartir** de Android:

1. **PWA instalada desde Chrome con Google Play Services completo**: Chrome
   genera una WebAPK (una app real) y registra el `share_target` del manifest.
   Es el camino normal, y el que seguirá casi cualquier teléfono del público.
2. **Esta app**: en teléfonos sin GMS completo (Huawei y otros), Chrome no
   puede generar la WebAPK e instala en modo degradado — un atajo que abre la
   web pero **nunca** aparece en Compartir, porque no es una app del sistema.
   Este envoltorio sí lo es: registra un intent `ACTION_SEND` de texto plano
   y no depende de Google para nada.

Instálala solo en los terminales donde el camino 1 no funcione. Es la misma
web de siempre: la app es una WebView a `https://build.barraca.house/sello-a/`
y, cuando llega un texto compartido, abre
`/api/compartir?text=…`, que aterriza en el verificador. No procesa ni
guarda nada: el análisis sigue siendo el de la PWA, con sus reglas.

## Instalar (demo)

1. Copia `Varita-v1.3.apk` al teléfono (WhatsApp, cable, Drive…).
2. Ábrelo desde el gestor de archivos. Android pedirá permiso para instalar
   de esa fuente: dalo (es un APK firmado por nosotros, sin Play Protect).
3. Busca «Varita» en el escritorio. Comparte un SMS → saldrá «Varita».
4. Si antes instalaste el atajo de Chrome/Brave o un APK anterior («Sello»),
   quítalo del escritorio y desinstálalo para no duplicar.

## Reconstruir

Hace falta JDK 17, `build-tools 34` y `android.jar` de la plataforma 34
(descargables de dl.google.com sin Android Studio):

```sh
aapt2 compile --dir res -o /tmp/res.zip
aapt2 link -o /tmp/base.apk -I android.jar --manifest AndroidManifest.xml \
  -R /tmp/res.zip --auto-add-overlay --min-sdk-version 23 \
  --target-sdk-version 34 --version-code 1 --version-name 1.0
javac -source 8 -target 8 -bootclasspath android.jar -classpath android.jar \
  -d /tmp/classes src/es/barraca/sello/MainActivity.java
d8 --release --lib android.jar --output /tmp/dexdir /tmp/classes/es/barraca/sello/*.class
zip -j /tmp/base.apk /tmp/dexdir/classes.dex
zipalign -f 4 /tmp/base.apk /tmp/aligned.apk
apksigner sign --ks sello-demo.keystore --ks-pass pass:sello2026 \
  --out Varita-v1.3.apk /tmp/aligned.apk
```

## Versiones

| APK | versionCode | qué cambia |
| --- | --- | --- |
| `Varita-v1.3.apk` | 4 | icono y nombre de Varita (antes «Sello») |
| `Sello-v1.2.apk` (histórico, en el log de git) | 3 | abre `/sello-a` sin barra |
| `Sello.apk` v1.0 (histórico) | 1 | primera versión |

Al compartir el nombre exacto del fichero evitamos la caché de raw.github:
cada versión lleva su nombre.

## Aviso sobre la firma

`sello-demo.keystore` (contraseña `sello2026`) es una clave de demo,
comprometida a propósito para que cualquiera pueda reconstruir el APK exacto
sin perder la firma. **No sirve para publicar en ninguna tienda** y así debe
quedar: si algún día esto sale del ámbito de la demo, se genera una clave
privada nueva y no se sube al repo.
