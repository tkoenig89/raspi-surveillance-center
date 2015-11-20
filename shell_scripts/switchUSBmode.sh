echo "testing usb device mode"

lsusb | grep -q "19d2:0117"
tx=$?
while [ $tx -ne 0 ]
    do

    #switch mode
    echo "preparing usb device"
    sudo usb_modeswitch -c /usr/share/usb_modeswitch/19d2\:0083

    #wait and test again
    sleep 10
    lsusb | grep -q "19d2:0117"
    tx=$?
    sleep 1
done
echo "usb device ready"

echo "starting umtskeeper"
#run a script to start the umts keeper
sudo /home/pi/startUMTSKeeper.sh

echo "starting camclient"
#start the camera client
sudo /home/pi/raspi-surveillance-center/shell_scripts/startClient.sh