'use strict';

if (typeof window.FullyKiosk !== 'function') {
  class FullyKiosk {
    constructor(floorplan) {
      this.floorplan = floorplan;
    }

    init() {
      if (typeof fully === "undefined") {
        //this.floorplan.error("Fully Kiosk not detected");
        return;
      }

      let macAddress = fully.getMacAddress().toLowerCase();

      let device = this.floorplan.config.devices.find(x => x.address.toLowerCase() == macAddress);
      if (!device)
        return;

      this.subscribeEvents();

      this.kioskInfo = {
        binarySensorEntityId: device.entities.find(x => x.startsWith('binary_sensor.')),
        mediaPlayerEntityId: device.entities.find(x => x.startsWith('media_player.')),
        startUrl: fully.getStartUrl(),
        currentLocale: fully.getCurrentLocale(),
        ipAddressv4: fully.getIp4Address(),
        ipAddressv6: fully.getIp6Address(),
        macAddress: fully.getMacAddress(),
        wifiSSID: fully.getWifiSsid(),
        serialNumber: fully.getSerialNumber(),
        deviceId: fully.getDeviceId(),
        batteryLevel: fully.getBatteryLevel(),
        screenBrightness: fully.getScreenBrightness(),
        isScreenOn: fully.getScreenOn(),
        motionState: 'off',
      };

      this.addEventHandlers();

      this.sendKioskState(this.kioskInfo.motionState);
    }

    addEventHandlers() {
      window['onFullyEvent'] = (e) => { window.dispatchEvent(new Event(e)); }

      window.addEventListener('fully.screenOn', this.onFullyScreenOn.bind(this));
      window.addEventListener('fully.screenOff', this.onFullyScreenOff.bind(this));
      window.addEventListener('fully.networkDisconnect', this.onFullyNetworkDisconnect.bind(this));
      window.addEventListener('fully.networkReconnect', this.onFullyNetworkReconnect.bind(this));
      window.addEventListener('fully.internetDisconnect', this.onFullyInternetDisconnect.bind(this));
      window.addEventListener('fully.internetReconnect', this.onFullyInternetReconnect.bind(this));
      window.addEventListener('fully.unplugged', this.onFullyUnplugged.bind(this));
      window.addEventListener('fully.pluggedAC', this.onFullyPluggedAC.bind(this));
      window.addEventListener('fully.pluggedUSB', this.onFullyPluggedUSB.bind(this));
      window.addEventListener('fully.onMotion', this.onFullyMotion.bind(this));

      fully.bind('screenOn', 'onFullyEvent("fully.screenOn");')
      fully.bind('screenOff', 'onFullyEvent("fully.screenOff");')
      fully.bind('networkDisconnect', 'onFullyEvent("fully.networkDisconnect");')
      fully.bind('networkReconnect', 'onFullyEvent("fully.networkReconnect");')
      fully.bind('internetDisconnect', 'onFullyEvent("fully.internetDisconnect");')
      fully.bind('internetReconnect', 'onFullyEvent("fully.internetReconnect");')
      fully.bind('unplugged', 'onFullyEvent("fully.unplugged");')
      fully.bind('pluggedAC', 'onFullyEvent("fully.pluggedAC");')
      fully.bind('pluggedUSB', 'onFullyEvent("fully.pluggedUSB");')
      fully.bind('onMotion', 'onFullyEvent("fully.onMotion");') // Max. one per second
    }

    onFullyScreenOn() {
      this.debug('Screen turned on');
    }

    onFullyScreenOff() {
      this.debug('Screen turned off');
    }

    onFullyNetworkDisconnect() {
      this.debug('Network disconnected');
    }

    onFullyNetworkReconnect() {
      this.debug('Network reconnected');
    }

    onFullyInternetDisconnect() {
      this.debug('Internet disconnected');
    }

    onFullyInternetReconnect() {
      this.debug('Internet reconnected');
    }

    onFullyUnplugged() {
      this.debug('Device unplugged');
    }

    onFullyPluggedAC() {
      this.debug('Deviced plugged into AC power');
    }

    onFullyPluggedUSB() {
      this.debug('Device plugged into USB');
    }

    onFullyMotion() {
      this.sendKioskState(true);
    }

    sendKioskState(isOn) {
      clearTimeout(this.sendKioskStateTimer);

      if (!this.kioskInfo.binarySensorEntityId)
        return;

      this.kioskInfo.motionState = isOn ? 'on' : 'off';
      let timeout = isOn ? 5000 : 10000;

      let authToken = (window.localStorage && window.localStorage.authToken) ? window.localStorage.authToken : '';

      let payload = { "state": this.kioskInfo.motionState, "mac_address": fully.macAddress };

      jQuery.ajax({
        type: 'POST',
        url: `/api/states/${this.kioskInfo.binarySensorEntityId}`,
        headers: { "X-HA-Access": authToken },
        data: JSON.stringify(payload),
        success: function (result) {
          //      this.debug(`Sent state: ${this.kioskInfo.motionState}`);
          //      this.debug(`Setting timeout: ${timeout}`);
          this.sendKioskStateTimer = setTimeout(() => { this.sendKioskState(false); }, timeout);
        }.bind(this),
        error: function (err) {
          //      this.error('Error sending state');
          this.sendKioskStateTimer = setTimeout(() => { this.sendKioskState(false); }, timeout);
          this.debug('4');
          this.error('Could not set kiosk state');
        }.bind(this)
      });
    }

    playTextToSpeech(text) {
      fully.textToSpeech(text);
    }

    playMedia(mediaUrl) {
      let audio = new Audio(mediaUrl);
      audio.play();
    }

    subscribeEvents() {
      this.floorplan.hass.connection.subscribeEvents((event) => {
        if ((event.data.domain === 'tts') && (event.data.service === 'google_say')) {
          if (this.kioskInfo && (this.kioskInfo.mediaPlayerEntityId === event.data.service_data.entity_id)) {
            this.debug('Playing TTS using Fully Kiosk');
            this.playTextToSpeech(event.data.service_data.message);
          }
        }
        else if ((event.data.domain === 'media_player') && (event.data.service === 'play_media')) {
          if (this.kioskInfo && (this.kioskInfo.mediaPlayerEntityId === event.data.service_data.entity_id[0])) {
            this.debug('Playing TTS using Google Say (mp3 file from Home Assistant)');
            this.playMedia(event.data.service_data.media_content_id);
          }
        }
      },
        'call_service');
    }

    debug(message) {
      this.floorplan.debug(message);
    }

    error(message) {
      this.floorplan.error(message);
    }
  }

  window.FullyKiosk = FullyKiosk;
}
