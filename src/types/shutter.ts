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
