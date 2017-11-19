"""
Support for Floorplan Speaker

"""
import voluptuous as vol

from homeassistant.components.media_player import (
    SUPPORT_PLAY_MEDIA,
    SUPPORT_VOLUME_SET,
    PLATFORM_SCHEMA,
    MediaPlayerDevice)
from homeassistant.const import (
    CONF_NAME, STATE_IDLE, STATE_PLAYING)
import homeassistant.helpers.config_validation as cv

import logging

import os
import re
import sys
import time

DEFAULT_NAME = 'Floorplan Speaker'
DEFAULT_VOLUME = 1.0

SUPPORT_FLOORPLAN_SPEAKER = SUPPORT_PLAY_MEDIA | SUPPORT_VOLUME_SET

CONF_ADDRESS = 'address'
CONF_VOLUME = 'volume'

PLATFORM_SCHEMA = PLATFORM_SCHEMA.extend({
    vol.Optional(CONF_NAME, default=DEFAULT_NAME): cv.string,
    vol.Optional(CONF_VOLUME, default=DEFAULT_VOLUME):
        vol.All(vol.Coerce(float), vol.Range(min=0, max=1)),
})

_LOGGER = logging.getLogger(__name__)

def setup_platform(hass, config, add_devices, discovery_info=None):
    name = config.get(CONF_NAME)
    address = config.get(CONF_ADDRESS)
    volume = float(config.get(CONF_VOLUME))

    add_devices([FloorplanSpeakerDevice(hass, name, address, volume)])
    return True

class FloorplanSpeakerDevice(MediaPlayerDevice):
    def __init__(self, hass, name, address, volume):
        self._hass = hass
        self._name = name
        self._player_state = STATE_IDLE
        self._address = address
        self._volume = volume

    @property
    def name(self):
        return self._name

    @property
    def state(self):
        return self._player_state

    @property
    def address(self):
        return self._address

    @property
    def volume_level(self):
        return self._volume

    def set_volume_level(self, volume):
        self._volume = volume

    def play_media(self, media_type, media_id, **kwargs):
        _LOGGER.info('play_media: %s', media_id)
