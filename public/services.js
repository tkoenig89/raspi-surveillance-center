var services = angular.module("rsc.services", []);

services.factory("rscLoginService", ["$http", "$q", function ($http, $q) {
    var _isUserLoggedIn = false;
    var _sessionToken = null;

    function login(user, pw) {
        var defered = $q.defer();
        var data = {
            user: user,
            pw: pw
        };

        $http.post("/login", data)
            .success(function (data, status, headers, config) {
                var token = parseCookies()[CONST.TOKEN_HEADER];
                _setToken(token);
                defered.resolve();

            }).error(function (error, status) {
                console.log(error, status);
                defered.reject();
            });

        return defered.promise;
    }


    /**     
     * checks if a token is stored in the localStorage and will try to resume the last session at the server    
     */
    function checkForValidToken() {
        var defered = $q.defer();
        var token = _getToken();
        if (token) {
            $http.defaults.headers.common[CONST.TOKEN_HEADER] = token;
            $http.post("/validateToken").success(function (data, status, headers, config) {
                if (data && data.toLowerCase() === "valid") {
                    //update stored token
                    var token = parseCookies()[CONST.TOKEN_HEADER];
                    _setToken(token);
                    defered.resolve();
                }
            }).error(function (error, status) {
                console.log(error, status);
                defered.reject();
            });
        }

        return defered.promise;
    }


    /**    
     * @private    
     * Returns the token value stored inside the local storage.
     * Fallback will use a session variable
     * @returns {type} Description    
     */

    function _getToken() {
        if (typeof (Storage) !== "undefined") {
            return localStorage.camSecurityToken;
        } else {
            return _sessionToken;
        }
    }

    /**    
     * @private    
     * Sets the value of the token inside the local storage and as default header.
     * Fallback will use a session variable
     * @param {object} value token object to set    
     * @returns {boolean} true if set successfuly    
     */
    function _setToken(value) {
        if (value) {
            if (typeof (Storage) !== "undefined") {
                localStorage.camSecurityToken = value;
            } else {
                _sessionToken = value;
            }
            $http.defaults.headers.common[CONST.TOKEN_HEADER] = value;
            return true;
        } else {
            return false;
        }
    }


    /**    
     * Will parse the current documents cookies
     * @returns list of all cookies
     */
    function parseCookies() {
        var cString = document.cookie;
        var list = {};

        cString && cString.split(';').forEach(function (cookie) {
            var parts = cookie.split('=');
            list[parts.shift().trim()] = decodeURI(parts.join('='));
        });

        return list;
    }

    return {
        login: login,
        findOldSession: checkForValidToken
    }
}]);

services.factory("rscCamService", ["$http", "$q", function ($http, $q) {
    var _defered = null;
    var _imgCounter = 0;


    /**    
     * Creates a websocket, that will listen for new camera images    
     */
    function openWebSocket() {
        var ws = new WebSocket((CONST.SECURE_CONNECTION ? "wss:" : "ws:") + "//" + CONST.SERVICE_URL + ":" + CONST.SERVICE_PORT);
        var imgCallback = null;

        ws.onmessage = function (event) {
            var data = JSON.parse(event.data);
            switch (data.ev) {
            case CONST.STATES.SETUP_REQ:
                ws.send(JSON.stringify({
                    pl: {
                        type: CONST.TYPES.BROWSER_CLIENT,
                        ID: getClientID()
                    },
                    ev: CONST.STATES.SETUP
                }));
                break;
            case CONST.STATES.SETUP_DONE:
                setClientID(data.pl.ID);
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

    function setClientID(id) {
        if (id && typeof (Storage) !== "undefined") {
            localStorage.rscClientID = id;
        }
    }

    function getClientID() {
        if (typeof (Storage) !== "undefined") {
            var id = localStorage.rscClientID;
            return parseInt(id);
        } else {
            return -1;
        }
    }

    /**    
     * Will request a new image from the server    
     */
    function getImage() {
        if (!_defered) {
            _defered = $q.defer();
        }

        //ask for new image
        $http.post("/refreshimage").success(function (data) {
            if (data.indexOf("Granted") === 0) {
                var spl = data.split(";");
                var imgPath = spl[1];
                _defered.notify({
                    path: imgPath + "?c=" + (_imgCounter++),
                    time: spl[2]
                });
            }
        }).error(function (error) {
            console.log(error);
        });

        return _defered.promise;
    }

    //connect to the websocket server and listen for image updates
    openWebSocket().onImage(function (data) {
        if (_defered) {
            _defered.notify({
                path: data.imgPath + "?c=" + (_imgCounter++),
                time: data.TimeStamp
            });
        }

    });

    return {
        getImage: getImage
    }
            }]);

/*services.factory("rscLoginService", [function () {

}]);*/