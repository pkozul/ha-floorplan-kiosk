"""
Support for HTTP room presence detection.

For more details about this platform, please refer to the documentation at
https://home-assistant.io/components/sensor.http_room/
"""
import asyncio
import logging
import json
from datetime import timedelta

from aiohttp.web_exceptions import HTTPInternalServerError

from homeassistant.components.http import HomeAssistantView

import voluptuous as vol

import homeassistant.helpers.config_validation as cv
from homeassistant.components.sensor import PLATFORM_SCHEMA
from homeassistant.const import (
    CONF_NAME, CONF_TIMEOUT, STATE_NOT_HOME, ATTR_ID, ATTR_LATITUDE, ATTR_LONGITUDE)
from homeassistant.core import callback
from homeassistant.helpers.entity import Entity
from homeassistant.util import dt, slugify


_LOGGER = logging.getLogger(__name__)

DEPENDENCIES = ['http']

ATTR_DEVICE_ID = 'device_id'
ATTR_DISTANCE = 'distance'
ATTR_ROOM = 'room'
ATTR_UUID = 'uuid'
ATTR_MAJOR = 'major'
ATTR_MINOR = 'minor'

CONF_DEVICE_ID = 'device_id'
CONF_AWAY_TIMEOUT = 'away_timeout'

DEFAULT_AWAY_TIMEOUT = 0
DEFAULT_NAME = 'Room Sensor'
DEFAULT_TIMEOUT = 5

PLATFORM_SCHEMA = PLATFORM_SCHEMA.extend({
    vol.Required(CONF_DEVICE_ID): cv.string,
    vol.Required(CONF_TIMEOUT, default=DEFAULT_TIMEOUT): cv.positive_int,
    vol.Optional(CONF_AWAY_TIMEOUT,
                 default=DEFAULT_AWAY_TIMEOUT): cv.positive_int,
    vol.Optional(CONF_NAME, default=DEFAULT_NAME): cv.string
})



@asyncio.coroutine
def async_setup_platform(hass, config, async_add_devices, discovery_info=None):
    """Set up HTTP room Sensor."""
    sensor = HttpRoomSensor(
        config.get(CONF_NAME),
        config.get(CONF_DEVICE_ID),
        config.get(CONF_TIMEOUT),
        config.get(CONF_AWAY_TIMEOUT)
    )

    async_add_devices([sensor])

    hass.http.register_view(sensor)


class HttpRoomSensor(HomeAssistantView, Entity):
    """Representation of a room sensor that is updated via HTTP."""
    """View to handle Room Presence HTTP requests."""

    url = '/api/room_presence/{device_id}'

    def __init__(self, name, device_id, timeout, consider_home):
        """Initialize the sensor."""
        self._state = STATE_NOT_HOME
        self._name = name
        self._device_id = slugify(device_id).upper()
        self._timeout = timeout
        self._consider_home = \
            timedelta(seconds=consider_home) if consider_home \
            else None
        self._distance = None
        self._uuid = None
        self._major = None
        self._minor = None
        self._latitude = None
        self._longitude = None
        self._updated = None

    def update_state(self, device_id, room, distance, uuid, major, minor, latitude, longitude):
        """Update the sensor state."""
        self._state = room
        self._distance = distance
        self._uuid = uuid
        self._major = major
        self._minor = minor
        self._latitude = latitude
        self._longitude = longitude
        self._updated = dt.utcnow()
        _LOGGER.info('Updated device presence: %s', device_id)

        self.async_schedule_update_ha_state()

    def message_received(self, device):
        if device.get(CONF_DEVICE_ID) == self._device_id:
            if self._distance is None or self._updated is None:
                self.update_state(**device)
            else:
                # update if:
                # device is in the same room OR
                # device is closer to another room OR
                # last update from other room was too long ago
                timediff = dt.utcnow() - self._updated
                if device.get(ATTR_ROOM) == self._state \
                        or device.get(ATTR_DISTANCE) < self._distance \
                        or timediff.seconds >= self._timeout:
                    self.update_state(**device)

    @asyncio.coroutine
    def post(self, request, device_id):
        """Handle a Room Presence message."""
        hass = request.app['hass']

        data = yield from request.json()

        room = data.get(ATTR_ROOM)
        distance = data.get(ATTR_DISTANCE)
        uuid = data.get(ATTR_UUID)
        major = data.get(ATTR_MAJOR)
        minor = data.get(ATTR_MINOR)
        latitude = data.get(ATTR_LATITUDE)
        longitude = data.get(ATTR_LONGITUDE)

        device = {
            ATTR_DEVICE_ID: device_id,
            ATTR_ROOM: room,
            ATTR_DISTANCE: distance,
            ATTR_UUID: uuid,
            ATTR_MAJOR: major,
            ATTR_MINOR: minor,
            ATTR_LATITUDE: latitude,
            ATTR_LONGITUDE: longitude
        }

        _LOGGER.info('Received presence data: %s', device)

        try:
            self.message_received(device)
            return self.json([])

        except ValueError:
            raise HTTPInternalServerError

    @property
    def name(self):
        """Return the name of the sensor."""
        return self._name

    @property
    def device_state_attributes(self):
        """Return the state attributes."""
        return {
            ATTR_DISTANCE: self._distance,
            ATTR_UUID: self._uuid,
            ATTR_MAJOR: self._major,
            ATTR_MINOR: self._minor,
            ATTR_LATITUDE: self._latitude,
            ATTR_LONGITUDE: self._longitude
        }

    @property
    def state(self):
        """Return the current room of the entity."""
        return self._state

    def update(self):
        """Update the state for absent devices."""
        if self._updated \
                and self._consider_home \
                and dt.utcnow() - self._updated > self._consider_home:
            self._state = STATE_NOT_HOME


def _parse_update_data(topic, data):
    """Parse the room presence update."""
    parts = topic.split('/')
    room = parts[-1]
    device_id = slugify(data.get(ATTR_ID)).upper()
    distance = data.get(ATTR_DISTANCE)
    parsed_data = {
        ATTR_DEVICE_ID: device_id,
        ATTR_ROOM: room,
        ATTR_DISTANCE: distance
    }
    return parsed_data
