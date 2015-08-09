FOLDER="/raspi-surveillance-center/shell_scripts"
STOP_INDICATOR="/tmp/stop"

#run as long as there is no file in /tmp/stop
while ! test -f $STOP_INDICATOR ; 
    do sudo $FOLDER/shootImage.sh; sleep 15 ;
done

#remove the stop file
sudo rm $STOP_INDICATOR