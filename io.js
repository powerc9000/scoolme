/*
	Chat handler actaully works pretty good for <300 LOC
	Can handle multiple tabs open at a time
	Some improvements:
		Store the usercache in redis not a javascript object so that it can scale to multiple machines
		Get previous messages from the server and store them in redis so that you can populate the chat better.
*/

module.exports = function(io, sessionSecret, sessionStore, db, connect, cookie){
	var users = {};
	var userCache = {};
	var auth = false;
	var RedisStore = require('socket.io/lib/stores/redis'),
	redis = require("redis");
	pub    = redis.createClient(),
	sub    = redis.createClient(),
	client = redis.createClient();
	io.set('store', new RedisStore({
		redisPub : pub,
		redisSub : sub,
		redisClient : client
	}));
	io.set("log level", 1);
	//This makes sure the person is logged in
	io.set("authorization", function(data, accept){
		data.cookie = connect.utils.parseSignedCookies(cookie.parse(data.headers.cookie), sessionSecret)
		data.sessionID = data.cookie["connect.sid"];
		sessionStore.get(data.sessionID, function(err, session){
			if(session && session.auth){
				data.session = session;
				auth = true;
				accept(null, true)
			}
			else{
				accept(null, false)
			}
			
			
		})
	});

	
	io.sockets.on('connection', function (socket) {
		var user_id = socket.handshake.session.userdata.user_id;
		var session = socket.handshake.session;
		var userdata = socket.handshake.session.userdata;

		
		if(users[user_id]){
			users[user_id].push(socket.id);
		}
		else{
			users[user_id] = [socket.id]
		}
		socket.messages = [];
		socket.friendsOnline = {};


		if(userCache[user_id]){
			clearTimeout(userCache[user_id].timeout);
		}
		else{
			userCache[user_id] = {};
			userCache[user_id].friendsOnline = {};
			userCache[user_id].messages = [];
			userCache[user_id].chats = {};
			for(u in users){
				userdata.friends = userdata.friends || [];
				userdata.friends.forEach(function(f){
					//We want to coerce them
					if(u == f.user_id){
						userCache[user_id].friendsOnline[f.user_id] = f;
					}
				})
			}
		}
		
		socket.emit("friendsOnline", userCache[user_id].friendsOnline);
		for(f in userCache[user_id].friendsOnline){
			s = users[f];
			if(s && userCache[f]){
				if(!userCache[f].friendsOnline[user_id]){
					userCache[f].friendsOnline[user_id] = 
					{
						user_id: user_id, 
						fname: userdata.fname, 
						lname: userdata.lname, 
						profile_pic:userdata.profile_pic
					};
				};
				s.forEach(function(socket){
					var s = io.sockets.socket(socket);
					s.emit("friendOnline", {user_id: user_id, fname: userdata.fname, lname: userdata.lname, profile_pic:userdata.profile_pic});
				});
			}
		}
		
		socket.emit("previousMessages", {previousMessages: userCache[user_id].messages, openChats: userCache[user_id].chats});
		db.getNotifications(user_id, function(data){
			socket.emit("notifications", data);
		})
		socket.on("message", function(data){
			userCache[user_id].messages.push({
				to: data.to,
				message: data.message
			});
			if(userCache[user_id].friendsOnline[data.to]){
				if(users[data.to]){
					sendToAllConnectedSockets(data.to, "message", {message:data.message, from:user_id});
					addMessageToCache(data.to, user_id, data.message);
					sendToOtherTabs(socket.id, user_id, "message", {message:data.message, to: data.to, fromSelf: true});
				}
				db.newChatMessage(data.to, user_id, data.message);

				//Add to open chat lists so that we can tell the user what chats are open when the refresh the page
				if(!userCache[user_id].chats[data.to]){
					userCache[user_id].chats[data.to] = {
						user_id: userCache[user_id].friendsOnline[data.to].user_id,
						fname: userCache[user_id].friendsOnline[data.to].fname,
						lname: userCache[user_id].friendsOnline[data.to].lname,
						profile_pic: userCache[user_id].friendsOnline[data.to].profile_pic
					}
				}
				if(!userCache[data.to].chats[user_id]){
					userCache[data.to].chats[user_id] = {
						user_id: user_id,
						fname: userdata.fname,
						lname: userdata.lname,
						profile_pic: userdata.profile_pic
					}
				}
			}
		});
		socket.on("profilePhotoChange", function(data){
			for(f in userCache[user_id].friendsOnline){
				userCache[f].friendsOnline[user_id].profile_pic = data.filename
				sockets = users[f];
				data.user_id = user_id;
				sockets.forEach(function(s){
					io.sockets.socket(s).emit("profilePhotoChange", data);
				});
			}
		})
		socket.on("disconnect", function () {
			if(users[user_id]){
				users[user_id].forEach(function(s, i){
					if(s === socket.id){
						users[user_id].splice(i,1);
					}
				});
				if(users[user_id].length === 0){
					if(auth){
						userCache[user_id].timeout = 
						setTimeout(function(){
							notifyOffline(user_id);
						}, 1000 * 10)
					}
				}
			}
		});
		socket.on("chatClosed", function(index){
			userCache[user_id].chats.splice(index, 1);
		})
	});

	
	function cleanCache(user_id){
		delete users[user_id];
		delete userCache[user_id];
	}


	function sendToAllConnectedSockets(to, type, data){
		users[to].forEach(function(s){
			var socket = io.sockets.socket(s);
			socket.emit(type, data);

		});
	}
	function sendToOtherTabs(origin_socket_id, user_id, type, data){
		users[user_id].forEach(function(s){
			var socket = io.sockets.socket(s);
			if(s !== user_id){
				socket.emit(type, data);
			}
		});
	} 
	function addMessageToCache(to, from, message){
		userCache[to].messages.push({
			from: from,
			message: message
		});
	}

	//Notifys all friends clients that the user is now online
	function notifyOffline(user_id, callback){
		for(f in userCache[user_id].friendsOnline){
			delete userCache[f].friendsOnline[user_id];
			var sockets =  users[f];
			sockets.forEach(function(socket){
				s = io.sockets.socket(socket);
				s.emit("friendOffline", user_id);
			});
		}
		if(callback){
			callback();
		}
	}

	return{
		disconnectUser: function(user_id){
			auth = false;
			if(users[user_id]){
				var count = users[user_id].length;
				users[user_id].forEach(function(s, i){
					var socket = io.sockets.socket(s);
					socket.disconnect;
					if(count - 1 === i){
						notifyOffline(user_id, function(){
							cleanCache(user_id);
						});
					}
				});
			}
		},
		notification: function(notified, fname, lname, profile_pic, message, url){
			if(users[notified]){
				users[notified].forEach(function(s){
					io.sockets.socket(s).emit("notification", {notification_text:message, url:url, profile_pic:profile_pic, target_url:url, fname:fname, lname:lname, date: (+new Date())/1000});
				});
			}
			else{
			}
		}
	}
}
