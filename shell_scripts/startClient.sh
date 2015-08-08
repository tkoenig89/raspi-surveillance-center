FOLDER="/raspi-surveillance-center"
LOGFOLDER="$FOLDER/log"
#test if a log folder exists, if note create it
if ! test -d $LOGFOLDER ; then sudo mkdir $LOGFOLDER ; fi

node $FOLDER/camClient.js > $LOGFOLDER/client.log &"