# XRMobileObjectSandbox WebXR

Adaptación del sandbox Unity + Meta XR a una app WebXR con Three.js, Vite y un bridge Node.

## Qué se mantiene del proyecto Unity

| Unity original | WebXR equivalente |
| --- | --- |
| `XR Origin / OVRCameraRig` | `THREE.WebGLRenderer` con `renderer.xr.enabled = true` y botón AR/VR |
| `WorldCalibrationRoot` | `worldCalibrationRoot: THREE.Group` |
| `FixedAnchor_A..D` | `UwbAnchorRegistry` + grupos `FixedAnchor_A..D` |
| `MetaSpatialAnchorBinding` | `WebXRSpatialAnchorBinding` + fallback de anchors estáticos |
| `UdpTelemetryReceiver` | `backend/server.js`: UDP ESP32 → WebSocket browser |
| `TrackingFusionController` | `src/tracking/trackingFusionController.ts` |
| `TrilaterationSolver` | `src/tracking/trilaterationSolver.ts` |
| `PoseSmoother` | `src/tracking/poseSmoother.ts` |
| `MobileObjectProfile` | `src/profiles/mobileObjectProfile.ts` |
| `MobileObjectDashboard` | dashboard DOM + billboard 3D canvas |
| `LLMContextBuilder` / providers | `src/llm/*` + `/llm` backend sandbox |
| `ActuatorCommandRouter` | `src/actuation/*` + `/actuator` backend sandbox |
| `TelemetrySimulatorUdpSender` | `backend/telemetry-simulator.js` o `?demo=1` en browser |

## Estructura

```txt
XRMobileObjectSandbox-WebXR/
├── backend/
│   ├── server.js                    # UDP → WebSocket + /llm + /actuator
│   └── telemetry-simulator.js        # simulador UDP Node
├── esp32/
│   └── esp32_webxr_mobile_sandbox_sender.ino
├── samples/
│   ├── sample_packet_free3d.json
│   └── sample_packet_planar2d.json
├── src/
│   ├── actuation/
│   ├── core/
│   ├── demo/
│   ├── llm/
│   ├── networking/
│   ├── profiles/
│   ├── tracking/
│   ├── ui/
│   └── webxr/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Prueba rápida sin hardware

```bash
npm install
npm run dev
```

Abre:

```txt
http://localhost:5173/?demo=1
```

Esto usa telemetría simulada dentro del navegador, sin UDP ni ESP32.

## Prueba con bridge UDP → WebSocket

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run sim:udp
```

Abre:

```txt
http://localhost:5173
```

El flujo es:

```txt
ESP32 o simulador UDP → backend/server.js udp:7777 → WebSocket /telemetry → WebXR app
```

## En Quest / visor XR

WebXR necesita ejecutarse en contexto seguro. Para desarrollo local, `localhost` sirve en el mismo equipo; para abrir desde Quest normalmente usa HTTPS o port forwarding.

```bash
npm run web:https
npm run backend
```

Luego abre la URL HTTPS de tu máquina desde el visor. También puedes usar Chrome DevTools port forwarding si estás probando desde Android/Quest.

## Packet de telemetría

La app espera el mismo shape JSON del proyecto Unity:

```json
{
  "objectId":"mobile_object_001",
  "profileId":"hotwheels",
  "trackingMode":"Free3D",
  "timestampMs":12345678,
  "ranges":[
    {"anchorId":"A","meters":1.20,"quality":1.0},
    {"anchorId":"B","meters":1.55,"quality":1.0},
    {"anchorId":"C","meters":1.35,"quality":1.0},
    {"anchorId":"D","meters":1.70,"quality":1.0}
  ],
  "imu":{"x":0.0,"y":0.2,"z":0.0,"w":0.98},
  "accel":{"x":0.0,"y":0.0,"z":9.81},
  "gyro":{"x":0.0,"y":0.0,"z":0.0},
  "vibration":0.21,
  "battery":87,
  "speed":0,
  "state":"sandbox"
}
```

## Modo 2D y 3D

- `Planar2D`: usa 3 anchors y resuelve X/Z. Y sale de `profile.planarYLocal`.
- `Free3D`: usa 4 anchors o más. Los anchors no deben ser coplanares.

## Dónde cambiar perfiles

Edita:

```txt
src/profiles/mobileObjectProfile.ts
```

Cambia `profileId`, `displayName`, `kind`, `modelKind`, offsets de IMU, capacidades y `llmPersona`.

## Dónde poner modelos 3D

Esta versión usa primitivas (`box`, `sphere`, `cylinder`) para que el scaffold funcione de inmediato. Para GLB/GLTF:

1. Pon el modelo en `public/models/`.
2. Agrega `GLTFLoader` desde `three/addons/loaders/GLTFLoader.js`.
3. Cambia `MobileObjectRuntime.createModel()` por carga GLTF async.

## Nota de seguridad de actuation

`/actuator` y `SimulatedActuatorBridge` son sandbox. Para hardware real, mantén el control físico fuera de la app WebXR y usa un controlador externo con validaciones, interlocks y confirmación humana.
