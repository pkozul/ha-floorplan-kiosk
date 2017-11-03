# ha-floorplan-kiosk
1) Update to the latest version of Floorplan w(with support for Fully Kiosk):

```
https://raw.githubusercontent.com/pkozul/ha-floorplan-kiosk/master/floorplan.yaml
```

2) For each Fully Kiosk device, create a binary sensor entity:

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

3) For each Fully Kiosk device, create a media player entity:

```
media_player:

  - platform: tts_floorplan_speaker
    name: Entry Kiosk

  - platform: tts_floorplan_speaker
    name: Bedroom Kiosk
```

4) In the floorplan configuration, create a `devices` section, and add each Fully Kiosk device to it. Make sure to specify the correct MAC address for each Fully Kiosk device.

```
      name: Floorplan
      image: /local/custom_ui/floorplan/floorplan.svg
      stylesheet: /local/custom_ui/floorplan/floorplan.css

      devices:

        - name: Entry Kiosk
          address: 88:71:e5:af:d6:12
          entities:
            - binary_sensor.entry_kiosk
            - media_player.entry_kiosk

        - name: Bedroom Kiosk
          address: 88:71:e5:af:d6:ad
          entities:
            - binary_sensor.bedroom_kiosk
            - media_player.bedroom_kiosk
```

5) Restart Home Assistant. The Fully Kiosk device should now be available as a binary sensor, and as a media player.

6) To test the TTS on the Fully Kiosk device, call the TTS play service:

```
service: tts.google_say
entity_id: media_player.entry_kiosk
data:
  message: 'May the Force be with you.'
```
