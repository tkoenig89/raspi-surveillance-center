var app = angular.module("camApp", []);

app.controller("camCtrl", ["$scope", "$http", function ($scope, $http) {
    var webSocket = null;
	var imgCounter=0;
    $scope.showLogin = false;
    $scope.user = "";
    $scope.pw = "";
    $scope.camImgSrc = "";
	$scope.repeatRequest = false;

    //connect to the websocket server
    openWebSocket().onImage(function (data) {
        console.log(data);
        $scope.$apply(function () {
            $scope.camImgSrc = data.imgPath+"?c="+(imgCounter++);
        });
    });

    $scope.login = function () {
        $http.post("/login", { user: $scope.user, pw: $scope.pw }).success(function (data, status, headers, config) {
            var token = parseCookies()[CONST.TOKEN_HEADER];
            Token(token);
            $scope.showLogin = false;

        }).error(function (error, status) {
            console.log(error, status);
        });
    };

    $scope.updateImage = function () {
        $http.defaults.headers.common[CONST.TOKEN_HEADER] = Token();
		$http.post("/refreshimage").success(function(){
			if($scope.repeatRequest){
				setTimeout($scope.updateImage,15000);
			}
		});
    };

    function checkForValidToken() {
        $http.defaults.headers.common[CONST.TOKEN_HEADER] = Token();
        $http.post("/validateToken").success(function (data, status, headers, config) {
            if (data === "valid") {
                //update stored token
                var token = parseCookies()[CONST.TOKEN_HEADER];
                Token(token);
            }
        }).error(function (error, status) {
            $scope.showLogin = true;
            console.log(error, status);
        });
    }

    checkForValidToken();
}]);

function Token(dataToStore) {
    if (typeof (Storage) !== "undefined") {
        if (dataToStore) {
            localStorage.camSecurityToken = dataToStore;
        }
        return localStorage.camSecurityToken
    }
}

function openWebSocket() {
    // var ws = new WebSocket("wss://localhost:8080");
	var ws = new WebSocket("ws://" + CONST.SERVICE_URL);
    var imgCallback = null;

    ws.onmessage = function (event) {
        var data = JSON.parse(event.data);
        switch (data.ev) {
            case CONST.STATES.SETUP_REQ:
                ws.send(JSON.stringify({
                  pl:{
                    type: CONST.TYPES.BROWSER_CLIENT
                  },
                  ev: CONST.STATES.SETUP
                }));
                break;
            case CONST.STATES.SETUP_DONE:
                break;
            case CONST.STATES.NEW_IMAGE:
                if (imgCallback) {
                    imgCallback(data.pl);
                }
                break;
        }
    }

    function onImage(fn) {
        if (fn) {
            imgCallback = fn;
        }
    }

    return {
        onImage: onImage
    }
}

function parseCookies() {
    var cString = document.cookie;
    var list = {};

    cString && cString.split(';').forEach(function (cookie) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}
