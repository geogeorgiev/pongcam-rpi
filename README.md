# PONGCAM RPi

A software for transforming a Raspberry Pi into a live video streaming camera. It provides the tools for communicating with a signaling server and sending video to a media server. Future work might include config app that helps users set up the the underlying device. 

## Install Raspbian image

### Put the image on an SD card (official instructions)
- Mac OS: https://www.raspberrypi.org/documentation/installation/installing-images/mac.md
- Linux: https://www.raspberrypi.org/documentation/installation/installing-images/linux.md
- Windows: https://www.raspberrypi.org/documentation/installation/installing-images/windows.md


Example in Linux: 

1. Format with fdisk (diskutil in Mac):

	sudo fdisk /dev/<name not partition> # /dev/sdd instead of /dev/sdd1

In fdisk use `o` to creare DOS partition table, `d` to delete partitions, `n` create new partition, `t` change partition type, `w` save and exit.

2. Writing image to device in Linux (bs=1M vs bs=1m in Mac OS)

	sudo dd if=<image path> of=<device (not partition) e.g. /dev/sdd > bs=1M conv=fsync 


### Mount and change
​
1. Mount partitions by:
	fdisk -u -l <image path, can be device>
	# multiply start * 512 (e.g. 4194304) of the partition in interest
	sudo mount -o loop,offset=<start * 512> /dev/<disk> <mount point>
2. Enter the boot partition  
3. Add an empty file named `ssh` to /boot partition to enable ssh remote access.
4. Change config.txt on /boot by adding:

	start_x=1 (essential for camera)
	gpu_mem=256 (optional, video memory)     


### Scripts
- wpa-supplicant - create with `sudo wpa_passphrase ssid pass > /etc/wpa_supplicant/wpa_supplicant.conf`
- interfaces - copy the file to `/etc/network/interfaces`

Some useful commands regarding networking:

​	iwconfig
	sudo /etc/init.d/networking restart
	sudo service dhcpcd restart
	sudo ifdown -- force wlan0
	sudo ifup wlan0
	ifconfig


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

