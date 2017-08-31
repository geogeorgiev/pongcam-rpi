#!/bin/bash

sudo apt update && sudo apt upgrade -y
sudo apt install -y \
vim curl yarn build-essential python-pip git gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-ugly gstreamer1.0-plugins-bad

#sudo modprobe bcm2835-v4l2 # to load it and create /dev/video0
sudo su
echo "bcm2835-v4l2" >> /etc/modules && exit

cd $HOME && wget http://node-arm.herokuapp.com/node_latest_armhf.deb 
sudo dpkg -i node_latest_armhf.deb 
sudo ln -s /usr/bin/gst-launch-1.0 /usr/local/bin/gst-launch-1.0
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
# sudo npm install pm2 -g

cd $HOME
wget https://stage.pongcam.com/static/downloads/rpicam/latest.zip
unzip latest.zip && mv latest pongcam
cd pongcam/app && yarn install

echo "*/1 * * * * /home/pi/pongcam/scripts/cron_restart_server.sh" >> /etc/crontab
echo "*/1 * * * * /home/pi/pongcam/scripts/cron_reconnect_wifi.sh" >> /etc/crontab

echo "Installation is complete. Please restart the device."
