PROCS=`ps aux | grep gst | wc -l`

if [ $PROCS != 3 ]; then
	#su pi -c '/usr/local/bin/pm2 restart pongcam'
	
	sudo /usr/bin/pkill gst
        sudo /usr/bin/pkill node
	su pi -c 'cd /home/pi/pongcam && /usr/local/bin/node app.js'
	echo "Server restart at `date`"
fi
