var directives = angular.module("rsc.directives", ["rsc.services"]);

directives.directive("rscLogin", ["rscLoginService", function (LoginService) {
    return {
        restrict: "E",
        scope: {

        },
        templateUrl: "/public/templates/loginSection.html",
        link: function (scope, elem, attrs) {
            scope.showLogin = true;

            scope.login = function login() {
                LoginService.login(scope.user, scope.pw).then(function () {
                    scope.showLogin = false;
                }, function (error) {
                    scope.showLogin = true;
                });
            };

            LoginService.findOldSession().then(function () {
                scope.showLogin = false;
            });
        }
    };
}]);

directives.directive("rscCamview", ["rscCamService", "rscSync", "$timeout", function (CamService, rscSync, $timeout) {
    var timeBetweenRequests = 15000;
    return {
        restrict: "E",
        scope: {

        },
        templateUrl: "/public/templates/cameraSection.html",
        link: function (scope, elem, attrs) {
            var ready = {
                ws: false,
                login: false
            };
            scope.CamList = [];
            scope.SelectedCam = null;

            scope.UpdateImage = function updateImage(cam) {
                CamService.GetImage(cam.ID);
                cam.Requesting = true;

                $timeout(function () {
                    cam.Requesting = false;
                }, timeBetweenRequests)
            };

            scope.ShowDetails = function showDetails(cam) {
                if (cam) {
                    cam.HasNewImage = false;
                    scope.SelectedCam = cam;
                }
            };

            rscSync.on("ws_connected", function () {
                ready.ws = true;
                initImageEventListner();
            });

            rscSync.on("login", function (loggedIn) {
                if (loggedIn) {
                    ready.login = true;
                    initImageEventListner()
                }
            });

            /**
             * Will setup a few listeners to capture updates send by the server
             */
            function initImageEventListner() {
                if (ready.ws && ready.login) {
                    CamService.GetAllCameras().then(null, null, function (camList) {
                        //this will be called whenever there is a new list of cams available
                        markAllAsNew(camList);
                        scope.CamList = camList;
                        scope.ShowDetails(camList[0]);
                    });

                    CamService.WaitForCamUpdate().then(null, null, function (cam) {
                        if (cam) {
                            if (cam.ID != scope.SelectedCam.ID) {
                                cam.HasNewImage = true;
                            }
                            var browserCam = getCamById(cam.ID);
                            if (browserCam) {
                                browserCam.ImgIdx = browserCam.ImgIdx || 0;
                                browserCam.TimeStamp = cam.TimeStamp;
                                browserCam.Filepath = cam.Filepath + "?c=" + (browserCam.ImgIdx++);
                            } else {
                                cam.ImgIdx = 0;
                                scope.CamList.push(cam);
                            }
                        }
                    });

                    CamService.WaitForCamRemove().then(null, null, function (cam) {
                        if (cam) {
                            var browserCam = getCamById(cam.ID);
                            if (browserCam) {
                                browserCam.HasBeenRemoved = true;
                            }
                        }
                    });
                }
            }

            function getCamById(id) {
                if (id) {
                    var len = scope.CamList.length;
                    for (var i = 0; i < len; i++) {
                        var cam = scope.CamList[i];
                        if (cam.ID == id) {
                            return cam;
                        }
                    }
                }
                return null;
            }

            function markAllAsNew(camList) {
                for (var i in camList) {
                    camList[i].HasNewImage = true;
                }
            }
        }
    };
}]);

directives.directive("rscAdmin", [function () {
    return {
        restrict: "E",
        templateUrl: "/public/templates/adminSection.html",
        link: function (scope, elem, attrs) {

        },
        controller: ["$scope", "rscSync", function ($scope, rscSync) {
            rscSync.on("login", function (data) {
                if (data) {
                    //user has successful logged in
                } else {
                    //user is not authorized
                }
            });
        }],
    };
}]);


/*directives.directive("rscCameraSection",[function(){
    return{
        restrict:"E",
        templateUrl:"/public/templates/xyz.html",
        link:function(scope,elem,attrs){
            
        },
        controller:[function(){
            
        }],
    }; 
}]);*/