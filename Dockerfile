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
build-essential wget curl git zip python-pip vim

RUN wget http://node-arm.herokuapp.com/node_latest_armhf.deb && \
dpkg -i node_latest_armhf.deb
RUN rm node_latest_armhf.deb

RUN mkdir /data
ADD pongcam/package.json /data/package.json
WORKDIR /data
RUN npm install
ENV NODE_PATH /data/node_modules

RUN mkdir /app
WORKDIR /app

EXPOSE 8444

RUN apt-get clean

WORKDIR /app
