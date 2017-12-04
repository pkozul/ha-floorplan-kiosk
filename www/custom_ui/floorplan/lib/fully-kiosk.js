/*
  Floorplan Fully Kiosk for Home Assistant
  Version: 1.0.7.32
  By Petar Kozul
  https://github.com/pkozul/ha-floorplan
*/

'use strict';

(function () {
  if (typeof window.FullyKiosk === 'function') {
    return;
  }

  class FullyKiosk {
    constructor(floorplan) {
      this.version = '1.0.7.32';

      this.floorplan = floorplan;
      this.authToken = (window.localStorage && window.localStorage.authToken) ? window.localStorage.authToken : '';

      this.fullyInfo = {};
      this.fullyState = {};
    }

    init() {
      this.logInfo('VERSION', `Fully Kiosk v${this.version}`);

      if (typeof fully === "undefined") {
        this.logInfo('FULLY_KIOSK', `Fully Kiosk is not running or not enabled. You can enable it via Settings > Other Settings > Enable Website Integration (PLUS).`);
        return;
      }

      let macAddress = fully.getMacAddress().toLowerCase();

      let device = this.floorplan.config && this.floorplan.config.fully_kiosk &&
        this.floorplan.config.fully_kiosk.find(x => x.address.toLowerCase() == macAddress);
      if (!device) {
        return;
      }

      if (!navigator.geolocation) {
        this.logInfo('FULLY_KIOSK', "Geolocation is not supported or not enabled.");
      }

      this.fullyInfo = this.getFullyInfo(device);

      this.updateFullyState();
      this.updateCurrentPosition();

      this.initAudio();
      this.addAudioEventHandlers();
      this.addFullyEventHandlers();
      this.subscribeHomeAssistantEvents();

      this.sendMotionState();
      this.sendPluggedState();
      this.sendScreensaverState();
      this.sendMediaPlayerState();
    }

    getFullyInfo(device) {
      return {
        motionBinarySensorEntityId: device.motion_sensor,
        pluggedBinarySensorEntityId: device.plugged_sensor,
        screensaverLightEntityId: device.screensaver_light,
        mediaPlayerEntityId: device.media_player,

        startUrl: fully.getStartUrl(),
        currentLocale: fully.getCurrentLocale(),
        ipAddressv4: fully.getIp4Address(),
        ipAddressv6: fully.getIp6Address(),
        macAddress: fully.getMacAddress(),
        wifiSSID: fully.getWifiSsid(),
        serialNumber: fully.getSerialNumber(),
        deviceId: fully.getDeviceId(),

        isMotionDetected: false,
        isScreensaverOn: false,
      };
    }

    updateFullyState() {
      this.fullyState.batteryLevel = fully.getBatteryLevel();
      this.fullyState.screenBrightness = fully.getScreenBrightness();
      this.fullyState.isScreenOn = fully.getScreenOn();
      this.fullyState.isPluggedIn = fully.isPlugged();
    }

    initAudio() {
      this.audio = new Audio();
      this.isAudioPlaying = false;
    }

    addAudioEventHandlers() {
      this.audio.addEventListener('play', this.onAudioPlay.bind(this));
      this.audio.addEventListener('playing', this.onAudioPlaying.bind(this));
      this.audio.addEventListener('pause', this.onAudioPause.bind(this));
      this.audio.addEventListener('ended', this.onAudioEnded.bind(this));
      this.audio.addEventListener('volumechange', this.onAudioVolumeChange.bind(this));
    }

    addFullyEventHandlers() {
      window['onFullyEvent'] = (e) => { window.dispatchEvent(new Event(e)); }

      window.addEventListener('fully.screenOn', this.onScreenOn.bind(this));
      window.addEventListener('fully.screenOff', this.onScreenOff.bind(this));
      window.addEventListener('fully.networkDisconnect', this.onNetworkDisconnect.bind(this));
      window.addEventListener('fully.networkReconnect', this.onNetworkReconnect.bind(this));
      window.addEventListener('fully.internetDisconnect', this.onInternetDisconnect.bind(this));
      window.addEventListener('fully.internetReconnect', this.onInternetReconnect.bind(this));
      window.addEventListener('fully.unplugged', this.onUnplugged.bind(this));
      window.addEventListener('fully.pluggedAC', this.onPluggedAC.bind(this));
      window.addEventListener('fully.pluggedUSB', this.onPluggedUSB.bind(this));
      window.addEventListener('fully.onScreensaverStart', this.onScreensaverStart.bind(this));
      window.addEventListener('fully.onScreensaverStop', this.onScreensaverStop.bind(this));
      window.addEventListener('fully.onBatteryLevelChanged', this.onBatteryLevelChanged.bind(this));
      window.addEventListener('fully.onMotion', this.onMotion.bind(this));
      window.addEventListener('fully.onMovement', this.onMovement.bind(this));
      window.addEventListener('fully.onIBeacon', this.onIBeacon.bind(this));

      fully.bind('screenOn', 'onFullyEvent("fully.screenOn");')
      fully.bind('screenOff', 'onFullyEvent("fully.screenOff");')
      fully.bind('networkDisconnect', 'onFullyEvent("fully.networkDisconnect");')
      fully.bind('networkReconnect', 'onFullyEvent("fully.networkReconnect");')
      fully.bind('internetDisconnect', 'onFullyEvent("fully.internetDisconnect");')
      fully.bind('internetReconnect', 'onFullyEvent("fully.internetReconnect");')
      fully.bind('unplugged', 'onFullyEvent("fully.unplugged");')
      fully.bind('pluggedAC', 'onFullyEvent("fully.pluggedAC");')
      fully.bind('pluggedUSB', 'onFullyEvent("fully.pluggedUSB");')
      fully.bind('onScreensaverStart', 'onFullyEvent("fully.onScreensaverStart");')
      fully.bind('onScreensaverStop', 'onFullyEvent("fully.onScreensaverStop");')
      fully.bind('onBatteryLevelChanged', 'onFullyEvent("fully.onBatteryLevelChanged");')
      fully.bind('onMotion', 'onFullyEvent("fully.onMotion");') // Max. one per second
      fully.bind('onMovement', 'onFullyEvent("fully.onMovement");')
      fully.bind('onIBeacon', 'onFullyEvent("fully.onIBeacon", "$id1", "$id2", "$id3", $distance);')
    }

    onScreenOn() {
      this.logDebug('FULLY_KIOSK', 'Screen turned on');
    }

    onScreenOff() {
      this.logDebug('FULLY_KIOSK', 'Screen turned off');
    }

    onNetworkDisconnect() {
      this.logDebug('FULLY_KIOSK', 'Network disconnected');
    }

    onNetworkReconnect() {
      this.logDebug('FULLY_KIOSK', 'Network reconnected');
    }

    onInternetDisconnect() {
      this.logDebug('FULLY_KIOSK', 'Internet disconnected');
    }

    onInternetReconnect() {
      this.logDebug('FULLY_KIOSK', 'Internet reconnected');
    }

    onUnplugged() {
      this.logDebug('FULLY_KIOSK', 'Unplugged AC');
      this.fullyState.isPluggedIn = false;
      this.sendPluggedState();
    }

    onPluggedAC() {
      this.logDebug('FULLY_KIOSK', 'Plugged AC');
      this.fullyState.isPluggedIn = true;
      this.sendPluggedState();
    }

    onPluggedUSB() {
      this.logDebug('FULLY_KIOSK', 'Unplugged USB');
      this.logDebug('FULLY_KIOSK', 'Device plugged into USB');
    }

    onScreensaverStart() {
      this.fullyState.isScreensaverOn = true;
      this.logDebug('FULLY_KIOSK', 'Screensaver started');
      this.sendScreensaverState();
    }

    onScreensaverStop() {
      this.fullyState.isScreensaverOn = false;
      this.logDebug('FULLY_KIOSK', 'Screensaver stopped');
      this.sendScreensaverState();
    }

    onBatteryLevelChanged() {
      this.logDebug('FULLY_KIOSK', 'Battery level changed');
    }

    onMotion() {
      this.fullyState.isMotionDetected = true;
      this.logDebug('FULLY_KIOSK', 'Motion detected');
      this.sendMotionState();
    }

    onMovement() {
      this.logInfo('FULLY_KIOSK', 'Movement detected');
      this.updateCurrentPosition()
        .then(() => {
          this.sendMotionState();
        });
    }

    onIBeacon(e) {
      this.logInfo('FULLY_KIOSK', `iBeacon (${JSON.stringify(e)})`);
    }

    sendMotionState() {
      if (!this.fullyInfo.motionBinarySensorEntityId) {
        return;
      }

      clearTimeout(this.sendMotionStateTimer);
      let timeout = this.fullyState.isMotionDetected ? 5000 : 10000;

      let state = this.fullyState.isMotionDetected ? "on" : "off";
      this.sendState(`/api/states/${this.fullyInfo.motionBinarySensorEntityId}`, this.newPayload(state), () => {
        this.sendMotionStateTimer = setTimeout(() => {
          this.fullyState.isMotionDetected = false;
          this.sendMotionState();

          // Send other states as well
          this.sendPluggedState();
          this.sendScreensaverState();
          this.sendMediaPlayerState();
        }, timeout);
      });
    }

    sendPluggedState() {
      if (!this.fullyInfo.pluggedBinarySensorEntityId) {
        return;
      }

      let state = this.fullyState.isPluggedIn ? "on" : "off";
      this.sendState(`/api/states/${this.fullyInfo.pluggedBinarySensorEntityId}`, this.newPayload(state));
    }

    sendScreensaverState() {
      if (!this.fullyInfo.screensaverLightEntityId) {
        return;
      }

      let state = this.fullyState.isScreensaverOn ? "on" : "off";
      this.sendState(`/api/states/${this.fullyInfo.screensaverLightEntityId}`, this.newPayload(state));
    }

    newPayload(state) {
      this.updateFullyState();

      return {
        state: state,
        brightness: this.fullyState.screenBrightness,
        attributes: {
          volume_level: this.audio.volume,
          media_content_id: this.audio.src,
          address: this.fullyInfo.macAddress,
          mac_address: this.fullyInfo.macAddress,
          serial_number: this.fullyInfo.serialNumber,
          device_id: this.fullyInfo.deviceId,
          battery_level: this.fullyState.batteryLevel,
          screen_brightness: this.fullyState.screenBrightness,
          latitude: this.position && this.position.coords.latitude,
          longitude: this.position && this.position.coords.longitude,
          _isScreenOn: this.fullyState.isScreenOn,
          _isPluggedIn: this.fullyState.isPluggedIn,
          _isMotionDetected: this.fullyState.isMotionDetected,
          _isScreensaverOn: this.fullyState.isScreensaverOn,
        }
      };
    }

    onAudioPlay() {
      this.isAudioPlaying = true;
      this.sendMediaPlayerState();
    }

    onAudioPlaying() {
      this.isAudioPlaying = true;
      this.sendMediaPlayerState();
    }

    onAudioPause() {
      this.isAudioPlaying = false;
      this.sendMediaPlayerState();
    }

    onAudioEnded() {
      this.isAudioPlaying = false;
      this.sendMediaPlayerState();
    }

    onAudioVolumeChange() {
      this.sendMediaPlayerState();
    }

    sendMediaPlayerState() {
      if (!this.fullyInfo.mediaPlayerEntityId) {
        return;
      }

      let state = this.isAudioPlaying ? "playing" : "idle";
      this.sendState(`/api/fully_kiosk/media_player/${this.fullyInfo.mediaPlayerEntityId}`, this.newPayload(state));
    }

    /*  Functions */

    setScreenBrightness(brightness) {
      fully.setScreenBrightness(brightness);
    }

    startScreensaver() {
      this.logInfo('FULLY_KIOSK', `Starting screensaver`);
      fully.startScreensaver();
    }

    stopScreensaver() {
      this.logInfo('FULLY_KIOSK', `Stopping screensaver`);
      fully.stopScreensaver();
    }

    playTextToSpeech(text) {
      this.logInfo('FULLY_KIOSK', `Playing text-to-speech: ${text}`);
      fully.textToSpeech(text);
    }

    playMedia(mediaUrl) {
      this.audio.src = mediaUrl;

      this.logInfo('FULLY_KIOSK', `Playing media: ${this.audio.src}`);
      this.audio.play();
    }

    pauseMedia() {
      this.logInfo('FULLY_KIOSK', `Pausing media: ${this.audio.src}`);
      this.audio.pause();
    }

    setVolume(level) {
      this.audio.volume = level;
    }

    sendState(url, payload, onSuccess) {
      let options = {
        type: 'POST',
        url: url,
        headers: { "X-HA-Access": this.authToken },
        data: JSON.stringify(payload),
        success: function (result) {
          this.logDebug('FULLY_KIOSK', `Posted state: ${url} ${JSON.stringify(payload)}`);
          if (onSuccess) {
            onSuccess();
          }
        }.bind(this),
        error: function (error) {
          this.handleError(new URIError(`Error posting state: ${url}`));
        }.bind(this)
      };

      jQuery.ajax(options);
    }

    subscribeHomeAssistantEvents() {
      /*
      this.floorplan.hass.connection.subscribeEvents((event) => {
      },
        'state_changed');
      */

      this.floorplan.hass.connection.subscribeEvents((event) => {
        if (this.fullyInfo.screensaverLightEntityId && (event.data.domain === 'light')) {
          if (event.data.service_data.entity_id.toString() === this.fullyInfo.screensaverLightEntityId) {
            switch (event.data.service) {
              case 'turn_on':
                this.startScreensaver();
                break;

              case 'turn_off':
                this.stopScreensaver();
                break;
            }

            let brightness = event.data.service_data.brightness;
            if (brightness) {
              this.setScreenBrightness(brightness);
            }
          }
        }
        else if (this.fullyInfo.mediaPlayerEntityId && (event.data.domain === 'media_player')) {
          let targetEntityId;
          let serviceEntityId = event.data.service_data.entity_id;

          if (Array.isArray(serviceEntityId)) {
            targetEntityId = serviceEntityId.find(entityId => (entityId === this.fullyInfo.mediaPlayerEntityId));
          }
          else {
            targetEntityId = (serviceEntityId === this.fullyInfo.mediaPlayerEntityId) ? serviceEntityId : undefined;
          }

          if (targetEntityId) {
            switch (event.data.service) {
              case 'play_media':
                this.playMedia(event.data.service_data.media_content_id);
                break;

              case 'media_play':
                this.playMedia();
                break;

              case 'media_pause':
              case 'media_stop':
                this.pauseMedia();
                break;

              case 'volume_set':
                this.setVolume(event.data.service_data.volume_level);
                break;

              default:
                this.logWarning('FULLY_KIOSK', `Service not supported: ${event.data.service}`);
                break;
            }
          }
        }

        /*
        if ((event.data.domain === 'tts') && (event.data.service === 'google_say')) {
          if (this.fullyInfo.mediaPlayerEntityId === event.data.service_data.entity_id) {
            this.logDebug('FULLY_KIOSK', 'Playing TTS using Fully Kiosk');
            this.playTextToSpeech(event.data.service_data.message);
          }
        }
        */
      },
        'call_service');
    }

    /* Geolocation */

    updateCurrentPosition() {
      if (!navigator.geolocation) {
        this.logInfo('FULLY_KIOSK', "Geolocation is not supported by your browser");
        return Promise.resolve(undefined);
      }

      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.logInfo('FULLY_KIOSK', `Current location: latitude: ${position.coords.latitude}, longitude: ${position.coords.longitude}`);
            this.position = position;
            resolve(position);
          },
          (err) => {
            this.logError('FULLY_KIOSK', 'Unable to retrieve location');
            reject(err);
          });
      })
    }

    /* Errors / logging */

    handleError(message) {
      this.floorplan.handleError(message);
    }

    logError(area, message) {
      this.floorplan.logError(message);
    }

    logWarning(area, message) {
      this.floorplan.logWarning(area, message);
    }

    logInfo(area, message) {
      this.floorplan.logInfo(area, message);
    }

    logDebug(area, message) {
      this.floorplan.logDebug(area, message);
    }
  }

  window.FullyKiosk = FullyKiosk;
}).call(this);
