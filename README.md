# SCMP Móvil

App de campo del **SCMP**. El alumno llega al pozo,
la app toma su GPS, le muestra los pozos del proyecto en un mapa, captura las mediciones y la
foto, y las sube al servidor **aunque no haya señal en ese momento**.

Todo lo demás (proyectos, asignación de pozos, reportes, laboratorio) se queda en la web.

## Estado

| | |
|---|---|
| Fase actual | **4**: captura sin señal (SQLite, cola y envío automático). Fases 1 a 4 sin probar aún en un celular |
| Tecnología | React Native + Expo + TypeScript, solo Android, se distribuye como APK |
| Backend | Laravel 12 en `~/Documentos/Proyectos/pc/SCMP/SCMP`, API `/api/v1` con Sanctum |

Avance detallado en [`docs/FASES.md`](docs/FASES.md). **Para verla en el celular con Expo Go: [`COMO_PROBAR.md`](COMO_PROBAR.md).**

## Estructura

```
src/
  app/                 pantallas (Expo Router: cada archivo es una ruta)
    _layout.tsx        sesión, splash y rutas protegidas (login ↔ app)
    login.tsx          correo + contraseña, y código 2FA si la cuenta lo tiene
    (app)/index.tsx    mis proyectos
    (app)/unirse.tsx   unirse con clave de acceso
    (app)/proyecto/[id]/index.tsx              mapa, lista de pozos y panel de posición
    (app)/proyecto/[id]/mapa-sin-conexion.tsx  descargar el mapa del proyecto
    (app)/proyecto/[id]/captura.tsx            nueva captura en 3 pasos (o corregir una de la cola)
    (app)/capturas.tsx                         capturas en el teléfono: por corregir, por enviar, enviadas
    (app)/perfil.tsx   mi cuenta y cerrar sesión
  api/                 cliente axios (token, 401) y llamadas a /api/v1
  sesion/              token y usuario en SecureStore (zustand)
  almacen/             copia local de catálogos para trabajar sin señal (SQLite)
  db/                  SQLite: interfaz, migraciones, expo-sqlite
  cola/                cola de envío, política de reintentos y sincronizador
  geo/                 UTM y distancias (sin red)
  mapa/                estilos, descarga del .pmtiles, GeoJSON
  ubicacion/           GPS (expo-location)
  captura/             modelo, validación de límites, foto, borrador y errores del servidor
  ui/                  tema (colores de la web) y componentes grandes para campo
  config.ts            URL del servidor (EXPO_PUBLIC_API_URL)
```

## Cómo correrla

1. Backend accesible en la red local (ver abajo) y `.env.local` con su IP:
   ```bash
   cp .env.example .env.local   # editar EXPO_PUBLIC_API_URL
   npm install
   ```
2. **Rápido, con Expo Go**: `npx expo start --go` y escanear el QR. Funciona todo menos el mapa
   (guía completa en [`COMO_PROBAR.md`](COMO_PROBAR.md)).
   **Con mapa**: instalar una vez un **development build** (MapLibre trae código nativo que Expo
   Go no tiene):
   - **En la nube**: `npx eas-cli@latest login` y
     `npx eas-cli@latest build -p android --profile development`; instalar el APK que genera.
   - **Local**: Android Studio (SDK + `adb`), celular con depuración USB y `npx expo run:android`.
3. `npx expo start` y abrir la app instalada: los cambios de código se ven al instante.
4. Para el mapa sin conexión, en el backend: `php artisan mapas:generar --todos`
   (requiere el ejecutable `pmtiles`, ver `docs/FASES.md`).

APK para repartir: `npx eas-cli@latest build -p android --profile preview`.

Revisión antes de dar algo por terminado: `npm run typecheck`, `npm run lint` y `npm test`.

## Documentación

| Archivo | Qué tiene |
|---|---|
| [`docs/DISENO.md`](docs/DISENO.md) | Diseño completo: alcance, arquitectura, pantallas, decisiones, plan por fases |
| [`docs/API.md`](docs/API.md) | Contrato de la API v1 que consume la app (endpoints, respuestas, errores, flujo 2FA) |
| [`docs/FASES.md`](docs/FASES.md) | Avance por fase: qué se hizo, qué falta, pendientes |
| [`docs/REPORTE_MAPA_LIMITES_DATUM.md`](docs/REPORTE_MAPA_LIMITES_DATUM.md) | Investigación: mapa sin conexión (Protomaps), límites de parámetros, datum |

`DISENO.md` y el reporte son copia de `SCMP/SCMP/docs/`, tomada al cerrar la fase 0; de aquí en
adelante se actualizan aquí.

## Backend para desarrollo

```bash
cd ~/Documentos/Proyectos/pc/SCMP/SCMP
php artisan migrate
php artisan serve --host=0.0.0.0 --port=8000   # el celular entra por http://<IP-de-la-PC>:8000
```

Cuentas de prueba (contraseña `12345678`, ver `database/seeders/DatabaseSeeder.php`):
alumno `LuisRogriguezRico@uaslp.mx` (tiene 2FA activo) y profesor `drAntoinioCardona@uaslp.mx`.
