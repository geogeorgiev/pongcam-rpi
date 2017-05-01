FROM resin/rpi-raspbian:latest

# Update
RUN apt-get update && apt-get upgrade -y 

# Gstreamer
RUN apt-get install -y \
gstreamer1.0-tools \
gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-ugly \
gstreamer1.0-plugins-bad gstreamer1.0-libav

# Basic packages
RUN apt-get install -y \
build-essential wget curl git zip

RUN wget http://node-arm.herokuapp.com/node_latest_armhf.deb && \
dpkg -i node_latest_armhf.deb
RUN rm node_latest_armhf.deb
RUN npm install nodemon -g
RUN mkdir /data
ADD app/package.json /data/package.json
WORKDIR /data
RUN npm install
ENV NODE_PATH /data/node_modules

RUN mkdir /app
WORKDIR /app

EXPOSE 8444

RUN apt-get install -y \
python3-dev python3-pip python3-numpy

RUN apt-get install -y libjpeg-dev zlib1g-dev libtiff5-dev libfreetype6-dev \
liblcms2-dev libwebp5 libpng12-dev libopenjpeg-dev \
libopenjpeg5 

ADD app/cv/requirements.txt /data/requirements.txt
WORKDIR /data
RUN pip3 install -r requirements.txt

# OpenCV
#RUN apt-get install -y \
#libopencv-dev python-opencv python-dev python-pip

# start on pi on boot
# su pi -c 'node /home/pi/server.js < /dev/null &'
RUN apt-get clean

# No screen
RUN ln /dev/null /dev/raw1394
WORKDIR /app