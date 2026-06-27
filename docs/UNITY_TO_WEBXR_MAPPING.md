# Mapeo Unity → WebXR

## Jerarquía equivalente

Unity:

```txt
XR Origin / OVRCameraRig
WorldCalibrationRoot
├── FixedAnchor_A
├── FixedAnchor_B
├── FixedAnchor_C
├── FixedAnchor_D
└── MobileObjectRoot
    ├── ModelParent
    ├── IMUOrientationEmpty
    └── DashboardParent
```

WebXR/Three.js:

```txt
scene
└── worldCalibrationRoot: THREE.Group
    ├── FixedAnchor_A: THREE.Group
    ├── FixedAnchor_B: THREE.Group
    ├── FixedAnchor_C: THREE.Group
    ├── FixedAnchor_D: THREE.Group
    └── targetRoot: THREE.Group
        └── MobileObjectRuntime.root
            ├── ModelParent: THREE.Group
            └── DashboardParent: THREE.Group
```

## Cambios clave

1. El navegador no abre sockets UDP crudos para la app normal, así que el receptor UDP vive en Node.
2. WebXR requiere un gesto de usuario para entrar a la sesión; por eso se agrega `ARButton` o `VRButton`.
3. Spatial Anchors persistentes dependen del runtime/navegador. El scaffold deja un binding abstracto y funciona con anchors estáticos.
4. Los prefabs de Unity pasan a factories/modelos Three.js.
5. `ScriptableObject` pasa a objetos TypeScript serializables.
