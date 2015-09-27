IMG_FOLDER="/imgs"
#deletes images older than 4000 minutes ~ 3 days
sudo find $IMG_FOLDER/* -mmin +4000 -delete