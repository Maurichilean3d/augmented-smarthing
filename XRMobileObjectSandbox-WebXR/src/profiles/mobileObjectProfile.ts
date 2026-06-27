import { ObjectKind, TrackingMode, Vector3Like } from '../core/types';

export interface MobileObjectProfile {
  profileId: string;
  displayName: string;
  kind: ObjectKind;

  defaultTrackingMode: TrackingMode;
  planarYLocal: number;
  allowPacketToSwitchMode: boolean;

  modelKind: 'box' | 'sphere' | 'cylinder';
  modelScale: Vector3Like;
  modelLocalOffset: Vector3Like;
  dashboardLocalOffset: Vector3Like;
  uiEulerOffset: Vector3Like;

  imuMountEulerOffset: Vector3Like;
  imuWebXREulerOffset: Vector3Like;

  allowActuation: boolean;
  capabilities: string[];
  llmPersona: string;
}

export const genericProfile: MobileObjectProfile = {
  profileId: 'generic_object',
  displayName: 'Objeto móvil',
  kind: 'Generic',
  defaultTrackingMode: 'Free3D',
  planarYLocal: 0,
  allowPacketToSwitchMode: true,
  modelKind: 'box',
  modelScale: { x: 0.24, y: 0.12, z: 0.16 },
  modelLocalOffset: { x: 0, y: 0, z: 0 },
  dashboardLocalOffset: { x: 0.35, y: 0.25, z: 0 },
  uiEulerOffset: { x: 0, y: 0, z: 0 },
  imuMountEulerOffset: { x: 0, y: 0, z: 0 },
  imuWebXREulerOffset: { x: 0, y: 0, z: 0 },
  allowActuation: false,
  capabilities: ['telemetry', 'pose', 'dashboard'],
  llmPersona: 'Eres un asistente de realidad mixta para un objeto móvil. Explicas estado, posición, rotación y acciones disponibles.'
};

export const hotwheelsProfile: MobileObjectProfile = {
  ...genericProfile,
  profileId: 'hotwheels',
  displayName: 'HotWheels XR',
  kind: 'ToyVehicle',
  modelKind: 'box',
  modelScale: { x: 0.32, y: 0.08, z: 0.16 },
  dashboardLocalOffset: { x: 0.38, y: 0.22, z: 0 },
  capabilities: ['telemetry', 'pose', 'dashboard', 'race_companion'],
  llmPersona: 'Eres un copiloto XR de un auto de juguete. Explicas posición, velocidad, batería, vibración y sugieres desafíos seguros dentro de la UI.'
};

export const blenderProfile: MobileObjectProfile = {
  ...genericProfile,
  profileId: 'blender',
  displayName: 'Juguera XR',
  kind: 'Appliance',
  modelKind: 'cylinder',
  modelScale: { x: 0.18, y: 0.32, z: 0.18 },
  defaultTrackingMode: 'Planar2D',
  planarYLocal: 0,
  allowActuation: false,
  capabilities: ['telemetry', 'pose', 'dashboard', 'recipe_ui'],
  llmPersona: 'Eres un asistente XR para una juguera en modo sandbox. Puedes explicar estado y recetas simuladas. No ejecutas acciones físicas sin confirmación humana ni controlador seguro externo.'
};
