FOLDER="/raspi-surveillance-center"
LOGFILE="client.log"

node $FOLDER/camClient.js < /dev/null > $FOLDER/$LOGFILE &"