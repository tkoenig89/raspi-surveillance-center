SCRIPT_FOLDER="/raspi-surveillance-center/shell_scripts"
STOP_INDICATOR="/tmp/stop"
IMG_FOLDER="/imgs"
HISTORYFOLDER="$IMG_FOLDER/history"
#set folders to use

#make folder(s) if it doesn't exist
if ! test -d $IMG_FOLDER ; then sudo mkdir $IMG_FOLDER ; fi
if ! test -d $HISTORYFOLDER ; then sudo mkdir $HISTORYFOLDER ; fi

#run as long as there is no file in /tmp/stop
while ! test -f $STOP_INDICATOR ; 
    do sudo $SCRIPT_FOLDER/shootImage.sh $IMG_FOLDER $HISTORYFOLDER; sleep 15 ;
done

#remove the stop file
sudo rm $STOP_INDICATOR