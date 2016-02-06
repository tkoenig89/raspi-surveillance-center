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

    function addTokenToWSRequest(data) {
        if (!data) {
            data = {};
        }

        data.token = _getToken();
        return data;
    }

    return {
        login: login,
        AddTokenToWSRequest: addTokenToWSRequest,
        findOldSession: checkForValidToken
    }
}]);

services.factory("rscCamService", ["$http", "$q", "rscWebService", "rscLoginService", function ($http, $q, wSocket, loginService) {
    var _imgCounter = 0;

    return {
        GetImage: getImage,
        GetAllCameras: getAllCameras,
        WaitForCamUpdate: waitForCamUpdate,
        WaitForCamRemove: waitForCamRemove
    }

    function getAllCameras() {
        wSocket.send(CONST.STATES.IMG_REQ_ALL_CAMS, loginService.AddTokenToWSRequest());
        return wSocket.listen(CONST.STATES.IMG_SEND_ALL_CAMS);
    }

    /**    
     * Will request a new image from the server    
     */
    function getImage(id) {
        var data = loginService.AddTokenToWSRequest({
            ID: id
        });
        wSocket.send(CONST.STATES.IMG_REQ_ONE_CAMS, data);
    }

    function waitForCamUpdate() {
        //connect to the websocket server and listen for image updates
        return wSocket.listen(CONST.STATES.NEW_IMAGE);
    }

    function waitForCamRemove() {
        return wSocket.listen(CONST.STATES.REMOVED_IMAGE);
    }
}]);

services.factory("rscArchiveService", ["rscWebService", "rscLoginService", function (wSocket, loginService) {
    var _imgCounter = 0;

    return {
        GetArchivedData: getArchivedData
    }

    function getArchivedData() {
        wSocket.send(CONST.STATES.REQUEST_ARCHIVED_IMAGES, loginService.AddTokenToWSRequest());
        return wSocket.listen(CONST.STATES.PROVIDE_ARCHIVED_IMAGES);
    }
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

services.factory("rscWebService", ["rscQ", "rscSync", function (rscQ, rscSync) {
    var eventQueues = [];
    var ws = null;
    //open connection to the server
    _openWebSocket();

    return {
        waitFor: _waitFor,
        listen: _listen,
        send: _send
    }

    function _waitFor() {
        //TODO    
    }

    /**
     * Sends data using the open websocket
     * @param   {string}   eventName name of the event to trigger on the server
     * @param   {[[Type]]} payLoad   data to send to the server
     * @returns {boolean}
     */
    function _send(eventName, payLoad) {
        if (eventName && payLoad) {
            var dataPacket = JSON.stringify({
                ev: eventName,
                pl: payLoad
            });
            ws.send(dataPacket);
            return true;
        } else {
            return false;
        }
    }

    //allows listening to events received at the websocket    
    function _listen(eventName) {
        var queue = getQueue(eventName);
        var promise = queue.add();

        return promise;
    }

    function _openWebSocket() {
        ws = new WebSocket((CONST.SECURE_CONNECTION ? "wss:" : "ws:") + "//" + CONST.SERVICE_URL + ":" + CONST.SERVICE_PORT);
        ws.onmessage = _handleMessage;
    }

    function _handleMessage(event) {
        var data = JSON.parse(event.data);
        switch (data.ev) {
        case CONST.STATES.SETUP_REQ:
            _send(CONST.STATES.SETUP, {
                type: CONST.TYPES.BROWSER_CLIENT,
                ID: getClientID()
            });
            break;
        case CONST.STATES.SETUP_DONE:
            setClientID(data.pl.ID);
            rscSync.emit("ws_connected");
            break;
        default:
            _notifyListeners(data);
        }
    }

    function _notifyListeners(eventData) {
        if (eventData && eventData.ev) {
            var queue = getQueue(eventData.ev);
            queue.notify(eventData.pl);
        } else {
            console.error("No valid eventdata received!");
        }
    }

    function getQueue(eventName) {
        if (!eventQueues[eventName]) {
            eventQueues[eventName] = rscQ.Create();
        }
        return eventQueues[eventName];
    }

    //stores the id received from the server in the local storage
    function setClientID(id) {
        if (id && typeof (Storage) !== "undefined") {
            localStorage.rscClientID = id;
        }
    }

    //if available will read the last id from the local storage
    function getClientID() {
        if (typeof (Storage) !== "undefined") {
            var id = localStorage.rscClientID;
            return parseInt(id);
        } else {
            return -1;
        }
    }
}]);