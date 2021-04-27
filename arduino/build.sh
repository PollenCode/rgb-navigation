#!/bin/bash -e

arduino-cli compile --upload -b arduino:avr:uno -p /dev/ttyUSB0