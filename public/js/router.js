angular.module("Router", []).config(function($locationProvider, $routeProvider, $httpProvider){
	$locationProvider.html5Mode(true)

	$routeProvider.when("/", {redirectTo:"/home"})
	.when("/home", {templateUrl: "/partials/home.html", controller: "main"})
	.when("/profile", {templateUrl: "/partials/profile.html", controller: "profile"})
	.when("/user/:id", {templateUrl: "/partials/profile.html", controller:"profile"})
	.when("/user/:id/photos", {templateUrl: "/partials/photos.html", controller:"photos"})
	.when("/user/:id/photos/album/:album_id", {templateUrl:"/partials/photos.html", controller:"albums"})
	.when("/user/:id/photos/album", {redirectTo:"/user/:id/photos"})
	.when("/user/:id/photos/albums/new", {templateUrl:"/partials/new_album.html", controller:"newAlbumCtrl"})
	.when("/events", {templateUrl: "/partials/events.html", controller:"eventCtrl"})
	.when("/events/create", {templateUrl: "/partials/new_event.html", controller:"newEventCtrl"})
	.when("/events/event/:id", {templateUrl: "/partials/event_detail.html", controller: eventDetailCtrl})
	.when("/schools", {templateUrl: "/partials/schools.html", controller: schoolsCtrl})
	.when("/schools/school/:id", {templateUrl: "/partials/schools.html", controller:schoolsCtrl})
	.when("/schools/school/:id/students", {templateUrl:"/partials/school_students.html", controller:schoolStudentsCrtl})
	.when("/buzz", {templateUrl: "/partials/the_buzz.html", controller:buzzCtrl})
	.when("/buzz/post/:id", {templateUrl: "/partials/buzz_post_detail.html", controller:buzzPostDetailCtrl})
	.when("/buzz/create", {templateUrl: "/partials/buzz_create.html", controller:buzzCreateCtrl})
	.when("/clubs", {templateUrl: "/partials/clubs.html", controller:clubsCtrl})
	.when("/clubs/club/:id", {templateUrl: "/partials/club_detail.html", controller:clubDetailCtrl})
	.when("/clubs/create", {templateUrl: "/partials/clubs_create.html", controller:clubCreateCtrl})
	.when("/points", {templateUrl: "/partials/points.html", controller:pointsCtrl})
	.when("/post/:id", {templateUrl: "/partials/post_detail.html", controller:postCtrl})
	.when("/clubs/club/:id/mod", {templateUrl: "/partials/club_mod.html", controller: clubModCtrl})
	.when("/sports", {templateUrl: "/partials/sports.html", controller: sportsCtrl})
	.when("/backgrounds", {templateUrl:"/partials/backgrounds.html", controller: backgroundCtrl})
	.when("/friends/:id", {templateUrl:"/partials/friends.html", controller:friendsCtrl})
	.when("/admin", {templateUrl: "/admin?html=true", controller: admin})
	.when("/logout", {controller: logout, templateUrl:""})
	.when("/profile/edit", {templateUrl:"/partials/edit_profile.html", controller:editProfileCtrl})
	.when("/404", {templateUrl: "/partials/404.html", controller:_404Ctrl})
	.when("/profile/account-settings", {templateUrl:"/partials/account_settings.html", controller:accountSettingsCtrl})
	.otherwise({redirectTo: "/404"});
	 $httpProvider.responseInterceptors.push('loader2');
	 $httpProvider.defaults.transformRequest.push(function(data){
	 	$("#loader").removeClass("hide");
	 	return data;
	 });
})