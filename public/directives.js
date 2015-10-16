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

directives.directive("rscCamview", ["rscCamService", function (CamService) {
    return {
        restrict: "E",
        scope: {

        },
        templateUrl: "/public/templates/cameraSection.html",
        link: function (scope, elem, attrs) {
            scope.updateImage = function updateImage() {
                CamService.getImage().then(null, null, function (imgUrl) {
                    scope.camImgSrc = imgUrl;

                    //repeat image request if selected
                    if (scope.repeatRequest) {
                        setTimeout(scope.updateImage, 15000);
                    }
                });

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
        controller: [function () {

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