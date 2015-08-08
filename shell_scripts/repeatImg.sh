
#run as long as there is no file in /tmp/stop
while ! test -f /tmp/stop ; do ./shootImage.sh; sleep 15 ; done
