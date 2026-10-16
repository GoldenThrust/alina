import { BaseRepository } from "./base.repository";
import type { ConnectedDevice, DeviceType, NewConnectedDevice } from "./types";

export class ConnectedDeviceRepository extends BaseRepository<
  ConnectedDevice,
  NewConnectedDevice
> {
  protected readonly model = "ConnectedDevice";

  listForUser(userId: string, type?: DeviceType) {
    return this.findMany(type ? { userId, type } : { userId });
  }

  findByExternalId(userId: string, externalId: string) {
    return this.findOne({ userId, externalId });
  }

  /** Connects a device, or updates its name and type if already connected. */
  async connect(data: NewConnectedDevice): Promise<ConnectedDevice> {
    const existing = await this.findByExternalId(data.userId, data.externalId);
    if (!existing) return this.create(data);
    return (
      (await this.update(existing.id, { name: data.name, type: data.type })) ??
      existing
    );
  }

  disconnect(userId: string, externalId: string) {
    return this.deleteWhere({ userId, externalId });
  }
}
