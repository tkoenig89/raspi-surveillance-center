TARGET_FOLDER="/mnt/smbshare"
IMG_FOLDER="/home/pi/imgs"

#coppy to smb
cp $IMG_FOLDER/now.jpg $TARGET_FOLDER/c2.jpg

#minify captures twice
gm convert -minify -minify $TARGET_FOLDER/c1.jpg $TARGET_FOLDER/m1.jpg
gm convert -minify -minify $TARGET_FOLDER/c2.jpg $TARGET_FOLDER/m2.jpg

#merge
gm convert -append $TARGET_FOLDER/m1.jpg $TARGET_FOLDER/m2.jpg $TARGET_FOLDER/merge.jpg