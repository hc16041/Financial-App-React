# Actualizaciones de la app (Android / iOS)

La app usa **expo-updates** con el canal `preview`. El binario nativo debe
incluir `expo-updates`; los builds nuevos ya lo incluyen.

## Cambios de JS/TS, estilos, textos o pantallas (sin build nuevo)

```bash
npx eas-cli@latest update --channel preview --message "descripción del cambio"
```

La app busca la actualización al abrirse, la descarga y se reinicia sola.
Funciona igual en Android y en el iPhone instalado con SideStore/iloader.

## Cambios nativos (nuevo módulo, permisos, SDK, cámara, biometría, etc.)

### Android

```bash
npx eas-cli@latest build --profile preview --platform android
```

Instalar el APK nuevo encima del anterior. EAS mantiene la misma keystore y
los datos se conservan.

### iPhone

```bash
git push origin feat/ios-build
```

GitHub Actions genera un `.ipa` sin firmar. Descargarlo del run y abrirlo en
SideStore (o instalarlo con iloader). El certificado gratuito dura 7 días;
SideStore lo renueva en segundo plano con LocalDevVPN conectada.

## Configuración

- Canal: `preview` (`eas.json` y `app.json` → `updates.requestHeaders`).
- `runtimeVersion.policy`: `sdkVersion`. Si se sube de SDK de Expo, cambia el
  runtime y los binarios viejos dejan de recibir updates (correcto).
- Proyecto EAS: `1ba42b9c-02a8-4136-9944-90ea6b9cf76f`.
- El update solo aplica si el binario instalado tiene el mismo `runtimeVersion`.
