#!/bin/sh

sudo su
apt update && apt dist-upgrade -y

# Install packages
apt install -y \
vim curl build-essential python-pip git gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-ugly gstreamer1.0-plugins-bad
ln -s /usr/bin/gst-launch-1.0 /usr/local/bin/gst-launch-1.0

# Camera /dev/video0
echo "bcm2835-v4l2" >> /etc/modules

# Node js
cd $HOME && wget http://node-arm.herokuapp.com/node_latest_armhf.deb 
dpkg -i node_latest_armhf.deb

# Finish off
echo "System packages and configs done. Rebooting ..."

sleep 5

sudo reboot
