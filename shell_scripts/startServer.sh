FOLDER="/raspi-surveillance-center"
LOGFILE="server.log"

su pi -c "node $FOLDER/server.js < /dev/null > $FOLDER/$LOGFILE &"