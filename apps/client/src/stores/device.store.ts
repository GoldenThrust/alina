import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  emptyEntities, removeOne, selectAll, setAll, upsertOne, type Entities,
} from "../utils/entities";

interface DeviceState {
  devices: Entities<ConnectedDevice>;

  setDevices: (devices: ConnectedDevice[]) => void;
  connect: (device: ConnectedDevice) => void;
  disconnect: (deviceId: string) => void;
  clear: () => void;
}

export const useDeviceStore = create<DeviceState>()((set) => ({
  devices: emptyEntities(),

  setDevices: (devices) => set({ devices: setAll(devices) }),
  connect: (device) => set((s) => ({ devices: upsertOne(s.devices, device) })),
  disconnect: (deviceId) => set((s) => ({ devices: removeOne(s.devices, deviceId) })),
  clear: () => set({ devices: emptyEntities() }),
}));

export const selectDevices = (s: DeviceState) => selectAll(s.devices);
export const selectDevicesOfType = (type: DeviceType) => (s: DeviceState) =>
  selectAll(s.devices).filter((d) => d.type === type);
export const selectHasRing = (s: DeviceState) =>
  selectAll(s.devices).some((d) => d.type === "RING");

export const useDevices = () => useDeviceStore(useShallow(selectDevices));
