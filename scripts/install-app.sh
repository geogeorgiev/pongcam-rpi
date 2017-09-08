#!/bin/sh

# Download and install app
cd $HOME
wget https://stage.pongcam.com/static/downloads/rpicam/latest.zip
unzip latest.zip && mv latest pongcam
cd pongcam/app && yarn install

# Setup cron
sudo touch /etc/cron.d/per_minute
echo "* * * * * root /home/pi/pongcam/scripts/cron_restart_server.sh" | sudo tee -a /etc/cron.d/per_minute > /dev/null
echo "* * * * * root /home/pi/pongcam/scripts/cron_reconnect_wifi.sh" | sudo tee -a /etc/cron.d/per_minute > /dev/null
sudo /etc/init.d/cron restart 

# Finish off
cd $HOME
echo "Installation is complete."

