angular.module("Factory",[])
.factory("posts", function($http, $routeParams, $location, $rootScope){
	return{
		newPost: function(mention, post, posts, post_scope, reference_id, ids, cb){
			post_scope = post_scope || "";
			reference_id = reference_id || "";
			if(!$.trim(post)){
				return;
			}
			$http.post("/new-post", {post_body:post, mention_id:mention, post_scope: post_scope, reference_id: reference_id, ids: ids}).success(function(data){
				posts.push({
						post_date: +new Date(),
						post_body:post, 
						mention_id:mention, 
						fname:$rootScope.loggedInUser.fname, 
						lname:$rootScope.loggedInUser.lname, 
						user_id:$rootScope.loggedInUser.user_id,
						post_id: data.post_id,
						profile_pic: $rootScope.loggedInUser.profile_pic,
						date: (+new Date())/1000
					})
				
				if(cb){
					cb();
				}
			});
		},
		newComment: function(post_id, comment_body, post, cb){
			if(!$.trim(comment_body)){return;}
			$http.post("/new-comment", {post_id:post_id, comment_body:comment_body}).success(function(data){
				post.comments.push({
					comment_id: data.comment_id,
					comment_body: comment_body,
					post_id: post_id,
					fname: $rootScope.loggedInUser.fname,
					lname: $rootScope.loggedInUser.lname,
					profile_pic: $rootScope.loggedInUser.profile_pic,
					user_id: $rootScope.loggedInUser.user_id

				})
				cb();
			})
		},
		likePost: function(){

		},
		unlikePost: function(){

		}
	}
})
.factory("socket", function($rootScope){
	var socket = io.connect();
	return {
		on: function(eventName, callback) {
			socket.on(eventName, function(){
				var args = arguments;
				$rootScope.$apply(function(){
					callback.apply(socket, args);
				});
			});
		},
		emit: function(eventName, data, callback){
			socket.emit(eventName, data, function(){
				var args = arguments;
				$rootScope.$apply(function(){
					callback.apply(socket, args);
				});
			});
		}
	}
})
.factory("loader", function(){
	return{
		show:function(){
			$("#loader").removeClass("hide")
		},
		hide:function(){
			$("#loader").addClass("hide")
		}
	}
})
.factory("loader2", function($q, $window){
	return function(promise){
		return promise.then(function(r){
			$("#loader").addClass("hide")
			return r;
		}, function(r){
			$("#loader").addClass("hide")
			return $q.reject(r);
		})
	}
})
.factory('pubsub', function() {
		var cache = {};
		return {
			publish: function() { 
				var args = Array.prototype.slice.call(arguments, 0);
				var topic = args[0];
				var parameters;
				if(args.length > 1){
					parameters = args.slice(1);
				}
				cache[topic] && $.each(cache[topic], function() {
					this.apply(null, parameters || []);
				});
			},

			subscribe: function(topic, callback) {
				if(!cache[topic]) {
					cache[topic] = [];
				}
				cache[topic].push(callback);
				return [topic, callback]; 
			},

			unsubscribe: function(handle) {
				var t = handle[0];
				cache[t] && d.each(cache[t], function(idx){
					if(this == handle[1]){
						cache[t].splice(idx, 1);
					}
				});
			}
		}
})