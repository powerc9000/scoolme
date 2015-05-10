"use strict"

angular.module("scoolme",["$strap.directives", "Directives", "Factory", "Router"]).run(function($http, $rootScope){
	$rootScope.setTitle = function(title){
		$rootScope.title = title;
	}
	$rootScope.setNavbarActive = function(page){
		$rootScope.currlink = page;
	}
	$http.get("/userdata").success(function(data){
		$rootScope.loggedInUser = data;
	});
	runJquery();

})
.filter('startFrom', function() {
    return function(input, start) {
        start = +start; //parse to int
        return input.slice(start);
    }
})
.filter("capitalize", function(){
	return function(text, length, end){
		text = text || "";
    	return text.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	}
})
.filter('range', function() {
  return function(input, total) {
    total = parseInt(total);
    for (var i=0; i<total; i++)
      input.push(i);
    return input;
  };
})



function header($scope, $location, $http, pubsub){
	
	$http.get("/notifications").success(function(data){
		$scope.notifications = data;
	})
	$scope.unseenNotifications = function(){
		if($scope.notifications){
			return $scope.notifications.friend_requests.length;
		}
		else{
			return 0;
		}
	}
	$scope.acceptFriendRequest = function(){
		var that = this;
		$http.get("/request-friendship/"+this.request.user_id).success(function(data){
			pubsub.publish("alert", data);
			$scope.notifications.friend_requests.splice(that.$index, 1);
		})
	}
	pubsub.subscribe("closeDropdown", function(){
		$scope.show = false
	})
	$scope.toggleDropdown = function(){
		if(!$scope.show){
			pubsub.publish("closeDropdown", []);
			$(".trans-div").show();
		}
		else{
			$(".trans-div").hide();
		}
		$scope.show = !$scope.show
		
	}

	$scope.$on("$routeChangeSuccess", function(){
		$scope.show = false;
		$(".trans-div").hide();
	})
	$(".trans-div").click(function(){
		$scope.$apply(function(){
			$scope.show = false;
			$(".trans-div").hide();
		})
	})

}
function main($scope, $location, $http, posts, loader, pubsub){
	$scope.data = [];
	$scope.deletePost = function(post_id){
		$http.post("/delete-post",{post_id:post_id})
		.success(function(data){
			pubsub.publish("alert", data);
			$scope.data.posts.forEach(function(p, i){
				if(p.post_id === post_id){
					$scope.data.posts.splice(i,1);
				}
			})
		})
		.error(function(data){
			pubsub.publish("alert", data);
		})
	}
	$scope.runAfter = function(){
		$location.path("/user/"+$scope.loggedInUser.user_id+"/photos/albums/new");
	}
	$scope.flagPost = function(){
		alert("post has been flagged")
	}
	$scope.totalFriendsOnline = function(){
		var obj = $scope.friendsOnline;
	    var size = 0, key;
	    for (key in obj) {
	        if (obj.hasOwnProperty(key)) size++;
	    }
		return size;

	}
	$scope.setNavbarActive("home");
	$http.get("/home?json=true").success(function(data){
		$scope.data = data;
		$scope.allPosts = $scope.data.posts;
		console.log(data);
	});
	pubsub.subscribe("friendsOnline", function(data){
		$scope.friendsOnline = data;
	})
	$scope.searchFriends = function(){
		$http.get("/search-friends-by-name?query="+$scope.idSomeoneSearchBar).success(function(data){
			$scope.friendsMatching = data;
		});
	}
	$scope.addToIds = function(user){
		var alreadyIn = false;
		$scope.idSomeoneSearchBar = "";
		$scope.friendsMatching = [];
		if(!$scope.friendsIdList){
			$scope.friendsIdList = [];
		}
		for(var i = 0; i<$scope.friendsIdList.length; i++){
			if($scope.friendsIdList[i].user_id === user.user_id){
				alreadyIn = true;
			}
		}
		if(!alreadyIn){
			$scope.friendsIdList.push(user);
		}
		
	}
	$scope.removeFromIds = function(index){
		$scope.friendsIdList.splice(index,1);
	}
	$scope.newPost = function(){
		
		var mention = 0, post = newPostForm.status.value;
		var ids = $scope.friendsIdList || [];
		posts.newPost(mention, post, $scope.data.posts, null, null, ids, function(){
			$(newPostForm.status).val("");
			$scope.friendsIdList = [];
			$scope.showIdSomeone = false;
		})
		
	}
	$scope.newComment = function(){
		var comment_body = this.comment_body,
		post_id = this.post.post_id,
		that = this;
		if(!comment_body){return;}
		$http.post("/new-comment", {post_id:post_id, comment_body:comment_body}).success(function(data){
			that.post.comments = that.post.comments || [];
			that.post.comments.push({
				comment_id: data.comment_id,
				comment_body: comment_body,
				post_id: post_id,
				fname: $scope.loggedInUser.fname,
				lname: $scope.loggedInUser.lname,
				profile_pic: $scope.loggedInUser.profile_pic,
				user_id: $scope.loggedInUser.user_id
			})
			that.comment_body = "";
		})
	}

	$scope.likePost = function(){
		var that;
		that = this; 
		if(!this.post.liked_post){
			console.log("like")
			$http.get("/like-post/"+this.post.post_id).success(function(data){
				that.post.like_count += 1;
				that.post.liked_post = true;
			})
		}
		else{
			console.log("unliking")
			$http.get("/unlike-post/"+this.post.post_id).success(function(data){
				that.post.like_count -= 1;
				that.post.liked_post = false;
			})
		}
		
	}
	$scope.openChat = function(){
		pubsub.publish("openChat", this.friend.user_id);
	}
	$scope.getUserPosts = function(){
		if(!$scope.userPosts){
			$http.get("/get-user-posts").success(function(data){
				$scope.data.posts = data;
				$scope.userPosts = data;
			})
		}
		else{
			$scope.data.posts = $scope.userPosts
		}
		
	}
	$scope.getAllPosts = function(){
		$scope.data.posts = $scope.allPosts;
	}
	$scope.getUserSchoolPosts = function(){
		if(!$scope.userSchoolPosts){
			$http.get("/get-user-school-posts").success(function(data){
				$scope.data.posts = data;
				$scope.userSchoolPosts = data;
			})
		}
		else{
			$scope.data.posts = $scope.userSchoolPosts;
		}
		
	}
	$scope.setTitle("sCOOLME");
}

function profile($scope, $http, $routeParams, $location, posts, pubsub){
	$scope.data = [];
	// this means they are trying to get the route /profile
	if(!$routeParams.id){
		$scope.profile = true;
		$http.get("/profile?json=true").success(function(result){
			$scope.data = result;
			$scope.setTitle($scope.data.fname+" "+$scope.data.lname);
			var offset = new Date().getTimezoneOffset();
			offset *= 60;
			$scope.data.birthdate += offset;
			$scope.profileGot = true;
		})
	}
	// this means they are trying to get the route /user/:id
	else{
		//If in fact the profile they are looking at is their profile redirect them to /profile
		if(+$routeParams.id === +$scope.loggedInUser.user_id){
			$location.path("/profile");
			$location.replace();
		}
		else{
			pubsub.publish("other profile", {user_id: $routeParams.id});
		}
		$http.get("/user/"+$routeParams.id+"?json=true").success(function(result){
			$scope.data = result;
			$scope.setTitle($scope.data.fname+" "+$scope.data.lname);
		})

	}
	$scope.deletePost = function(post_id){
		$http.post("/delete-post",{post_id:post_id})
		.success(function(data){
			pubsub.publish("alert", data);
			$scope.data.posts.forEach(function(p, i){
				if(p.post_id === post_id){
					$scope.data.posts.splice(i,1);
				}
			})
		})
		.error(function(data){
			pubsub.publish("alert", data);
		})
	}
	$scope.newPost = function(){
		var mention = 0, post = angular.element(newPostForm.status).val(),
		p = newPostForm.status;
		console.log(newPostForm)
		if(!post){
			return;
		}
		if(!$scope.profile){
			mention = $routeParams.id;
		}

		posts.newPost(mention, post, $scope.data.posts, null, null, [], function(){
			angular.element(newPostForm.status).val("")
		})

	}
	$scope.newComment = function(){
		var comment_body = this.comment_body,
		post_id = this.post.post_id,
		that = this;
		if(!comment_body){return;}
		$http.post("/new-comment", {post_id:post_id, comment_body:comment_body}).success(function(data){
			that.post.comments = that.post.comments || [];
			that.post.comments.push({
				comment_id: data.comment_id,
				comment_body: comment_body,
				post_id: post_id,
				fname: $scope.loggedInUser.fname,
				lname: $scope.loggedInUser.lname,
				profile_pic: $scope.loggedInUser.profile_pic,
				user_id: $scope.loggedInUser.user_id
			})
			that.comment_body = "";
		})
	}
	$scope.requestFriendship = function(){
		if(!$scope.data.profile){
			$http.get("/request-friendship/"+$routeParams.id).success(function(data){
				if(data){
					$scope.data.requestSent = true;
				}
				pubsub.publish("alert", data);
			}).error(function(data){
				pubsub.publish("alert", data);
			})
		}
		else{
			return
		}
	}
	$scope.likePost = function(){
		var that;
		that = this; 
		if(!this.post.liked_post){
			console.log("likes")
			console.log($http.get);
			$http.get("/like-post/"+this.post.post_id).success(function(data){
				console.log(arguments)
				that.post.like_count += 1;
				that.post.liked_post = true;
			}).error(function(){
				console.log("error", arguments)
			})
		}
		else{
			console.log("unliking")
			$http.get("/unlike-post/"+this.post.post_id).success(function(data){
				that.post.like_count -= 1;
				that.post.liked_post = false;
			})
		}
		
	}
	$scope.chooseFromPhotos = function(){
		$scope.fromPhotos = true;
		$http.get("/get-user-photos").success(function(data){
			$scope.photos = data;
		})
	}
	$scope.selectAsPhoto = function(photo_id){
		$scope.selectedPhoto = photo_id;
	}
	$scope.confirmNewProfilePhoto = function(){
		$http.post("/new-profile-photo-from-photos", {photo_id: $scope.selectedPhoto}).success(function(data){
			console.log(data);
			$scope.data.profile_pic = data.filename;
			pubsub.publish("alert", {"success":"Profile photo changed successfully"})
			$scope.fromPhotos = false;
		})
	}
	pubsub.subscribe("friendsOnline", function(friends){
		if($scope.profileGot){
			if(!$scope.profile){
				if(friends[$routeParams.id]){
					$scope.online = true;
				}
			}
		}
		else{
			setTimeout(function(){
				if(!$scope.profile){
					if(friends[$routeParams.id]){
						$scope.online = true;
					}
				}
			},100)
		}
	})
}
function photos($scope, $http, $routeParams, $location, pubsub, $route){
	$scope.data = [];
	$http.get("/photos/"+$routeParams.id).success(function(data){
		$scope.data = data;
		pubsub.publish("dataLoaded:photos",[]);
	});
	$scope.show = false;
	if($location.search().photo){
		var photo_id = $location.search().photo;
		pubsub.subscribe("dataLoaded:photos", function(){
			var photos = $scope.data.photos;
			var photo;
			$scope.show = true;
			for(var i = 0; i< photos.length; i++){
				if(photos[i].photo_id === +photo_id){
					photo = photos[i];
					break;
				}
			}
			$scope.cPhoto = photo;
			$scope.cPhoto.cpydescription = photo.description;
			$scope.largerPhoto = photo.filename;
			$scope.comments = photo.comments;
			$scope.currentPhoto = photo_id;
			$scope.comment = "";
		})
		
	}
	$scope.deleteAlbum = function(id){
		var sure = confirm("Are you sure you want to delete this album it deletes all the photos in it as well?");
		if(sure){
			$http.post("/delete-album?album="+id).success(function(){
				$route.reload();
			}).error(function(){
				pubsub.publish("alert", {"error":"you do not have permission to delete this album"})
			});
		}
	}
	$scope.showPhoto = function(){
		$scope.cPhoto = this.photo;
		$scope.cPhoto.cpydescription = this.photo.description;
		$scope.show = true;
		$scope.largerPhoto = this.photo.filename;
		$scope.comments = this.photo.comments;
		$scope.currentPhoto = this.photo.photo_id;
		$scope.comment = "";
	}
	$scope.commentOnPhoto = function(){
		$http.post("/new-photo-comment", {comment:$scope.comment, photo_id:$scope.currentPhoto }).success(function(data){
			var liu = $scope.loggedInUser;
			console.log($scope.comments);

			var t = $scope.comments.push({
				user_id: liu.user_id,
				fname: liu.fname,
				lname: liu.lname,
				profile_pic:liu.profile_pic,
				comment_body:$scope.comment
			});
			console.log(t);
			$scope.comment = "";
		});

	}
	$scope.saveDescription = function(photo){
		$http.post("/edit-photo-description", {photo_id: photo.photo_id, description:photo.description}).success(function(){
			$scope.showEditPhotoDescription = false;
		});
	}
	$scope.cancelEdit = function(photo){
		photo.description = photo.cpydescription;
		$scope.showEditPhotoDescription = false;
	}
	$scope.deletePhoto = function(photo){
		var sure = confirm("Are you sure you want to delete this photo?")
		if(sure){
			$http.post("/delete-photo", {photo_id:photo.photo_id}).success(function(){
				$scope.show = false;
				var photos = $scope.data.photos;
				for(var i = 0; i< photos.length; i++){
					if(photos[i].photo_id === +photo.photo_id){
						$scope.data.photos.splice(i, 1);
					}
				}
				setTimeout(function(){
					$("[masonry]").masonry("reload");
				},0)
			});
		}
	}
}
function albums($scope, $http, $routeParams){
	$scope.showPhoto = function(){
		$scope.cPhoto = this.photo;
		$scope.cPhoto.cpydescription = this.photo.description;
		$scope.show = true;
		$scope.largerPhoto = this.photo.filename;
		$scope.comments = this.photo.comments;
		$scope.currentPhoto = this.photo.photo_id;
		$scope.comment = "";
	}
	$scope.saveDescription = function(photo){
		$http.post("/edit-photo-description", {photo_id: photo.photo_id, description:photo.description}).success(function(){
			$scope.showEditPhotoDescription = false;
		});
	}
	$scope.cancelEdit = function(photo){
		photo.description = photo.cpydescription;
		$scope.showEditPhotoDescription = false;
	}

	$scope.deletePhoto = function(photo){
		var sure = confirm("Are you sure you want to delete this photo?")
		if(sure){
			$http.post("/delete-photo", {photo_id:photo.photo_id}).success(function(){
				$scope.show = false;
				var photos = $scope.data.photos;
				for(var i = 0; i< photos.length; i++){
					if(photos[i].photo_id === +photo.photo_id){
						$scope.data.photos.splice(i, 1);
					}
				}
				setTimeout(function(){
					$("[masonry]").masonry("reload");
				},0)
			});
		}
	}
	$scope.commentOnPhoto = function(){
		$http.post("/new-photo-comment", {comment:$scope.comment, photo_id:$scope.currentPhoto }).success(function(data){
			var liu = $scope.loggedInUser;
			console.log($scope.comments);

			var t = $scope.comments.push({
				user_id: liu.user_id,
				fname: liu.fname,
				lname: liu.lname,
				profile_pic:liu.profile_pic,
				comment_body:$scope.comment
			});
			console.log(t);
			$scope.comment = "";
			setTimeout(function(){
				$(".photo-comments").scrollTop($(".photo-comments")[0].scrollHeight)
			},0)
			
		});

	}
	$scope.data ={};
	$scope.data.photos = [];

	$http.get("/album/"+$routeParams.album_id).success(function(data){
		$scope.data.photos = data;
		console.log(data)
	})
}
function newAlbumCtrl($scope, $http, $routeParams, $location){
	$http.get("/temp-album").success(function(data){
		$scope.data = data;
	})
	.error(function(data){
		$location.path("/photos");
	})

	$scope.newAlbum = function(){
		var albumName = newAlbumForm.newAlbumName.value;
		$http.post("/temp-album/new",{album_name: albumName}).success(function(data){
			$location.path("/user/"+$routeParams.id+"/photos/album/"+data.album_id);
		});
	}
	$scope.existingAlbum = function(){
		var album = existingAlbumForm.album.value;
		console.log(album)
		$http.post("/temp-album/existing", {album_id:album}).success(function(data){
			$location.path("/user/"+$routeParams.id+"/photos/album/"+data.album_id);
		});

	}
}

function eventCtrl($scope, $http, $location, pubsub, posts){
	$scope.data = {};
	
	$http.get("/get-events").success(function(data){
		$scope.data = data;
		$scope.eventsCpy = $scope.data.events;
		var lDate = 0;
		var lastIdx = 0;
		var dates = [];
		var times = [];
		var duplicates = {};
		$scope.data.events.sort(function(a, b){
			return a.start - b.start;
		})
		$scope.data.events.forEach(function(d, i){
			if(+new Date(d.start*1000) < +new Date()){
				$scope.data.events.splice(i,1);
				return;
			}
			$scope.data.events.forEach(function(t,n){
				if(t.event_id === d.event_id){
					if(duplicates[t.event_id]){
						$scope.data.events.splice(n, 1);
					}
					else{
						duplicates[t.event_id] = true;
					}
				}
			})
			var dt =  new Date(d.start * 1000);
			var day = dt.getUTCDate();
			var month = dt.getMonth()+1;
			var year = dt.getYear()+1900;
			var nDate = +new Date( month+"/"+day+"/"+year)
			var idx = lastIdx;
			if(nDate !== lDate){
				lDate = nDate;
				lastIdx = idx = dates.push([])-1;
				times[idx] = nDate;
			}
			dates[idx].push(d);
		});
		$scope.events = dates;
		$scope.dates = times;
	});
	$scope.topEvents = function(){
		var top = [],
			first, 
			middle, 
			last;
		first = middle = last = {count:0};
		if($scope.eventsCpy){
			$scope.topE = $scope.topE || [];
			if(!$scope.ranTopEvents){
				$scope.ranTopEvents = true;
				$scope.eventsCpy.forEach(function(e){
					if(e){
						$scope.topE.push(e);
					}
				});
				$scope.topE = $scope.topE.sort(function(a, b){
					return b.count - a.count;
				})
				$scope.topE.length = 5;
			}
			return $scope.topE;
			
		}
		
		
	}
	$scope.searchEventsNearYou = function(){
		if($scope.nearYou.location){
			$http.get("/events-near-location?location="+$scope.nearYou.location+"&distance="+$scope.nearYou.distance).success(function(data){
				$scope.eventsNearYou = data;
			}).error(function(){
				$scope.noEventsNearby = true;
			})
		}
	}
	$scope.attendEvent = function(event_id, datei, index){
		if($scope.events[datei][index].attending){
			return;
		}
		$http.post("/rsvp",{event:event_id, rsvp:3}).success(function(data){
			$scope.events[datei][index].attending = true;
			$scope.events[datei][index].count++;
			pubsub.publish("alert", {"success":"You are now attending the event"})
		})
	}
	$scope.notAttendEvent = function(event_id, datei, index){
		if(!$scope.events[datei][index].attending){
			return;
		}
		$http.post("/rsvp",{event:event_id, rsvp:1}).success(function(data){
			$scope.events[datei][index].attending = false;
			$scope.events[datei][index].count--;
			pubsub.publish("alert", {"success":"You are not attending the event"})
		})
	}
	
}
function searchPeople($scope, $http){
	$scope.people = [];
	$scope.searchPeople = function(){
		$http.get("/search-people?person="+$scope.searchTerm).success(function(people){
			console.log("hey!");
			console.log(people);
			$scope.people = people;
		})
	}
	$scope.clearSearch = function(){
		$scope.people = [];
		$scope.searchTerm = "";
	}
	$scope.$on("$routeChangeSuccess", function(){
		$scope.clearSearch();
	})
}
function newEventCtrl($scope, $http, $location){
	$scope.date = {start:"", end:""}
	$scope.time = {start:"", end:""}
	$scope.newEvent = function(){
		var form = newEventForm,
		data = {};
		data.description = $(form.description).val();
		data.title = $(form.title).val();
		data.location = $(form.location).val();
		data.privacy = +$(form.privacy).val();
		if($(form.can_invite).is(":checked")){
			data.can_invite = 1;
		}
		else{
			data.can_invite = 0;
		}
		data.start = (+new Date($scope.date.start+" "+$scope.time.start))/1000;
		if($scope.date.end){
			data.end = (+new Date($scope.date.end+" "+$scope.time.end))/1000;
		}
		$http.post("/new-event", data).success(function(data){
			$location.path("/events/event/"+data.event_id)
		})
	}
}

function eventDetailCtrl($scope, $http, $routeParams, $location, loader, pubsub, posts){
	$scope.event = {};
	$scope.noShowMention = true;
	$http.get("/get-event/"+$routeParams.id).success(function(data){
		if(data.error && data.error === "Not enough permissions to view event"){
			$location.path("/events")
		}
		$scope.event = data;
	})
	$scope.dEvent = function(){
		console.log("hey!")
		var sure = confirm("Are you sure you want to delete this event?");
		if(sure){
			$http.post("/delete-event/"+$routeParams.id, {}).success(function(data){
				$location.path("/events")
				$location.replace();
			})
		}
	}
	$scope.rsvp = function(rsvp){
		console.log("hey!!!")
		$http.post("/rsvp",{event:$routeParams.id, rsvp:rsvp}).success(function(data){
			$scope.event.rsvp = rsvp;
		})
	}
	$scope.loadFriends = function(){
		if(!$scope.friends){
			$http.get("/get-all-friends").success(function(data){
				$scope.friends = data;
				console.log(data);
				markAlreadyInClub(data);
				$scope.inviteListReady = true;
			})
		}
		function markAlreadyInClub(friends){
			$scope.event.guests.sort(compare);
			friends.forEach(function(f){
				if(find($scope.event.guests, f.user_id, 0, $scope.event.guests.length - 1, "user_id") > -1){
					f.alreadyInClub = true;
				}
			});
		}
		
		function compare(a,b){
			if(a.user_id < b.user_id){
				return -1;
			}
			if(a.user_id > b.user_id){
				return 1;
			}
			return 0;
		}
	}
	$scope.peopleSelected = function(){
		if($scope.invited){
			return $scope.invited.length;
		}
		else{
		 	return 0;
		}
	}
	$scope.addFriendToInviteList = function(user_id){
		if(!$scope.invited){
			$scope.invited = [];
		}
		
		var alreadyInArray = find($scope.invited, user_id, 0, $scope.invited.length -1);
		if(alreadyInArray > -1){
			$scope.invited.splice(alreadyInArray, 1);
		}
		else{
			$scope.invited.push(user_id);
		}
		$scope.invited.sort(function(a, b){
			return a - b;
		});
	}
	$scope.inviteList = function(){
		if(!$scope.invited.length) return;

		$http.post("/invite-to-event/"+$routeParams.id, {invites: $scope.invited}).success(function(data){
			pubsub.publish("alert", data);
			clearModal();

		}).error(function(data){
			pubsub.publish("alert", data);
			
		})
	}
	$scope.editContent = function(){
		$scope.eventCopy = angular.copy($scope.event);
		$scope.edit_content = !$scope.edit_content;
	}
	$scope.finishedEditing = function(){
		if($scope.eventCopy.date && $scope.eventCopy.time){
			$scope.eventCopy.start = (+new Date($scope.eventCopy.date+" "+$scope.eventCopy.time))/1000;
		}
		$scope.event = $scope.eventCopy;
		$scope.edit_content = false;
		$http.post("/edit-event/"+$routeParams.id, $scope.event).success(function(){
			pubsub.publish("alert", {"success":"Your changes were made successfully"})
		})
	}
	$scope.newPost = function(){
		var post = this.newPostBody;
		posts.newPost(0, post, $scope.event.posts, 3, $routeParams.id, [], function(){

		})
	}

	$scope.newComment = function(){
		console.log(this.post.post_id);
		posts.newComment(this.post.post_id, this.comment_body, this.post, function(){

		})
	}



	$scope.chooseFromPhotos = function(){
		$scope.fromPhotos = true;
		$http.get("/get-user-photos").success(function(data){
			$scope.photos = data;
		})
	}


	$scope.selectAsPhoto = function(photo_id){
		$scope.selectedPhoto = photo_id;
	}


	$scope.confirmNewClubPhoto = function(){
		$http.post("/new-event-photo-from-photos", {photo_id: $scope.selectedPhoto, event_id:$routeParams.id}).success(function(data){
			$scope.event.filename = data.filename;
			$scope.eventCopy.filename = data.filename;
			pubsub.publish("alert", {"success":"Event photo changed successfully"})
			$scope.fromPhotos = false;
		})
	}

	$scope.inviteSchool = function(){
		var years = {
			_2013:"2013",
			_2014:"2014",
			_2015:"2015",
			_2016:"2016"
		},
			finalYears = [];
		for(var i in $scope.school){
			if($scope.school.hasOwnProperty(i)){
				if($scope.school[i]){
					finalYears.push(years[i]);
				}
			}
		}
		console.log(finalYears)
		$http.post("/invite-school-years/"+$routeParams.id, {years:finalYears}).success(function(){
			pubsub.publish("alert", {"success":"People were invited successfully"})
			$scope.inviteSchoolMates = false;
		}).error(function(data){
			pubsub.publish("alert", data);
		})
	}
	

	var clearModal = $scope.clearModal = function(){
		$.each($scope.friends, function(i, el){
			if(el.selected){
				el.selected = false;
			}
		});
		$scope.friendModal = false;
		$scope.invited = [];
	}
}
function schoolsCtrl($scope, $http, $location, $routeParams, posts){
	$scope.noShowMention = true;
	$scope.setNavbarActive("schools");
	$scope.setTitle("Schools")
	var search;
	$scope.c = "";

	$scope.data = {};
	if($routeParams.id){
		$http.get("/get-school/"+$routeParams.id).success(function(data){
			console.log(data);
			$scope.data.school = data;
		});
	}
	else{
		$http.get("/get-school").success(function(data){
			console.log(data);
			$scope.data.school = data;
		});
	}
	
	$http.get("/get-schools").success(function(data){
		console.log(data);
		$scope.data.topSchools = data;
	});
	
	$scope.searchSchools = function(){
		console.log($scope.schoolSearch)
		$http.get("/search-schools?school="+$scope.schoolSearch).success(function(data){
			console.log(data);
			$scope.schools = data;
		})
	}
	$scope.newPost = function(){
		var that = this;

		posts.newPost(0, this.newPostBody, $scope.data.school.posts, 4, $scope.data.school.school_id, function(){
			that.newPostBody = "";
		})
	}
	$scope.newComment = function(){
		var that = this,
		comment_body = this.comment_body;
		posts.newComment(this.post.post_id, comment_body, this.post, function(){
			that.comment_body = "";
		})
	}
	$scope.changeClassification = function(){
		var c = $("#changeClass").val();

		if(!c){
			return;
		}
		if(c !== "all"){
			$scope.c = c;
			$http.get("/get-schools?classification="+c).success(function(data){
				$scope.data.topSchools = data;
			});
		}
		else{
			c = "";
		}
		
	}
	$scope.likePost = function(){
		var that;
		that = this; 
		if(!this.post.liked_post){
			console.log(this.post.post_id)
			$http.get("/like-post/"+this.post.post_id).success(function(data){
				that.post.like_count += 1;
				that.post.liked_post = true;
			})
		}
		else{
			console.log("unliking")
			$http.get("/unlike-post/"+this.post.post_id).success(function(data){
				that.post.like_count -= 1;
				that.post.liked_post = false;
			})
		}
		
	}
}
function schoolDetailCtrl($scope, $http, $routeParams, $location){

	$scope.data = {};
	$http.get("/get-school/"+$routeParams.id).success(function(data){
		$scope.data.school = data;
		$scope.setTitle(data.school_name)
	}).error(function(data, status){
		if(status === 404){
			$location.path("/404");
			$location.replace();
		}
	});
}

function buzzCtrl($scope, $http, $routeParams, $location, pubsub){
	$scope.c = {};
	$scope.photoDiv = {};
	$scope.setTitle("The Buzz! | YEA!");
	$scope.data = {};
	$http.get("/get-questions").success(function(data){
		$scope.data = data;
		$scope.cpydata = data;
	});
	$scope.answerQuestion = function(){
		var answer = this.comment;
		var that = this
		$http.post("/new-answer", {answer: answer, question_id: this.q.buzz_post_id}).success(function(data){
			that.q.answers.push({
				buzz_post_id: data.answer_id,
				body: answer,
				fname: $scope.loggedInUser.fname,
				lname: $scope.loggedInUser.lname,
				user_id: $scope.loggedInUser.user_id,
				profile_pic: $scope.loggedInUser.profile_pic,
				creation: (+new Date())/1000
			});
			that.comment = "";
			setTimeout(function(){
				$("[masonry2]").masonry("reload")
			},0)
			
		});

	}
	$scope.showPhoto = function(filename){
		$scope.photoDiv.shown = true;
		$scope.photoDiv.filename = filename;
	}
	$scope.closePhoto = function(){
		$scope.photoDiv.shown = false;
	}
	$scope.like = function(post_id){
		var that = this;
		console.log(that);
		$http.post("/like-buzz-post", {buzz_post_id: post_id}).success(function(data){
			if(data === "true"){
				that.q.liked = true;
				that.q.like_count++;
			}
			else{
				that.q.liked = false;
				that.q.like_count--;
			}
		});
	}
	$scope.changeCategory = function(category_id){
		if(!category_id){
			$scope.data = $scope.cpydata;
			$scope.c.category = '';
			return;
		}
		$scope.c.category = category_id;
		$http.get("/get-questions?cat="+category_id).success(function(data){
			$scope.data = data;
			setTimeout(function(){
				$("[masonry2]").masonry("reload")
			},200)
			
		});
	}
	$scope.addToAlbum = function(){
		var filename = this.q.filename;
		$http.post("/add-buzz-photo-to-album", {filename:filename}).success(function(){
			pubsub.publish("alert", {"success":"Image successfully added to your Buzz album"})
		})
	}
}
function questionDetailCtrl($scope, $http, $routeParams, $location){

}
function buzzCreateCtrl($scope, $http){
	$http.get("/get-categories").success(function(data){
		$scope.categories = data;
	})
}
function _404Ctrl(){

}
function chat($scope, socket, $timeout, $http, $rootScope, pubsub){
	$scope.superSecret = "hi";
	$scope.friendsOnline = {};
	$scope.chats = [];
	var chatLookup = {};
	socket.on("friendsOnline", function(data){
		$scope.friendsOnline = data;
		pubsub.publish("friendsOnline", $scope.friendsOnline);
	});
	socket.on("friendOnline", function(data){
		if(!$scope.friendsOnline[data.user_id]){
			$scope.friendsOnline[data.user_id] = data;
			pubsub.publish("friendsOnline", $scope.friendsOnline);
			
		}
		
	})
	socket.on("friendOffline", function(data){
		delete $scope.friendsOnline[data];
		pubsub.publish("friendsOnline", $scope.friendsOnline);
	});

	pubsub.subscribe("openChat", function(user_id){
		$scope.openChat(user_id)
	});
	$scope.$on("$routeChangeSuccess", function(){
		pubsub.publish("friendsOnline", $scope.friendsOnline);
	})
	socket.on("message", function(data){
		console.log(data);
		if(data.fromSelf){
			$scope.openChat(data.to);
			$scope.chats[chatLookup[data.to]].messages.push({
				reply: false,
				message: data.message
			});
		}
		else{
			$scope.openChat(data.from);
			$scope.chats[chatLookup[data.from]].messages.push({
				reply: true,
				message: data.message
			});
			if($scope.chats[chatLookup[data.from]].closed){
				$scope.chats[chatLookup[data.from]].unread++
			}
		}
		setTimeout(function(){
			$(".chat .messages").scrollTop(100000)
		},0)

	});
	socket.on("previousMessages", function(data){
		$scope.openChats = data.openChats;
		$scope.messages = data.previousMessages;
		data.previousMessages.forEach(function(d){
			var chat = d.to || d.from;
			if(data.openChats[chat]){
				$scope.openChat(chat);
			}
		});
	})
	socket.on("profilePhotoChange", function(data){
		$scope.chats[chatLookup[data.user_id]].profile_pic = data.filename
	});
	$scope.removeChat = function(index){
		$scope.chats.splice(index, 1);
		socket.emit("chatClosed", {index:index});
	}
	$scope.openChat = function(user_id){
		if(!chatExists(user_id)){
			if($scope.friendsOnline[user_id]){
				$scope.chats.push({
					user_id: user_id,
					fname: $scope.friendsOnline[user_id].fname,
					lname: $scope.friendsOnline[user_id].lname,
					profile_pic: $scope.friendsOnline[user_id].profile_pic,
					messages: [],
					closed:true,
					unread:0,
				});
				chatLookup[user_id] = $scope.chats.length - 1; 
			}
			else{
				$scope.chats.push({
					user_id: $scope.openChats[user_id].user_id,
					fname: $scope.openChats[user_id].fname,
					lname: $scope.openChats[user_id].lname,
					profile_pic: $scope.openChats[user_id].profile_pic,
					messages: []
				});
				chatLookup[user_id] = $scope.chats.length - 1; 
			}
			
			populateChat(user_id);
			setTimeout(function(){
				$(".chat .inputText")[chatLookup[user_id]].focus();
			},20)
		}
		if(chatLookup[user_id]){
			$(".chat .inputText")[chatLookup[user_id]].focus();
		}
		else{
			setTimeout(function(){
				$(".chat .inputText")[chatLookup[user_id]].focus();
			}, 200)
			
		}
				
		
		
	}
	$scope.sendMessage = function(user_id){
		socket.emit("message", {to: user_id, message: this.messageText});
		if(!$scope.chats[chatLookup[user_id]].messages){
			$scope.chats[chatLookup[user_id]].messages = [];
		}
		this.messageText = "";

	}
	function chatExists(user_id){
		var count = 0;

		$scope.chats.forEach(function(c){
			if(c.user_id == user_id){
				count += 1;
			}
		});
		if(count){
			return true;
		}
		else{
			return false;
		}
	}
	function populateChat(user_id){
		var chat = $scope.chats[chatLookup[user_id]]
		$scope.messages.forEach(function(d){
			if(d.to === user_id || d.from === user_id){
				if(d.to){
					chat.messages.push({
						reply: false,
						message: d.message
					});
				}
				else{
					chat.messages.push({
						reply: true,
						message: d.message
					});
				}
			}
		});
	}
	$scope.totalFriendsOnline = function(){
		var obj = $scope.friendsOnline;
	    var size = 0, key;
	    for (key in obj) {
	        if (obj.hasOwnProperty(key)) size++;
	    }
		return size;

	}
}
function notifications($scope, $http, pubsub, socket){
	$scope.notifications = [];
	socket.on("notifications", function(data){
		$scope.notifications = data;
	});
	socket.on("notification", function(data){
		$scope.notifications.unshift(data);
	})
	$scope.unseenNotifications = function(){
		var n = $scope.notifications,
		l = $scope.notifications.length,
		count = 0,
		i;
		for(i=0; i < l; i+=1){
			if(!(n[i].seen)){
				count += 1;
			}
		}
		return count;
	}
	pubsub.subscribe("closeDropdown", function(){
		$scope.show = false;
	})
	$scope.toggleDropdown = function(){
		if(!$scope.show){
			pubsub.publish("closeDropdown", []);
			$scope.notifications.forEach(function(n){
				n.seen = true;
			});
			$http.get("/seen-notifications")
			$(".trans-div").show();
		}
		else{
			$(".trans-div").hide();
		}
		$scope.show = !$scope.show
		
	}

	$scope.$on("$routeChangeSuccess", function(){
		$scope.show = false;
		$(".trans-div").hide();
	})
	$(".trans-div").click(function(){
		$scope.$apply(function(){
			$scope.show = false;
			$(".trans-div").hide();
		})
	})
}

function clubsCtrl($scope, $http){
	$scope.setTitle("Clubs");
	$scope.clubs = [];
	$scope.yourClubs = [];
	$http.get("/get-clubs").success(function(data){
		$scope.yourClubs = data;
	})
	$http.get("/club-hype").success(function(data){
		console.log(data);
		$scope.mostHype = data.mostHype;
		$scope.topClub = data.topClub;
		$scope.featured = data.featured;
	})
	$scope.searchClubs = function(){
		if(!$scope.club_search){
			$scope.clubs = [];
		}
		else{
			$http.get("/search-club?query="+$scope.club_search).success(function(data){
				$scope.clubs = data;
			});
		}
	}
}

function clubDetailCtrl($scope, $http, $routeParams, pubsub, $location, loader,$parse){
	$scope.club = {};
	$scope.posts = [];
	$http.get("/get-club/"+$routeParams.id).success(function(data){
		$scope.club = data; 
		$scope.setTitle(data.club_name);

		var columns = Math.ceil($scope.club.members.length / 4);
		$scope.columns = [];
		for(var i=0; i<columns; i++){
			$scope.columns.push({});
		}

	}).error(function(){
		$location.path("/404")
		$location.replace();
	});
	$http.get("/get-posts/2/"+$routeParams.id).success(function(data){
		$scope.posts = data;
	});
	$scope.askToJoinClub = function(){
		$http.get("/request-membership/"+this.club.club_id).success(function(data){
			$scope.club.requestSent = true;
			pubsub.publish("alert", data);
		}).error(function(data){
			pubsub.publish("alert", data);
		});;
	}
	$scope.loadFriends = function(){
		
		if(!$scope.friends){
			$http.get("/get-all-friends").success(function(data){
				console.log(data)
				$scope.friends = data;
				markAlreadyInClub(data);
				$scope.inviteListReady = true;
			})
		}
		function markAlreadyInClub(friends){
			$scope.club.members.sort(compare);
			friends.forEach(function(f){
				if(find($scope.club.members, f.user_id, 0, $scope.club.members.length - 1, "user_id") > -1){
					f.alreadyInClub = true;
				}
			});
		}
		
		function compare(a,b){
			if(a.user_id < b.user_id){
				return -1;
			}
			if(a.user_id > b.user_id){
				return 1;
			}
			return 0;
		}
	}
	$scope.peopleSelected = function(){
		if($scope.invited){
			return $scope.invited.length;
		}
		else{
		 	return 0;
		}
	}
	$scope.addFriendToInviteList = function(user_id){
		if(!$scope.invited){
			$scope.invited = [];
		}
		
		var alreadyInArray = find($scope.invited, user_id, 0, $scope.invited.length -1);
		if(alreadyInArray > -1){
			$scope.invited.splice(alreadyInArray, 1);
		}
		else{
			$scope.invited.push(user_id);
		}
		$scope.invited.sort(function(a, b){
			return a - b;
		});
	}
	$scope.inviteList = function(){
		if(!$scope.invited.length || !$scope.club.canInvite) return;

		$http.post("/invite-to-club/"+$routeParams.id, {invites: $scope.invited}).success(function(data){
			pubsub.publish("alert", data);
			clearModal();

		}).error(function(data){
			pubsub.publish("alert", data);
			
		})
	}
	var clearModal = $scope.clearModal = function(){
		$.each($scope.friends, function(i, el){
			if(el.selected){
				el.selected = false;
			}
		});
		$scope.friendModal = false;
		$scope.invited = [];
	}

	$scope.newPost = function(){
		var post = $(newPostForm).serializeObject();

		$http.post("/new-club-post/"+$routeParams.id, post).success(function(data){
			$scope.posts.push({
				post_id: data.post_id,
				user_id: $scope.loggedInUser.user_id,
				profile_pic: $scope.loggedInUser.profile_pic,
				fname: $scope.loggedInUser.fname,
				lname: $scope.loggedInUser.lname,
				post_body: newPostForm.post_body.value
			});
			newPostForm.post_body.value = "";
		}).error(function(data){
			pubsub.publish("alert", data);
		})

	}

	$scope.deletePost = function(post_id){
		$http.post("/delete-post",{post_id:post_id})
		.success(function(data){
			pubsub.publish("alert", data);
			$scope.posts.forEach(function(p, i){
				if(p.post_id === post_id){
					$scope.posts.splice(i,1);
				}
			})
		})
		.error(function(data){
			pubsub.publish("alert", data);
		})
	}

	$scope.joinClub = function(){
		$http.get("/join-club/"+$routeParams.id).success(function(data){
			pubsub.publish("alert", data);
			$scope.club.inClub = true;
		})
		.error(function(data){
			pubsub.publish("alert", data);
		})
	}
	
	$scope.newComment = function(){
		var comment_body = this.comment_body,
		post_id = this.post.post_id,
		that = this;
		if(!comment_body){return;}
		$http.post("/new-comment", {post_id:post_id, comment_body:comment_body}).success(function(data){
			that.post.comments = that.post.comments || [];
			that.post.comments.push({
				comment_id: data.comment_id,
				comment_body: comment_body,
				post_id: post_id,
				fname: $scope.loggedInUser.fname,
				lname: $scope.loggedInUser.lname,
				profile_pic: $scope.loggedInUser.profile_pic,
				user_id: $scope.loggedInUser.user_id
			})
			that.comment_body = "";
		})
	}

	$scope.likePost = function(){
		var that;
		that = this; 
		if(!this.post.liked_post){
			console.log("like")
			$http.get("/like-post/"+this.post.post_id).success(function(data){
				that.post.like_count += 1;
				that.post.liked_post = true;
			})
		}
		else{
			console.log("unliking")
			$http.get("/unlike-post/"+this.post.post_id).success(function(data){
				that.post.like_count -= 1;
				that.post.liked_post = false;
			})
		}
		
	}

	

}
function find(array, target, first, last, key){
		var mid = Math.floor((first + last) / 2);
		var compare;
		if(first > last){
			return -1;
		}
		if(key){
			compare = array[mid][key]
		}
		else{
			compare = array[mid]
		}

		if(compare === target){
			return mid;
		}
		if(compare > target){
			
			return find(array, target, first, mid -1, key);
		}
		else{

			return find(array, target, mid+1, last, key);
		}
	}
function clubCreateCtrl($scope, $http, $routeParams, pubsub, $location){

	$scope.formClub = function(){
		console.log($(new_club_form).serializeObject())
		$http.post("/form-club", $(new_club_form).serializeObject()).success(function(data){
			$location.path("/clubs/club/"+data.club_id);
		})
	}
}

function clubModCtrl($scope, $http, $routeParams, pubsub, $location){
	$scope.setTitle("Club Requests");
	$http.get("/club-requests/"+$routeParams.id).success(function(data){
		$scope.clubRequests = data;
		console.log(data);
	}).error(function(data){
		$location.path("/clubs/club/"+$routeParams.id);
		pubsub.publish("alert", data);
	});
	$http.get("/get-club/"+$routeParams.id).success(function(club){
		$scope.club = club;
	})

	$scope.inviteToClub = function(club_request_id){
		var that = this;
		$http.post("/resolve-club-request/"+$routeParams.id, {club_request_id: club_request_id, answer: true}).success(function(data){
			pubsub.publish("alert", data);
			$scope.clubRequests.splice(that.$index, 1);
		}).error(function(data){
			pubsub.publish("alert", data);
		});
	}
	$scope.declineMembership = function(club_request_id){
		var that = this;
		$http.post("/resolve-club-request/"+$routeParams.id, {club_request_id: club_request_id, answer: false}).success(function(data){
			pubsub.publish("alert", data);
			$scope.clubRequests.splice(that.$index, 1);
		}).error(function(data){
			pubsub.publish("alert", data);
		});
	}
	$scope.updateData = function(field){
		var d = {};
		d[field] = $scope.club[field];
		$http.post("/update-club/"+$routeParams.id, d).success(function(data){
			pubsub.publish("alert", data)
		})
		.error(function(data){
			pubsub.publish("alert", data)
		})
	}
	$scope.runAfter = function(){
		$scope.club.club_photo = $scope.response.fileName;
	}
	$scope.modUser = function(user_id){
		var sure = confirm("Are you sure you want to mod this user?\n They will have all the priviledges you do");
		if(sure){
			$http.post("/mod-user/"+$routeParams.id+"?user="+user_id).success(function(data){
				pubsub.publish("alert", data);
			}).error(function(data){
				pubsub.publish("alert", data);
			})
		}
	}
	$scope.banUser = function(user_id){
		var sure = confirm("Are you sure you want to ban this user?");
		if(sure){
			$http.post("/ban-user/"+$routeParams.id+"?user="+user_id).success(function(data){
				pubsub.publish("alert", data);
			}).error(function(data){
				pubsub.publish("alert", data);
			})
		}
	}
	$scope.chooseFromPhotos = function(){
		$scope.fromPhotos = true;
		$http.get("/get-user-photos").success(function(data){
			$scope.photos = data;
		})
	}
	$scope.selectAsPhoto = function(photo_id){
		$scope.selectedPhoto = photo_id;
	}
	$scope.confirmNewClubPhoto = function(){
		$http.post("/new-club-photo-from-photos", {photo_id: $scope.selectedPhoto, club_id:$routeParams.id}).success(function(data){
			$scope.club.club_photo = data.filename;
			pubsub.publish("alert", {"success":"Club photo changed successfully"})
			$scope.fromPhotos = false;
		})
	}
}

function pointsCtrl($scope, $http, pubsub, $location){
	$scope.setTitle("Get Points!")
}

function postCtrl($scope, $http, $location, $routeParams){
	$scope.post = {};
	$http.get("/post/"+$routeParams.id+"?json=true").success(function(data){
		$scope.post = data;
	}).error(function(error){
		console.log(arguments);
		if(error){
			console.log(error);
		}
	});
	$scope.newComment = function(){
		var comment_body = this.comment_body,
		post_id = this.post.post_id,
		that = this;
		if(!comment_body){return;}
		$http.post("/new-comment", {post_id:post_id, comment_body:comment_body}).success(function(data){
			that.post.comments = that.post.comments || [];
			that.post.comments.push({
				comment_id: data.comment_id,
				comment_body: comment_body,
				post_id: post_id,
				fname: $scope.loggedInUser.fname,
				lname: $scope.loggedInUser.lname,
				profile_pic: $scope.loggedInUser.profile_pic,
				user_id: $scope.loggedInUser.user_id
			})
			that.comment_body = "";
		})
	}

	$scope.likePost = function(){
		var that;
		that = this; 
		if(!this.post.liked_post){
			console.log("like")
			$http.get("/like-post/"+this.post.post_id).success(function(data){
				that.post.like_count += 1;
				that.post.liked_post = true;
			})
		}
		else{
			console.log("unliking")
			$http.get("/unlike-post/"+this.post.post_id).success(function(data){
				that.post.like_count -= 1;
				that.post.liked_post = false;
			})
		}
		
	}

}
function alertCtrl($scope, $http, pubsub, socket){
	pubsub.subscribe("alert", function(alert){
		var key;
		for(var k in alert){
			if(alert.hasOwnProperty(k)){
				key = k;
			}
		}
		applyAlert(key, alert[key]);
	});
	function applyAlert(alertType, alert){
		$scope.alertType = alertType;
		$scope.alertMessage = alert;
		$scope.alertActive = true;
	}
}
function admin(){

}
function runJquery(){
	$(".showMore").live("click", function(){
	    $(this).siblings("span").show();
	    $(this).text("Show less").removeClass("showMore").addClass("showLess");
	})
	$(".showLess").live("click", function(){
	    $(this).siblings("span").hide();
	    $(this).text("Show less").removeClass("showLess").addClass("showMore");
	})
}
function logout($location){
	$("body").hide();
	window.location.reload();
}
function cssCtrl($scope, $location, $http, pubsub){
	var css = {
		1:"background1",
		2:"background2",
		3:"background3",
		4:"background4",
		5:"background5",
		6:"background6",
		7:"background7",
		8:"background8",
		9:"background9",
		10:"background10",
		11:"background11",
		12:"background12",
		13:"background13",
		14:"background14",
		15:"background15",
		16:"background16",
		17:"background17",
		18:"background18",
		19:"background19",
		1000:"clay"
	}
	pubsub.subscribe("other profile", function(data){
		$("body").removeClass()
		$http.get("/user-css?user="+data.user_id).success(handleSuccess)
	})
	$http.get("/user-css").success(function(data){
		$("body").addClass(css[data.background_id]);
		$scope.userBackground = data.background_id;
	})
	pubsub.subscribe("background color change", function(id){
		$scope.userBackground = id;
	})
	$scope.$on("$routeChangeSuccess", function(){
		if(!$("body").hasClass(css[$scope.userBackground])){
			$("body").removeClass();
			$("body").addClass(css[$scope.userBackground])
		}
		if(!$scope.userBackground){
			$http.get("/user-css").success(handleSuccess)
		}
		
	})
	function handleSuccess(data){
		
		$("body").addClass(css[data.background_id]);
	}
	

}
function sportsCtrl($scope, $http, $location, pubsub){
	var sport = $location.search().sport || "";
	$http.get("/get-sports-posts?sport="+sport).success(function(data){
		console.log(data);
		$scope.posts = data;
	})
	$scope.newPost = function(){

	}
	$scope.runAfter =  function(){
		window.location.reload();
	}
}

function backgroundCtrl($scope, $http, pubsub){
	$scope.backgrounds = [
		 "background0",
		// "background1",
		// "background2",
		// "background3",
		// "background4",
		// "background5",
		// "background6",
		// "background7",
		// "background8",
		// "background9",
		// "background10",
		// "background11",
		// "background12",
		"background13",
		//"background14",
		"background15",
		"background16",
		"background17",
		//"background18",
		//"background19",
	]
	var translate = {0:0,1:13,2:15,3:16,4:17}
	$scope.unlocked = [];
	$http.get("/get-gradients").success(function(d){
		$scope.unlocked = d.unlocked;
		$scope.current = d.current;
	})
	$scope.isLocked = function(index){
		return false;
		if(index <= 2){
			return false
		}
		else{
			for(var i=0; i < $scope.unlocked.length; i++){
				if(index === $scope.unlocked[i].background_id){
					return false;
				}
			}
			return true;
		}
	}
	$scope.isCurrentGradient = function(index){
		console.log(index, $scope.current)
		if(translate[index] === $scope.current){
			return true;
		}
	}
	$scope.changeBackground = function(index){
		
		if(!$scope.isLocked(index)){
			pubsub.publish("background color change", translate[index])
			$("body").removeClass().addClass($scope.backgrounds[index])
			$http.get("/change-background?background="+translate[index])
			$scope.current = translate[index];
		}
		
	}
}
function friendsCtrl($scope, $http, $routeParams){
	$http.get("/get-friends/"+$routeParams.id).success(function(data){
		$scope.friends = data;
	})
}

function editProfileCtrl($scope, $http, $location, $routeParams, pubsub){
	$scope.schools = ["Alta","Altamont","American Fork","American Leadership","Bear River","Beaver","Ben Lomond","Bingham","Bonneville","Bountiful","Box Elder","Brighton","Bryce Valley","Canyon View","Carbon","Cedar City","Clearfield","Concordia Prep","Copper Hills","Cottonwood","Cross Creek","Cyprus","Davis","Delta","Desert Hills","Diamond Ranch","Dixie","Duchesne","Dugway","East","Emery","Enterprise","Escalante","EskDale","Fremont","Grand County","Granger","Grantsville","Green River","Gunnison","Herriman","Highland","Hillcrest","Hunter","Hurricane","Intermountain Christian","Jordan","Juab","Juan Diego Catholic","Judge Memorial","Kanab","Kearns","Layton","Layton Christian","Legacy Prep","Lehi","Logan","Lone Peak","Maeser Prep","Manila","Manti","Maple Mountain","Merit Academy","Milford","Millard","Monticello","Monument Valley","Morgan","Mount Vernon","Mountain Crest","Mountain View","Murray","Navajo Mountain","North Sanpete","North Sevier","North Summit","Northridge","Oakley","Ogden","Olympus","Orem","Panguitch","Park City","Parowan","Payson","Pine View","Pinnacle","Piute","Pleasant Grove","Provo","Rich","Richfield","Riverton","Rockwell","Rowland Hall","Roy","Saint Joseph","Salem Hills","Salt Lake Performing Arts","San Juan","Sky View","Skyline","Snow Canyon","South Sevier","South Summit","Spanish Fork","Springville","Stansbury","Summit Academy","Syracuse","Tabiona","Taylorsville","Timpanogos","Timpview","Tintic","Tooele","Tuacahn","Uintah","Uintah River","Union","USDB","Valley","Viewmont","Wasatch","Wasatch Academy","Waterford","Wayne","Weber","Wendover","West","West Desert","West Jordan","West Ridge","Westlake","Whitehorse","Woods Cross"];

	$http.get("/edit-profile").success(function(data){
		$scope.data = data;
	})

	$scope.editProfile = function(){
		
		var data = {
			tag_line: $scope.data.tag_line,
			school_name: $scope.data.school,
			graduation: $scope.data.graduation,
			relationship_status: $scope.data.relationship_status,
			hometown: $scope.data.hometown,
			city: $scope.data.city,
			state: $scope.data.state,
			sports: $scope.data.sports,
			favorite_activities: $scope.data.favorite_activities,
			favorite_school_subject: $scope.data.favorite_school_subject,
			interests: $scope.data.interests
		}
		$http.post("/edit-profile", data).success(function(){
			$location.path("/profile");
			pubsub.publish("alert", {success:"Changes were successfully made"})
		}).error(function(data){
			pubsub.publish("alert", data);
		})
	}
}

function schoolStudentsCrtl($scope, $http, $routeParams){
	$http.get("/all-students/"+$routeParams.id).success(function(data){
		console.log(data);
		$scope.students = data;
		$scope.studentsCpy = data;
		$scope.pages = Math.ceil(data.length/20);
	})
	$scope.sort = function(letter){
		if(!letter){
			$scope.students = $scope.studentsCpy;
			return;
		}
		var newArray = [];
		$scope.studentsCpy.forEach(function(s){
			if(s.lname.charAt(0).toLowerCase() === letter){
				newArray.push(s);
			}
		});
		$scope.students = newArray;
	}
}

function peopleYouMayKnow($scope, $http){
	$http.get("people-you-may-know").success(function(data){
		$scope.peopleYouMayKnow = data;
	})
}
function accountSettingsCtrl($scope, $http, pubsub, $location){
	$http.get("/edit-profile").success(function(data){
		$scope.data = data;
	});
	$scope.editProfile = function(){
		var data = {
			email: $scope.data.email,
			password:$scope.password,
			new_password:$scope.new_password,
			confirm_password:$scope.confirm_password
		};
		$http.post("/account-settings", data).success(function(){
			$location.path("/profile");
			pubsub.publish("alert", {success:"Changes were successfully made"})
		}).error(function(data){
			pubsub.publish("alert", data);
		})
	}
}
function buzzPostDetailCtrl($scope, $http, $location, $routeParams){

}
$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};
if(!Array.prototype.forEach){
	console.log("hey!")
	Array.prototype.forEach = function(cb, scope){
		for(var i=0, len=this.length; i<len; i++){
			cb.call(scope, this[i], i, this);
		}
	}
}

