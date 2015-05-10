String.prototype.capitalize = function(){
	return this.charAt(0).toUpperCase() + this.slice(1);
}

angular.module('project',[]).config(function($routeProvider){
	//console.log($routeParams)
	$routeProvider
	.when("/", {contoller:"login", templateUrl:'/view_partials/home.html'})
	.when("/user/", {redirectTo:'/profile'})
	.when("/user/:id", {templateUrl:"/view_partials/user.html", controller:"profile"})
	.when("/404", {templateUrl:'/view_partials/404.html'})
	.when("/profile", {templateUrl:"/view_partials/user.html", controller:"profile"})
	.otherwise({redirectTo:'/404'});
}).run(function($http, $rootScope){

	$http.get("/userdata").success(function(data){
		$rootScope.loggedInUser = data;
	});

}).service('timeAgoService', function($timeout) {
    var ref;
    return {
      nowTime: 0,
      initted: false,
      settings: {
        refreshMillis: 60000,
        allowFuture: false,
        strings: {
          prefixAgo: null,
          prefixFromNow: null,
          suffixAgo: "ago",
          suffixFromNow: "from now",
          seconds: "less than a minute",
          minute: "about a minute",
          minutes: "%d minutes",
          hour: "about an hour",
          hours: "about %d hours",
          day: "a day",
          days: "%d days",
          month: "about a month",
          months: "%d months",
          year: "about a year",
          years: "%d years",
          numbers: []
        }
      },
      doTimeout: function() {
        ref.nowTime = (new Date()).getTime();
        $timeout(ref.doTimeout, ref.settings.refreshMillis);
      },
      init: function() {
        if (this.initted == false) {
          this.initted = true;
          this.nowTime = (new Date()).getTime();
          ref = this;
          this.doTimeout();
          this.initted = true;
        }
      },
      inWords: function(distanceMillis) {
        var $l = this.settings.strings;
        var prefix = $l.prefixAgo;
        var suffix = $l.suffixAgo;
        if (this.settings.allowFuture) {
          if (distanceMillis < 0) {
            prefix = $l.prefixFromNow;
            suffix = $l.suffixFromNow;
          }
        }

        var seconds = Math.abs(distanceMillis) / 1000;
        var minutes = seconds / 60;
        var hours = minutes / 60;
        var days = hours / 24;
        var years = days / 365;

        function substitute(stringOrFunction, number) {
          var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, distanceMillis) : stringOrFunction;
          var value = ($l.numbers && $l.numbers[number]) || number;
          return string.replace(/%d/i, value);
        }

        var words = seconds < 45 && substitute($l.seconds, Math.round(seconds)) ||
        seconds < 90 && substitute($l.minute, 1) ||
        minutes < 45 && substitute($l.minutes, Math.round(minutes)) ||
        minutes < 90 && substitute($l.hour, 1) ||
        hours < 24 && substitute($l.hours, Math.round(hours)) ||
        hours < 42 && substitute($l.day, 1) ||
        days < 30 && substitute($l.days, Math.round(days)) ||
        days < 45 && substitute($l.month, 1) ||
        days < 365 && substitute($l.months, Math.round(days / 30)) ||
        years < 1.5 && substitute($l.year, 1) ||
        substitute($l.years, Math.round(years));

        var separator = $l.wordSeparator === undefined ?  " " : $l.wordSeparator;
        return $.trim([prefix, words, suffix].join(separator));
      }
    }
  }).directive('timeAgo', ['timeAgoService', function(timeago) {
    return {
      replace: true,
        restrict: 'EA',
      scope: {
        "fromTime":"@"
      },
      link: {
        post: function(scope, linkElement, attrs) {
          scope.timeago = timeago;
          scope.timeago.init();
          scope.$watch("timeago.nowTime-fromTime",function(value) {
            if (scope.timeago.nowTime != undefined) {
              value = scope.timeago.nowTime-scope.fromTime;
              $(linkElement).text(scope.timeago.inWords(value));
            }
          });
        }
      }
    }
  }]).factory("socket",function($rootScope){
    var socket = io.connect()
    return{
      on: function(eventName, callback){
        socket.on(eventName, function(){
          var args = arguments;
          $rootScope.$apply(function(){
            callback.apply(socket, args);
          })
        })
      },
      emit: function(eventName, data, callback){
        socket.emit(eventName, data, function(){
          var args = arguments;
          $rootScope.$apply(function(){
            if(callback){
              callback.apply(socket,args);
            }
          })
        })
      }
    }
  })
  // .directive("chat-window", function(){
  //   return {
  //     restrict: 'A',
  //     link: function(scope, element, attrs)
  //     {
  //       scope.$watch( "message", function(val) {

  //       });
  //     }
  //   }
  // });

function home($scope,$http){
	$scope.getUser = function(){
		if($scope.searchUser){
			$http({method:"GET",url:"/user/name/"+$scope.searchUser})
			.success(function(data, status, headers, config){
				$scope.users = data;
        angular.element(".searchbar-dropdown").removeClass("hide")
			}).error(function(data, status, headers, config){console.log(data, status, headers, config)});
		}
		else{
			$scope.users = [];
		}
	}
  var checked_requests = false
  $scope.requests = [];
  $scope.friendRequests = function(){
    if(!checked_requests){
      $http.get("/friend-requests").success(function(requests){
        $scope.requests = requests;
      })
      checked_requests = true;
    }
    else{
      setTimeout(function(){
        checked_requests = false;
        $scope.friendRequests();
      }, 1000 * 60 *5)
    }
    return $scope.requests.length
  }
  $scope.requestFriendship = function(){
    $http.get("/request-friendship/"+this.request.requester).success(function(data){
      window.location.reload();
    })
  }
  $scope.hide = "hide";
  angular.element(".shownotifications").bind("click",function(){
            angular.element(".notifications ul").toggle("hide");
  })
  angular.element(".notifications").bind("clickoutside",function(element){
      angular.element(".notifications ul").css("display","none")
  })
  angular.element(".form-search").bind("clickoutside",function(element){
      angular.element(".searchbar-dropdown").addClass("hide")
  })
}

function profile($scope, $http, $routeParams, $location){
	
	if(+$routeParams.id === $scope.loggedInUser.user_id){
		$location.path("/profile");
	}
	if($routeParams.id){
		url = "/user/id/"+$routeParams.id;
		url2 = "/posts-by-user/"+$routeParams.id;
    areFriends($scope.loggedInUser.user_id, +$routeParams.id, $http, $scope);
    $scope.you = false;
	}
	else{
		url = "/profile"
		url2 = "/posts-by-user"
    $scope.you = true;
	}
  mention = $routeParams.id || $scope.loggedInUser.user_id
	$http({method:"GET", url:url})
	.success(function(data){
		$scope.user = data[0]
		$scope.user.age = Math.floor(((Date.now()/1000) - $scope.user.birthdate) / (60*60*24*365.25))
	});
	$scope.posts = [];
	$http.get(url2).success(function(data, status){
		$http.get("/mentions/"+mention).success(function(data2,status){
      if(!data2){
        data2 = [];
      }
			$scope.posts = data.concat(data2);
		}).error(function(data,status){
      console.log(data,status,"error");
    })
	}).error(function(data,status){console.log(data,status,"error")});


  $scope.newPost = function(){
    var post_data = {post:$scope.status}
    if($routeParams.id){
      post_data.mention = $routeParams.id
    }
    $http.post("/new/post",post_data)
    .success(function(data){
      if(!data.error){
        post = {
          post_body:$scope.status, 
          fname:$scope.loggedInUser.fname, 
          lname:$scope.loggedInUser.lname, 
          post_date: (+Date.now()/1000), 
          post_id:data.insert_id,
          comments: [],
          profile_pic: $scope.loggedInUser.profile_pic
        }
        $scope.posts.push(post)
        $scope.status = "";
        console.log(data)
      }
    }).error(function(data, status, headers, config){
      console.log(status, headers(), config);
    })
  }
    $scope.newComment = function(){
    var data = {post_id:this.post.post_id, comment_body:this.comment_body}
    var that = this
    $http.post("/new-comment", data).success(function(data){
      that.post.comments = that.post.comments || [];
        that.post.comments.push(
          {
            comment_body: that.comment_body, 
            profile_pic: $scope.loggedInUser.profile_pic, 
            fname: $scope.loggedInUser.fname, 
            lname: $scope.loggedInUser.lname,
            user_id: $scope.loggedInUser.user_id
          })
        that.comment_body = "";
    });
  }
  $scope.requestFriendship = function(){
    $http.get("/request-friendship/"+$routeParams.id).success(function(data){
      angular.element(".addfriend").remove()
    })
  }
  $scope.showUploadForm = function(){
    $scope.photoUploadForm = true
  }
}
function newsfeed($scope, $http, $compile){
	$scope.newPost = function(){
		$http.post("/new/post",{post:$scope.status})
		.success(function(data){
			if(!data.error){
        post = {
          post_body:$scope.status, 
          fname:$scope.loggedInUser.fname, 
          lname:$scope.loggedInUser.lname, 
          post_date: (+Date.now()/1000), 
          post_id:data.insert_id,
          comments: [],
          profile_pic: $scope.loggedInUser.profile_pic
        }
				$scope.posts.push(post)
				$scope.status = "";
			}
		}).error(function(data, status, headers, config){
			console.log(status, headers(), config);
		})
	}
	$scope.newComment = function(){
		var data = {post_id:this.post.post_id, comment_body:this.comment_body}
    var that = this;
		$http.post("/new-comment", data).success(function(data){
        that.post.comments.push(
          {
            comment_body: that.comment_body, 
            profile_pic: $scope.loggedInUser.profile_pic, 
            fname: $scope.loggedInUser.fname, 
            lname: $scope.loggedInUser.lname,
            user_id: $scope.loggedInUser.user_id
          })
        that.comment_body = "";
		});
	}

  $scope.mention = function(){
    var post = this.post;
    if(post.mfname){
      return "-->";
    }
  }
	$scope.posts = [];
	$http.get("/posts-by-friends").success(function(data, status){
		$http.get("/posts-by-user").success(function(data2){
       if(!data2){
        data2 = [];
      }
			$scope.posts = data.concat(data2);
		})
		
	});

}
function chat($scope, socket){
  $scope.chats = [];
  $scope.messages = {};
  $scope.onlineFriends = [];
  socket.on("onlineFriends", function(friends){
    $scope.onlineFriends = friends
  })
  socket.on("friend-online", function(friend){
    $scope.onlineFriends.push(friend);
  })
  socket.on("friend-offline", function(id){
    $scope.onlineFriends.forEach(function(friend, index){
      if(+friend.user_id === +id){
        $scope.onlineFriends.splice(index, 1);
      }
    })
  })
  socket.on("message", function(from, message){
    console.log(from, message);
    if(!chatExists(from.user_id)){
      $scope.chats.push({fname:from.fname,lname:from.lname,user_id:from.user_id});
    }
    pushToMessages(from.user_id, {message:message, from:from.fname+" "+from.lname})
    console.log($scope.messages[from.user_id]);
  });
  $scope.sendMessage = function(){
    console.log(this.chat)
    if(this.chat_message){
      socket.emit("message", {to:this.chat.user_id, message:this.chat_message});
      pushToMessages(this.chat.user_id, {message:this.chat_message, from:"Me"})
      this.chat_message = "";
    }
    
  }
  $scope.newChat = function(){
    console.log($scope);
    var friend = this.friend;
    if(!chatExists(friend.user_id)){
      $scope.chats.push({fname:friend.fname, lname: friend.lname, user_id: friend.user_id})
    }
    
    
  }
  function pushToMessages(user_id, data){
    if(!$scope.messages[user_id]){
      $scope.messages[user_id] = []
    }
    $scope.messages[user_id].push(data);
  }
  function chatExists(from){
    var chatExists = false;
    $scope.chats.forEach(function(chat){
      if(+chat.user_id === +from){
       chatExists = true;
      }
    })
    return chatExists;
  }
}

function areFriends(user1,user2, http, scope){
  http.get("are-friends/"+user1+"/"+user2).success(function(data){
    if(data === "true"){
      scope.areFriends = true;
    }
    else{
      scope.areFriends = false;
    }
  })
}
