# ha-floorplan-kiosk
1) Update to the latest version of Floorplan (with support for Fully Kiosk) by copying the following file to the `www/custom_ui/floorplan` folder of Home Assistant:

```
https://raw.githubusercontent.com/pkozul/ha-floorplan-kiosk/master/floorplan.yaml
```

2) Copy Fully Kiosk library to the `www/custom_ui/floorplan/lib` folder of Home Assistant:

```
https://raw.githubusercontent.com/pkozul/ha-floorplan-kiosk/master/www/custom_ui/floorplan/lib/fully-kiosk.js
```

3) Copy the following file to the `custom_components/media_player` folder of Home Assistant:

```
https://raw.githubusercontent.com/pkozul/ha-floorplan-kiosk/master/custom_components/media_player/tts_floorplan_speaker.py
```

4) For each Fully Kiosk device, create a binary sensor entity:

```
binary_sensor: 

  - platform: mqtt
    state_topic: floorplan/kiosk/entry
    name: Entry Kiosk
    retain: true

  - platform: mqtt
    state_topic: floorplan/kiosk/bedroom
    name: Bedroom Kiosk
    retain: true
```

5) For each Fully Kiosk device, create a media player entity:

```
media_player:

  - platform: tts_floorplan_speaker
    name: Entry Kiosk

  - platform: tts_floorplan_speaker
    name: Bedroom Kiosk
```

6) In the floorplan configuration, enable Fully Kiosk support by adding `fully_kiosk:`. Then create a `devices` section, and add each Fully Kiosk device to it. Make sure to specify the correct MAC address for each Fully Kiosk device.

```
      name: Floorplan
      image: /local/custom_ui/floorplan/floorplan.svg
      stylesheet: /local/custom_ui/floorplan/floorplan.css

      warnings:
      debug:
      fully_kiosk:

      devices:

fully_kiosk:

  - name: Entry Kiosk
    address: 00:FC:8B:4A:D5:CF
    motion_sensor: binary_sensor.entry_kiosk_motion
    plugged_sensor: binary_sensor.entry_kiosk_plugged
    media_player: media_player.entry_kiosk
```

7) Restart Home Assistant. The Fully Kiosk device should now be available as a binary sensor, and as a media player.

8) To test the TTS on the Fully Kiosk device, call the TTS play service:

```
service: tts.google_say
entity_id: media_player.entry_kiosk
data:
  message: 'May the Force be with you.'
```
