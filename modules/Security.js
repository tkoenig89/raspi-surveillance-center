var jwt = require("jsonwebtoken"),
    CONST = require("../public/constants"),
    secret = "jksaniobkv893nfi982nfalkid983nbf",
    sessionID = Math.floor(Math.random() * 100000);

var Roles = {
    //define your own random mappings for each role 
    _values: {
        28232: "Admin",
        26340: "View",
        76007: "Read"
    },
    getByID: function getByID(id) {
        return this._values[id];
    },
    getID: function getID(name) {
        for (var i in this._values) {
            if (name === this._values[i]) {
                return i;
            }
        }
        return -1;
    }
};

function User(name, pw, role) {
    this.Name = name;
    this.Pw = pw;
    this.Role = role;
}

//Handles logins and security token operations
var ServerSecurity = (function () {
    //all valid logins
    var LOGINS = [
        new User("user", "pw", Roles.getID("Admin")),
        new User("test", "pw", Roles.getID("View"))
    ];

    function getSessionID() {
        return sessionID;
    }

    function setTokenCookie(res, token) {
        res.setHeader('Set-Cookie', CONST.TOKEN_HEADER + '=' + token);
    }

    function getRoleFromLogin(user, pw) {
        if (user && pw) {
            for (var i in LOGINS) {
                var login = LOGINS[i];
                if (login.Name === user && login.Pw === pw) {
                    return login.Role;
                }
            }
        }
        return 0;
    }

    //tests if the user is allowed to login
    function login(req, res) {
        var body = '';
        //read the data from the connection
        req.on('data', function (data) {
            body += data;
            // Too much POST data, kill the connection!
            if (body.length > 1e6)
                req.connection.destroy();
        });
        req.on('end', function () {
            //parse the received data
            var cred = JSON.parse(body);
            var role = cred && getRoleFromLogin(cred.user, cred.pw)
            if (role) {

                //create a new security token in case of a valid login and set the cookie
                refreshCookie(role, res);

                res.writeHead(200);
                res.end("Granted");
            } else {
                //access denied due to invalid credentials
                res.writeHead(401);
                res.end("Denied");
            }
        });

    }

    //creates a new token based on the users role and sets the cookie with the new token
    function refreshCookie(role, resp) {
        var token = createToken(role);
        setTokenCookie(resp, token);
    }

    //test if the token inside the header is valid
    function refreshToken(req, res) {
        var validToken = testSecurityToken(req);
        if (validToken) {
            //return an updated version of the token
            refreshCookie(validToken.y, res);
            return true;
        } else {
            return false;
        }
    }

    //creates a new security token
    function createToken(role) {
        //token is only valid for one server session
        var token = jwt.sign({
            x: sessionID,
            y: role
        }, secret, {
            algorithm: CONST.TOKEN_ALGORITHM,
            expiresInMinutes: CONST.TOKEN_TIMEOUT
        });
        return token;
    }

    //tests the header of the request for a valid security token
    function testSecurityToken(req) {
        var token = null;
        if (typeof (req) === "object") {
            //get token from req
            token = parseCookies(req)[CONST.TOKEN_HEADER];
        }
        if (token) {
            try {
                var decoded = jwt.verify(token, secret, {
                    algorithm: CONST.TOKEN_ALGORITHM
                });
                if (decoded && decoded.x === sessionID)
                    return decoded;
            } catch (err) {
                return null;
            }
        }
        return null;
    }

    function parseCookies(request) {
        var list = {},
            rc = request.headers.cookie;

        rc && rc.split(';').forEach(function (cookie) {
            var parts = cookie.split('=');
            list[parts.shift().trim()] = decodeURI(parts.join('='));
        });
        return list;
    }

    /**
     * Tests if the current user has one of the given roles
     */
    function testUserAccess(req, requiredRoles) {
        var token = testSecurityToken(req);
        //test if the current user has one off the required roles
        if (token && requiredRoles.indexOf(Roles.getByID(token.y)) >= 0) {
            return true;
        } else {
            return false;
        }
    }

    return {
        Login: login,
        createToken: createToken,
        testToken: testSecurityToken,
        refreshToken: refreshToken,
        testUserAccess: testUserAccess,
        getSessionID: getSessionID
    }
})();

module.exports = ServerSecurity;