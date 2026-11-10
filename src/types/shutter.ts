export type ShutterAction = 'up' | 'down' | 'stop' | 'set_position';

export interface ShutterChannel {
  id: string;
  name: string;
  room: string;
  position: number; // 0 = fully closed, 100 = fully open
  state: 'idle' | 'opening' | 'closing' | 'stopped';
  travelTimeSeconds: number; // travel duration in seconds for realistic calibration
  freeboxNodeId?: number;
  freeboxEndpointId?: number;
  freeboxUpEndpointId?: number;
  freeboxDownEndpointId?: number;
  freeboxStopEndpointId?: number;
  tuyaDeviceId?: string;
  tuyaLocalKey?: string;
  tuyaIp?: string;
  tuyaVersion?: string;
  tuyaControlDps?: number;
  tuyaPositionDps?: number;
}

export interface DiscoveredTuyaDevice {
  id: string;
  ip: string;
  version: string;
  productKey?: string;
}

export interface DiscoveredFreeboxTile {
  nodeId: number;
  label: string;
  type: string;
  action?: string;
  endpointId?: number;
  upEndpointId?: number;
  downEndpointId?: number;
  stopEndpointId?: number;
  positionEndpointId?: number;
  currentValue?: number;
  rawEndpoints?: Array<{
    id: number;
    name: string;
    label: string;
    ui_class?: string;
    value_type?: string;
    value?: any;
  }>;
}

export interface ShutterDevice {
  id: string;
  name: string;
  type: 'loratap_double' | 'loratap_single';
  room: string;
  channels: ShutterChannel[];
}

export interface FreeboxStatus {
  connected: boolean;
  boxModel?: string;
  apiVersion?: string;
  authenticated: boolean;
  appToken?: string;
  simulated: boolean;
}

export interface PiSystemInfo {
  device: string;
  display: string;
  touchController: string;
  interface: string;
  resolution: string;
  cpuTemperature: string;
  throttling: string;
  uptime: number;
}

export interface Scenario {
  id: string;
  name: string;
  icon: string;
  description: string;
  action: 'all_open' | 'all_close' | 'preset_50' | 'preset_cinema' | 'preset_night';
  targetPosition: number;
}
