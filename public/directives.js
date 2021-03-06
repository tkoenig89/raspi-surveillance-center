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
                if (!cam.Requesting) {
                    CamService.GetImage(cam.ID);
                    cam.Requesting = true;

                    $timeout(function () {
                        cam.Requesting = false;
                    }, timeBetweenRequests)
                }
            };

            scope.ShowDetails = function showDetails(cam) {
                if (cam) {
                    markAllAsInactive(scope.CamList);

                    cam.HasNewImage = false;
                    cam.IsActive = true;
                    scope.SelectedCam = cam;
                }
            };

            rscSync.on("ws_connected", function (connected) {
                ready.ws = connected;
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
                            var browserCam = getCamByName(cam.Name);
                            if (browserCam) {
                                browserCam.IsConnected = cam.IsConnected;
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
                            var browserCam = getCamByName(cam.Name);
                            if (browserCam) {
                                browserCam.IsConnected = false;
                            }
                        }
                    });
                }
            }

            function getCamByName(name) {
                if (name) {
                    var len = scope.CamList.length;
                    for (var i = 0; i < len; i++) {
                        var cam = scope.CamList[i];
                        if (cam.Name == name) {
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

            function markAllAsInactive(camList) {
                for (var i in camList) {
                    camList[i].IsActive = false;
                }
            }
        }
    };
}]);

directives.directive("rscArchive", ["rscArchiveService", function (dService) {
    return {
        restrict: "E",
        templateUrl: "/public/templates/archiveSection.html",
        controller: ["$scope", function ($scope) {
            $scope.FolderList = [];
            $scope.SelectedFolder = null;
            dService.GetArchivedData().then(null, null, function (data) {
                if (data && data.length > 0) {
                    $scope.FolderList = data;
                    $scope.OpenFolder($scope.FolderList[0]);
                }
            });

            $scope.OpenFolder = function openFolder(folder) {
                if (folder) {
                    $scope.SelectedFolder = folder;
                }
            }
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