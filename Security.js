var jwt = require("jsonwebtoken"), 
    CONST = require("./public/constants.js"),
    secret = "jksaniobkv893nfi982nfalkid983nbf",
    sessionID = Math.floor(Math.random() * 100000);

//Handles logins and security token operations
var ServerSecurity = (function () {
    //all valid logins
    var LOGINS = {
        "user": "pw",
        "test": "pw"
    };

    function setTokenCookie(res,token) {
        res.setHeader('Set-Cookie', CONST.TOKEN_HEADER + '=' + token );
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
            var post = JSON.parse(body);
            if (post.user && LOGINS[post.user] == post.pw) {

                //create a new security token in case of a valid login
                var token = createToken(post.user);

                //set cookie value for the token
                setTokenCookie(res, token);
                res.writeHead(200);
                res.end("Granted");
            } else {
                //access denied due to invalid credentials
                res.writeHead(401);
                res.end("Denied");
            }
        });

    }

    //test if the token inside the header is valid
    function validateToken(req, res) {
        var validToken = testSecurityToken(req);
        if (validToken) {
            //return an updated version of the token
            var token = createToken(validToken.userName);
            setTokenCookie(res, token);
            return true;
        } else {
            return false;
        }
    }

    //creates a new security token
    function createToken(name) {
        //token is only valid for one server session
        var token = jwt.sign({ sessionID: sessionID, userName: name }, secret, { algorithm: CONST.TOKEN_ALGORITHM, expiresInMinutes: CONST.TOKEN_TIMEOUT });
        return token;
    }

    //tests the header of the request for a valid security token
    //allows passing in the token directly
    function testSecurityToken(req) {
        var token = null;
        if(typeof(req) === "object"){
            //get token from req
            token = parseCookies(req)[CONST.TOKEN_HEADER];        
        }else if(typeof(req) === "string"){
            //token was passed directly
            token = req;
        }
        if (token) {
            try {
                var decoded = jwt.verify(token, secret, { algorithm: CONST.TOKEN_ALGORITHM });
                if (decoded.sessionID == sessionID)
                    return decoded;
            } catch (err) { }
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

    return {
        Login: login,
        createToken: createToken,
        testToken: testSecurityToken,
        validateToken: validateToken
    }
})();

module.exports= ServerSecurity;