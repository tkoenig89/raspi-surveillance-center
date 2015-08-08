FOLDER="/raspi-surveillance-center"
LOGFOLDER="$FOLDER/log"
#test if a log folder exists, if note create it
if ! test -d $LOGFOLDER ; then sudo mkdir $LOGFOLDER ; fi

su pi -c "node $FOLDER/server.js > $LOGFOLDER/server.log &"