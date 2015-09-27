#sudo raspistill -o /imgs/now.jpg -w 1300 -h 780 -tl 10000 -t 100000

#create a folder for each day
BASEFOLDER=$1
HISTORYFOLDER=$2
FOLDER="$HISTORYFOLDER/$(date +%d%m%y)"

#define in which hours of the day there should no image be shot
NO_IMG_HOURS=";23;24;0;1;2;3;4"

#check if its a hour where no image should be shot
var="$(expr match "$NO_IMG_HOURS" ".*;$(date +"%H");")";
if [ $var = 0 ]; then

	#create folder if it doesn't exist
	if ! test -d $FOLDER ; then
		sudo mkdir $FOLDER 
	fi

	#archive old image
	if test -f $BASEFOLDER/now.jpg ; then
		sudo cp $BASEFOLDER/now.jpg $FOLDER/img$(date +%H%M%S).jpg
	fi

	#shoot image: quality 10 seems to be the best result in quality and size
	sudo raspistill -o $BASEFOLDER/now.jpg -q 10 -e jpg
fi