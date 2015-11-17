var services = angular.module("rsc.services", []);

services.factory("rscLoginService", ["$http", "$q", "rscSync", function ($http, $q, rscSync) {
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
                rscSync.emit("login", true);
                defered.resolve();

            }).error(function (error, status) {
                console.log(error, status);
                rscSync.emit("login", false);
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
                    rscSync.emit("login", true);
                    defered.resolve();
                }
            }).error(function (error, status) {
                console.log(error, status);
                rscSync.emit("login", false);
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

    return {
        getImage: getImage
    }

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
}]);

/**
 * Service to Handle multiple requests to resources
 */
services.factory("rscQ", ["$q", function ($q) {
    return {
        Create: _create
    }

    function _create() {
        return new Queue($q);
    }
}]);

function Queue($q) {
    this._$q = $q;
    this.requests = [];
    this.resolved = false;
    this.rejected = false;
    this.resolveData = null;
    this.rejectData = null;
}

Queue.prototype = {
    add: function () {
        var defered = this._$q.defer();

        if (this.resolved) {
            defered.resolve(this.resolveData);
        } else if (this.rejected) {
            defered.reject(this.rejectData);
        } else {
            this.requests.push(defered);
        }

        return defered.promise;
    },
    notify: function notify(data) {
        if (this.resolved || this.rejected)
            return false;

        for (var i in this.requests) {
            var r = this.requests[i];
            r.notify(data);
        }
        return true;
    },
    resolve: function resolve(data) {
        if (this.resolved || this.rejected)
            return false;

        this.resolved = true;
        this.resolveData = data;

        for (var i in this.requests) {
            var r = this.requests[i];
            r.resolve(data);
        }
        return true;
    },
    reject: function reject(data) {
        if (this.resolved || this.rejected)
            return false;

        this.rejected = true;
        this.rejectData = data;

        for (var i in this.requests) {
            var r = this.requests[i];
            r.reject(data);
        }
        return true;
    }
};

services.factory("rscSync", ["rscQ", function (rscQ) {
    var queues = [];

    return {
        emit: _emit,
        on: _on
    }

    function _on(eventName, callback) {
        var q = _getQueue(eventName);
        q.add().then(null, null, callback);
    }

    function _emit(eventName, data) {
        var q = _getQueue(eventName);
        q.notify(data);
    }

    function _getQueue(name) {
        if (!queues[name]) {
            queues[name] = rscQ.Create();
        }
        return queues[name];
    }
}]);

/*services.factory("rscLoginService", [function () {

}]);*/