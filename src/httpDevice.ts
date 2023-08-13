import { Service, PlatformAccessory, CharacteristicValue } from "homebridge";
import { HttpPlatform } from "./platform";
import axios from "axios";

export interface DeviceInfo {
  name: string;
  url: string;
  on: { method: HTTPMethod; path: string };
  off: { method: HTTPMethod; path: string };
  status: { method: HTTPMethod; path: string };
}
enum HTTPMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  CONNECT = "CONNECT",
  PATCH = "PATCH",
}
export class SimpleHttpSwitch {
  private service: Service;
  private switchState = {
    On: false,
  };

  constructor(
    private readonly platform: HttpPlatform,
    private readonly accessory: PlatformAccessory<DeviceInfo>
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.Manufacturer,
        "Default-Manufacturer"
      )
      .setCharacteristic(this.platform.Characteristic.Model, "Default-Model")
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        "Default-Serial"
      );
    this.service =
      this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch);
    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.context.name
    );
    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below
  }

  async setOn(value: CharacteristicValue) {
    if (value) {
      const onUrl = this.accessory.context.url + this.accessory.context.on.path;
      this.platform.log.debug(
        JSON.stringify({
          turnON: value,
          method: this.accessory.context.on.method.toString(),
          url: onUrl,
        })
      );
      try {
        await axios.request<null>({
          method: this.accessory.context.on.method.toString(),
          url: onUrl,
        });
      } catch (e) {
        this.platform.log.error(
          JSON.stringify({
            err: e,
            message: "error turning on device " + this.accessory.context.name,
          })
        );
        throw new this.platform.api.hap.HapStatusError(
          this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE
        );
      }
    } else {
      const offUrl =
        this.accessory.context.url + this.accessory.context.off.path;
      this.platform.log.debug(
        JSON.stringify({
          turnON: value,
          method: this.accessory.context.off.method.toString(),
          url: offUrl,
        })
      );
      try {
        await axios.request<null>({
          method: this.accessory.context.off.method.toString(),
          url: offUrl,
        });
      } catch (e) {
        this.platform.log.error(
          JSON.stringify({
            err: e,
            message: "error turning off device " + this.accessory.context.name,
          })
        );
        throw new this.platform.api.hap.HapStatusError(
          this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE
        );
      }
    }
    this.switchState.On = value as boolean;
  }

  async getOn(): Promise<CharacteristicValue> {
    try {
      const statusUrl =
        this.accessory.context.url + this.accessory.context.status.path;
      const res = await axios.request<string | object>({
        method: this.accessory.context.status.method.toString(),
        url: statusUrl,
      });
      this.platform.log.debug(
        JSON.stringify({
          statusRes: res.data,
          method: this.accessory.context.status.method.toString(),
          url: statusUrl,
        })
      );
      if (JSON.stringify(res.data).includes("on")) {
        this.switchState.On = true;
      } else if (JSON.stringify(res.data).includes("off")) {
        this.switchState.On = false;
      }
      return this.switchState.On;
    } catch (e) {
      this.platform.log.error(
        JSON.stringify({
          err: e,
          message: "error getting status from " + this.accessory.context.name,
        })
      );
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE
      );
    }
  }
}
