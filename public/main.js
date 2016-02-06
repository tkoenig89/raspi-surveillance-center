var app = angular.module("camApp", ["rsc.services", "rsc.directives"]);

app.controller("camCtrl", ["$scope", "rscSync", function ($scope, rscSync) {
    $scope.IsLoggedIn = false;

    rscSync.on("login", function (loggedIn) {
        $scope.IsLoggedIn = loggedIn;
    });

}]);