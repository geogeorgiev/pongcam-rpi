# PONGCAM RPI

A software for transforming a Raspberry Pi into a live video streaming camera. It provides the tools for communicating with a signaling server and sending video to a media server. Future work might include config app that helps users set up the the underlying device. 

## Install Raspbian image

### Put the image on an SD card (official instructions)
- Mac: https://www.raspberrypi.org/documentation/installation/installing-images/mac.md
- Linux: https://www.raspberrypi.org/documentation/installation/installing-images/linux.md
- Windows: https://www.raspberrypi.org/documentation/installation/installing-images/windows.md

### Scripts


## Dependencies

- Raspbian + Internet connection
- Gstreamer 1.0 + base, good and ugly plugins (and 'bad' if using the raspivid capture option)

## Install app

	cd pongcam
	yarn install


## Run

	cd pongcam
	node app.js  


## API-s

- Auth + models - HTTP REST. We use Django and its rest framework as a backend. For authentication we use OAuth 2.0, whereas the credentials are stored in `pongcam/config/credentials.json`.

- Signaling negotiation - WebSockets. We use Node JS for our signaling server while conforming to the API of the Kurento Media Server.


## Config

We use the `node-config`. By setting the `NODE_ENV` environment variable you can pick different config files (e.g. stage for stage.json). If NODE_ENV is not provided, the `default.json` file is used within the `pongcam/config` dir.


## Device

In the `crons` dir there are cron scripts helping out in keeping up the server and connectivity of the device in check. We use a `/etc/wpa_supplicant/wpa_supplicant.conf` for network settings, convenient also in a headless device setup. 


## Future work

- better documentation;
- tests;
- motion capture;
- config app for setting up among others the WiFi of the device;
- better device utilization. 

