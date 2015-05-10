var db = require("mysql"),
Promise = require("node-promise").Promise,
connection = db.createConnection({
	host: "localhost",
	user: "root",
	password: "",
	database: ""
});
connection.connect(function(err){
	if(err){
		;
	}
});
var S = require("string");
function QueriesCompleted(totalQueries, callback, data){
	var queries_ran = 0;
	var cb = false;
	var mainCb;
	var timeout = setTimeout(function(){
		if(!mainCb){
			callback(data);
		}
	},1000);
	return {
		complete: function(){
			
			clearTimeout(timeout);
			queries_ran += 1
			if(queries_ran === totalQueries){
				setTimeout(function(){
					if(cb){
						callback.call(null, data);
						cb = false;
						mainCb = true;
					}
				},300)
				cb = true;
			}
			else{
				cb = false;
				timeoout = setTimeout(function(){
					if(!mainCb){
						callback(data);
					}
				},1000)
			}
		},
		add_query: function(){
			totalQueries += 1;
			//console.log(totalQueries, queries_ran)
		}
	}
}
function getComments(post_id, callback){
	var data = [],
	query = connection.query("select comments.*, users.user_id, users.fname, users.lname, users.profile_pic from comments inner join users on users.user_id = comments.user_id where post_id = ?", [post_id]);
	query.on("result" , function(results){

		delete results.password;
		data.push(results);
    })
    query.on("end", function(){
    	callback(data);
    })
}

exports.getProfile = function(user_id, loggedin_user, callback){
	var promise = new Promise();
	var list = function(promises) {
	  var listPromise = new Promise();
	  for (var k in listPromise) promises[k] = listPromise[k];
	  
	  var results = [], done = 0;
	  
	  promises.forEach(function(promise, i) {
	    promise.then(function(result) {
	      results[i] = result;
	      done += 1;
	      if (done === promises.length) promises.resolve(results);
	    }, function(error) {
	      promises.reject(error);
	    });
	  });
	  
	  if (promises.length === 0) promises.resolve(results);
	  return promises;
	};
	var promisify = function(fn, receiver) {
	  return function() {
	    var slice   = Array.prototype.slice,
	        args    = slice.call(arguments, 0, fn.length - 1),
	        promise = new Promise();
	    
	    args.push(function() {
	      var results = slice.call(arguments),
	          error   = results.shift();
	      
	      if (error) promise.reject(error);
	      else promise.resolve.apply(promise, results);
	    });
	    
	    fn.apply(receiver, args);
	    return promise.promise;
	  };
	};
	var queries = 2;
	var queries_done = 0;
	var data = {posts:[]};
	// Don't want a pyrimid of death so this function checks queries done vs number of queries and run the callback when the all finish
	var query_complete = new QueriesCompleted(queries, promise.resolve, data);
	promise.promise.then(function(data){
		callback(data);
	})
	// This query gets all the posts by the user of directed at the user
	// SELECT posts.post_id, 
	// posts.post_date, 
	// posts.mention_id, 
	// posts.like_count, 
	// posts.user_id, 
	// posts.post_body, 
	// users.user_id, 
	// users.fname, 
	// users.lname, 
	// users.profile_pic, 
	// u2.user_id AS muser_id, 
	// u2.fname AS mfname, 
	// u2.lname AS mlname, 
	// u2.profile_pic AS mprofile_pic 
	// FROM posts 
	// inner join users on users.user_id = posts.user_id 
	// left join users AS u2 on u2.user_id = posts.mention_id 
	// WHERE posts.user_id = ? OR mention_id = ?
	exports.areFriends(user_id, loggedin_user, function(yaynay, requestSent){
			var query = connection.query("select posts.*, users.user_id, users.fname, users.lname, users.profile_pic, u2.user_id as muser_id, u2.fname as mfname, u2.lname as mlname, u2.profile_pic as mprofile_pic from posts inner join users on users.user_id = posts.user_id left join users as u2 on u2.user_id = posts.mention_id where posts.user_id = ? OR mention_id = ? order by posts.post_id desc", [user_id, user_id]);
			if(yaynay || user_id === loggedin_user){
				var results = [];
				query.on("result", function(r){
					query_complete.add_query();
					getComments(r.post_id, function(comments){
						r.comments = comments;
						data.posts.push(r);
						query_complete.complete();
					})

					query_complete.add_query();
					checkLiked(loggedin_user, r.post_id).
					then(function(like){
						r.liked_post = like;
						query_complete.complete()
					})

					query_complete.add_query();
					getMention(r.post_id, r.reference_id, r.post_scope, function(mention){
						r.mention_name = mention;
						query_complete.complete();
					})
					query_complete.add_query();
					getIds(r.post_id, function(ids){
						r.post_ids = ids;
						query_complete.complete();
					})
					if(r.post_type === 1){
						query_complete.add_query();
						connection.query("select filename from photos where photo_id = ?", [r.attachment_id], function(err, results){
							if(results.length){
								r.filename = results[0].filename;
							}
							query_complete.complete();
						});
					}
				});

				query.on("end", function(){
					query_complete.complete();
				});
			}
			else{
					query_complete.complete();
			}

			//This query gets the users info school and clubs and friends
			connection.query("SELECT * from users left join school_attending on school_attending.user_id = users.user_id left join schools on schools.school_id = school_attending.school_id WHERE users.user_id = ?", [user_id], function(err, results){
				//we want to only send the things the client needs to know and not the password and email
				results = results[0];
				data.fname = results.fname;
				data.lname = results.lname;
				data.user_id = user_id;
				data.profile_pic = results.profile_pic;
				data.birthdate = results.birthdate;
				data.sex = results.sex;
				data.graduation = results.graduation;
				data.school_id = results.school_id
				data.tag_line = results.tag_line;
				data.relationship_status = results.relationship_status;
				data.user_school_id = results.user_school_id;
				data.school_name = results.school_name
				data.areFriends = yaynay;
				data.requestSent = requestSent;
				data.hometown = results.hometown;
				data.city = results.city;
				data.state = results.state;
				data.sports = results.sports;
				data.favorite_activities = results.favorite_activities;
				data.favorite_school_subject = results.favorite_school_subject;
				data.interests = results.interests;
				data.profile = user_id === loggedin_user;
				query_complete.add_query();
				connection.query("select * from friendships inner join users on users.user_id = friendships.user_b where user_a = ?", [user_id], function(err, results){
					data.totalFriends = results.length;
					query_complete.complete();
				})
				query_complete.add_query();
				connection.query("select * from photos where user_id = ? limit 7", [user_id], function(err, results){
					data.showcase = results;
					query_complete.complete();
				});
				query_complete.add_query();
				connection.query("select clubs.club_name, clubs.club_id from club_members inner join clubs on clubs.club_id = club_members.club_id where user_id = ? limit 5", [user_id], function(err, d){
					data.clubs = d;
					query_complete.complete();
				})
				query_complete.add_query();
				connection.query("select profile_pic, user_id from users inner join friendships as f on users.user_id = f.user_a where f.user_b = ? limit 3", [user_id], function(err, results){
					data.fp = results;
					query_complete.complete();
				});
				query_complete.complete();

			});
		

	})
	
}

exports.getBasicUserInfo = function(user_id, callback){
	connection.query("select fname, user_id, lname, profile_pic from users where user_id = ?", [user_id], function(err,results){
		if(!err){
			callback(results[0])
		}
		else{
			callback(false, err);
		}
	})
}
exports.getUserIdbyAlbumId = function(album_id, callback){
	connection.query("select user_id from albums where album_id = ?", [album_id], function(err, results){
		callback(results[0].user_id);
	})
}
exports.deleteAlbum = function(album_id, callback){
	connection.query("delete from photos where album_id = ?", [album_id], function(){
		connection.query("delete from albums where album_id = ?", [album_id], function(){
			callback();
		})
	})
}
exports.peopleYouMayKnow = function(user_id, callback){
	connection.query("select u2.fname, u2.user_id, u2.lname, u2.profile_pic, count(*) as mutual_friends from users inner join friendships f1 on f1.user_a = users.user_id inner join friendships f2 on f2.user_b = f1.user_b inner join users u2 on u2.user_id = f2.user_a where users.user_id = ? and  u2.user_id != users.user_id and f2.user_a not in (select user_b from friendships where user_a = users.user_id) and f2.user_a not in (select requested from friend_requests where requester = ?) group by u2.user_id order by mutual_friends desc limit 3", [user_id, user_id], function(err, results){
		connection.query("select school_id from school_attending where user_id = ? ", [user_id], function(err, r){
			connection.query("select users.fname, users.lname, users.user_id, users.profile_pic from users inner join school_attending s on s.user_id = users.user_id where s.school_id = ? and s.user_id not in (select user_b from friendships where user_a = ?) and s.user_id not in (select requested from friend_requests where requester = ?) and users.user_id != ? limit 2", [r[0].school_id, user_id, user_id, user_id], function(err, r){
				results = results.concat(r);
				callback(results);
			})
		})
		
		
	})
}

exports.checkAuth = function(email, password, callback){
	connection.query("select * from users where email = ? and password = ?", [email, password], function(err, result){
		if(result.length){
			connection.query("select user_id, fname, lname, profile_pic from users inner join friendships as f on f.user_a = users.user_id where f.user_b = ?", [result[0].user_id], function(err, r){
				result[0].friends = r;
				callback(result[0]);
			})
			
		}
		else{
			callback(false);
		}
	})
}

exports.getHome = function(user_id, callback){
	var data = {posts:[]};
	var query_complete = new QueriesCompleted(0, callback, data);

	var query = connection.query("select posts.*, users.user_id, users.fname, users.lname, users.profile_pic, u2.user_id as muser_id, u2.fname as mfname, u2.lname as mlname, u2.profile_pic as mprofile_pic from posts inner join users on users.user_id = posts.user_id left join users as u2 on u2.user_id = posts.mention_id where posts.user_id = ? OR mention_id = ? order by posts.post_id desc", [user_id, user_id]);
	query.on("result", function(result){
		query_complete.add_query();
		getComments(result.post_id, function(comments){
			result.comments = comments;
			data.posts.push(result);
			query_complete.complete();
		})
		query_complete.add_query();

		checkLiked(user_id, result.post_id, function(like){
			result.liked_post = like;
			query_complete.complete();
		})
		query_complete.add_query();
		getIds(result.post_id, function(ids){
			result.post_ids = ids;
			query_complete.complete();
		})
		query_complete.add_query();
		getMention(result.post_id, result.reference_id, result.post_scope, function(mention){
			result.mention_name = mention;
			query_complete.complete();
		})
		if(result.post_type === 1){
			query_complete.add_query();
			connection.query("select filename from photos where photo_id = ?", [result.attachment_id], function(err, results){
				if(results.length){
					result.filename = results[0].filename;
				}
				query_complete.complete();
			});
		}

	})
	// query.on("end", function(){
	// 	query_complete.complete();
	// })
	q = connection.query("select u2.user_id from users Inner join friendships on user_a = users.user_id inner join users as u2 on friendships.user_b = u2.user_id where users.user_id = ?", [user_id]);
	q.on("result", function(result){
		var query = connection.query("select posts.*, users.user_id, users.fname, users.lname, users.profile_pic, u2.user_id as muser_id, u2.fname as mfname, u2.lname as mlname, u2.profile_pic as mprofile_pic from posts inner join users on users.user_id = posts.user_id left join users as u2 on u2.user_id = posts.mention_id where posts.user_id = ? order by posts.post_id desc", [result.user_id]);

		query.on("result", function(result){
			query_complete.add_query();
			getComments(result.post_id, function(comments){
				result.comments = comments;
				data.posts.push(result);
				query_complete.complete();
			})
			query_complete.add_query();

			checkLiked(user_id, result.post_id, function(like){
				result.liked_post = like;
				query_complete.complete();
			})
			query_complete.add_query();
			getMention(result.post_id, result.reference_id, result.post_scope, function(mention){
				result.mention_name = mention;
				query_complete.complete();
			})
			query_complete.add_query();
			getIds(result.post_id, function(ids){
				result.post_ids = ids;
				query_complete.complete();
			})
			if(result.post_type === 1){
				query_complete.add_query();
				connection.query("select filename from photos where photo_id = ?", [result.attachment_id], function(err, results){
					if(!results.length){
						query_complete.complete();
						return
					}
					result.filename = results[0].filename;
					query_complete.complete();
				})
			}
		})
	});

	
}

exports.newPost = function(user_id, post_body, mention_id, callback){
	var cont = function(){
		connection.query("Insert into posts (user_id, post_body, mention_id) VALUES (?,?,?)", [user_id, post_body, mention_id], function(err, result){
			callback(result.insertId);
		});
	}

	if(mention_id){
		exports.areFriends(user_id, mention_id, function(result){
			if(result){
				cont();
			}
			else{
				callback(false);
			}
		})
	}
	else{
		cont();
	}
}

exports.newPhotoPost = function(user_id, attachment_id, callback){
	connection.query("Insert into posts (user_id, attachment_id, post_type) VALUES (?,?, 1)", [user_id, attachment_id], function(err, result){
		if(callback){
			callback(result.insertId);
		}
		
	});
}

exports.getUserPosts = function(user_id, callback){
	var data = [],
	total = 0,
	done = 0;
	query = connection.query("select posts.*, users.fname, users.lname, users.user_id, users.profile_pic from posts inner join users on users.user_id = posts.user_id where posts.user_id = ?", [user_id]);

	query.on("result", function(r){
		total++
		getComments(r.post_id, function(d){
			r.comments = d;
			data.push(r);
			done++
		});
		total++
		checkLiked(user_id, r.post_id, function(like){
			r.liked_post = like;
			done++
		})
		total++
		getMention(r.post_id, r.reference_id, r.post_scope, function(mention){
			r.mention_name = mention;
			done++
		})
		if(r.post_type === 1){
			total++
			connection.query("select filename from photos where photo_id = ?", [r.attachment_id], function(err, results){
				if(!results.length){
					done++
					return
				}
				r.filename = results[0].filename;
				done++
			})
		}
	});
	query.on("end", function(){
		checkDone();
	});
	function checkDone(){
		if(total === done){
			callback(data)
		}
		else{
			setTimeout(function(){
				checkDone()
			},10);
		}
	}
}
exports.getUserSchoolPosts = function(user_id, callback){
	var data = [],
	total = 0,
	done = 0;
	connection.query("select * from school_attending where user_id =? and attending = 1 limit 1", [user_id], function(err, school){
		next(school[0]);
	});
	function next(school){
		query = connection.query("select posts.*, users.fname, users.lname, users.user_id, users.profile_pic from posts inner join users on users.user_id = posts.user_id where posts.reference_id = ? and posts.post_scope = 4", [school.school_id]);

		query.on("result", function(r){
			total++
			getComments(r.post_id, function(d){
				r.comments = d;
				data.push(r);
				done++
			});
			total++
			checkLiked(user_id, r.post_id, function(like){
				r.liked_post = like;
				done++
			})
			total++
			getMention(r.post_id, r.reference_id, r.post_scope, function(mention){
				r.mention_name = mention;
				done++
			})
			if(r.post_type === 1){
				total++
				connection.query("select filename from photos where photo_id = ?", [r.attachment_id], function(err, results){
					if(!results.length){
						done++
						return
					}
					r.filename = results[0].filename;
					done++
				})
			}
		});
		query.on("end", function(){
			checkDone();
		});
	}
	
	function checkDone(){
		if(total === done){
			callback(data)
		}
		else{
			setTimeout(function(){
				checkDone()
			},10);
		}
	}
}

exports.newComment = function(user_id, comment_body, post_id, callback){
	connection.query("select * from posts where post_id = ?", [post_id], function(err, r){
		if(r[0].post_type == 1){
			exports.newPhotoComment(user_id, {photo_id:r[0].attachment_id, comment: comment_body}, function(data){});
		}
	});
	connection.query("Insert into comments (user_id, comment_body, post_id) VALUES (?,?,?)", [user_id, comment_body, post_id], function(err, result){
		callback(result.insertId);
	});
}

exports.addPhoto = function(filename, user_id,callback){
	connection.query("insert into photos (user_id, filename) VALUES(?,?)", [user_id, filename], function(err, result){
		callback(result.insertId);
	});
}

exports.getPhotos = function(user_id, callback){
	var data = [];
	var complete = {
		done:0,
		total:0,
		init: function(data, cb){
			this.data = data;
			this.cb = cb;
		},
		complete:function(){
			if(++this.done === this.total){
				this.cb(this.data);
			}
		},
		add_one:function(){
			this.total++
		}
	}
	complete.init(data, callback);
	query = connection.query("SELECT * FROM photos where photos.user_id = ? order by photos.photo_id desc", [user_id]);
	query.on("result", function(r){
		complete.add_one();
		connection.query("select photo_comments.*, users.user_id, users.fname, users.lname, users.profile_pic from photo_comments inner join users on users.user_id = photo_comments.user_id where photo_id = ?", [r.photo_id], function(err, results){
			r.comments = results;
			data.push(r);
			complete.complete();
		})
	});
}

exports.getAlbumsForUser = function(user_id, callback){
	connection.query("select * from albums where user_id = ?", [user_id], function(err, result){
		callback(result);
	})
}

exports.addToAlbum = function(user_id, album_id, photos, callback){
	var data = true;
	var queryComplete  = new QueriesCompleted(photos.length, function(data){
		if(data){
			callback(album_id);
		}
		else{
			callback(false);
		}
		
	}, data);
	connection.query("select * from albums where album_id = ? and user_id = ?", [album_id, user_id], function(err, result){
		if(result.length){
			photos.forEach(function(photo){
				connection.query("update photos set album_id =? where photo_id = ?", [album_id, photo.photo_id], function(err, results){
					queryComplete.complete();
				})
			});
		}
		else{
			data = false;
			callback(false)
		}
	})
	
}

exports.createAlbum = function( user_id, album_name, callback ){
	connection.query("insert into albums set user_id = ?, name = ?", [user_id, album_name], function(err, result){
		callback(result.insertId);
	})
}

exports.getAlbum = function( album_id, callback ){
	var data = [];
	var complete = {
		done:0,
		total:0,
		init: function(data, cb){
			this.data = data;
			this.cb = cb;
		},
		complete:function(){
			if(++this.done === this.total){
				this.cb(this.data);
			}
		},
		add_one:function(){
			this.total++
		}
	}
	complete.init(data, callback);
	query = connection.query("select * from albums Left join photos on photos.album_id = albums.album_id where albums.album_id = ? order by photos.photo_id desc", [album_id]);
	query.on("result", function(r){
		complete.add_one();
		connection.query("select photo_comments.*, users.user_id, users.fname, users.lname, users.profile_pic from photo_comments inner join users on users.user_id = photo_comments.user_id where photo_id = ?", [r.photo_id], function(err, results){
			r.comments = results;
			data.push(r);
			complete.complete();
		})
	});
}

exports.likePost = function( user_id, post_id, callback ){
	connection.query("select * from likes where user_id =? AND post_id = ?",[user_id, post_id], function(err, result){
		if(!result.length){
			connection.query("insert into likes set user_id =?, post_id = ?",[user_id, post_id], function(err, result){
				connection.query("update posts set like_count = like_count + 1 where post_id = ?",[post_id], function(err, result){
					connection.query("select users.user_id, users.fname, users.lname from users inner join posts on posts.user_id = users.user_id where posts.post_id = ?", [post_id], function(err, results){
						callback(results[0]);
					})
				})
			})
		}
	})
}

exports.unlikePost = function( user_id, post_id, callback ){
	connection.query("select * from likes where user_id =? AND post_id = ?",[user_id, post_id], function(err, result){
		if(result.length){
			connection.query("delete from likes where user_id =? and post_id = ?",[user_id, post_id], function(err, result){
				connection.query("update posts set like_count = like_count - 1 where post_id = ?",[post_id], function(err, result){
					callback();
				})
			})
		}
	})
}
exports.getAlbums = function(user_id, callback){
	var data = [];

	query_done = QueriesCompleted(0, function(data){
		callback(data);
	}, data)
	query = connection.query("select * from albums where user_id = ? ", [user_id]);
	query.on("result", function(album){
		query_done.add_query();
		connection.query("select * from photos where album_id = ? order by photo_id desc", [album.album_id], function(err, result){
			album.totalPhotos = result.length;
			album.photo = result[0]
			data.push(album)
			query_done.complete();
		})
	})
}
exports.schoolEvents = function(user_id, school_id, callback){
	var now = (+new Date())/1000;
	var query = 
		"select "+ 
		"users.fname, "+
		"users.lname, "+
		"users.user_id, "+
		"events.event_id, "+
		"events.description, "+
		"events.start, "+
		"events.end, "+
		"events.title, "+
		"events.can_invite, "+
		"events.filename "+
		"from events "+
		"inner join users on users.user_id = events.creator_id "+
		"where events.privacy = 2 and users.user_school_id = ? and events.start >= ?",
	data = [],
	completed = QueriesCompleted(0, function(data){
		callback(data);
	}, data),
	query2;
	query2 = connection.query(query, [school_id, now]);

	query2.on("result", function(result){
		completed.add_query();
				
		getRsvp(user_id, result.event_id, function(rsvp){
			if(!rsvp){
				data.push(result)
			}
			completed.complete();
		});

		completed.add_query();
		connection.query("select * from event_invites where event_id = ? and attending = 3", [result.event_id], function(err, results){
			result.count = results.length;
			completed.complete();
		});
	})
	query2.on("end", function(){
		setTimeout(function(){
			if(!data.length){
				callback([]);
			}
		},200)
		
	})
}
exports.invitedTo = function(user_id, callback){
	var now = (+new Date())/1000;
	var query = 
		"select " +
		"users.fname, "+
		"users.lname, "+
		"users.user_id, "+
		"events.event_id, "+
		"events.description, "+
		"events.start, "+
		"events.end, "+
		"events.title, "+
		"events.can_invite, "+
		"events.filename "+
		" from events"+
		" inner join event_invites on event_invites.event_id = events.event_id"+
		" inner join users on users.user_id = events.creator_id"+
		" where event_invites.user_id = ? and events.start >= ?",
	data = [],
	completed = QueriesCompleted(0, function(data){
		callback(data);
	}, data),
 	query2;
 	query2 = connection.query(query, [user_id, now]);

	query2.on("result", function(result){
		completed.add_query();
				
		getRsvp(user_id, result.event_id, function(rsvp){
			if(!rsvp){
				data.push(result);
			}
			completed.complete();
		});

		completed.add_query();
		connection.query("select * from event_invites where event_id = ? and attending = 3", [result.event_id], function(err, results){
			result.count = results.length;
			completed.complete();
		});
	});
	query2.on("end", function(){
		setTimeout(function(){
			if(!data.length){
				callback([]);
			}
		},200)
		
	})
}

exports.friendsEvents = function(user_id, callback){
	var now = (+new Date())/1000;
	var query = 
	"select "+
	"friend.user_id, "+
	"friend.fname, "+
	"friend.lname, "+
	"events.title, "+
	"events.description, "+
	"events.start, "+
	"events.end, "+
	"events.event_id, "+
	"events.location, "+
	"events.filename "+
	"from users "+
	"inner join friendships on users.user_id = friendships.user_a "+
	"inner join users as friend on friend.user_id = friendships.user_b "+
	"inner join events on events.creator_id = friend.user_id " +
	"where users.user_id = ? and events.privacy > 0 and events.start >= ?",
	data = [],
	completed,
	query2;

	completed = QueriesCompleted(0, function(data){
		callback(data);
	}, data)

	query2 = connection.query(query, [user_id, now]);

	query2.on("result", function(result){
		completed.add_query();
		
		getRsvp(user_id, result.event_id, function(rsvp){
			if(!rsvp){
				data.push(result)
			}
			
			completed.complete();
		})
		completed.add_query();
		connection.query("select * from event_invites where event_id = ? and attending = 3", [result.event_id], function(err, results){
			result.count = results.length;
			completed.complete();
		});
	})
	query2.on("end", function(){
		setTimeout(function(){
			if(!data.length){
				callback([]);
			}
		},200)
		
	})
}


exports.eventsFriendsAttending = function(user_id, callback){
	var now = (+new Date())/1000;
	var data = [];
	var query = 
	"select Distinct " +
	"users.fname, "+
	"users.lname, "+
	"users.user_id, "+
	"events.event_id, "+
	"events.description, "+
	"events.start, "+
	"events.end, "+
	"events.title, "+
	"events.can_invite, "+
	"events.filename "+
	"from events "+
	"inner join users on users.user_id = events.creator_id "+
	"inner join event_invites on event_invites.event_id = events.event_id "+
	"inner join friendships on friendships.user_b = event_invites.user_id "+
	"inner join users as u2 on u2.user_id = friendships.user_a "+
	"where events.privacy = 3 or events.privacy = 1 and u2.user_id = ? and event_invites.attending = 3 and u2.user_id != friendships.user_b and events.start >= ?";

	var q2 = connection.query(query, [user_id, now]);
	var complete = {
		done:0,
		total:0,
		init: function(data, cb){
			this.data = data;
			this.cb = cb;
		},
		complete:function(){
			if(++this.done === this.total){
				this.cb(this.data);
			}
		},
		add_one:function(){
			this.total++
		}
	}
	complete.init(data, callback);
	q2.on("result", function(r){
		complete.add_one();
		getRsvp(user_id, r.event_id, function(rsvp){
			if(!rsvp){
				data.push(r);
			}
			complete.complete();
		});
		complete.add_one();
		connection.query("select * from event_invites where event_id = ? and attending = 3", [r.event_id], function(err, results){
			r.count = results.length;
			complete.complete();
		});
	});
	q2.on("end", function(){
		setTimeout(function(){
			if(!data.length){
				callback([]);
			}
		},200)
	})

	
}

exports.newEvent = function(data, callback){
	connection.query(
		"insert into events (description, title, start, end, creator_id, privacy, location, can_invite, lat, lng) VALUES (?,?,?,?,?,?,?,?,?,?)", 
		[data.description, data.title, data.start, data.end, data.creator_id, data.privacy, data.location, data.can_invite, data.geometry.lat, data.geometry.lng], 
		function(err, results){
			console.log(err);
			connection.query("insert into event_invites set user_id = ?, event_id = ?, attending = 3", [data.creator_id, results.insertId], function(err, results){
			})
			callback(results.insertId);
	})
}
exports.getEvent = function(user_id, event_id, school_id, callback){
	var query = 
	"select "+
	"users.user_id, "+
	"users.fname, "+
	"users.lname, "+
	"events.title, "+
	"events.description, "+
	"events.start, "+
	"events.end, "+
	"events.event_id, "+
	"events.location, "+
	"events.privacy, "+
	"events.filename, "+
	"events.can_invite "+
	"from events "+
	"inner join users on users.user_id = events.creator_id "+
	"where event_id = ?",
	total = 3,
	complete = 0,
	eventData;
	canAttend(user_id, event_id, school_id, function(yaynay){
		if(yaynay){
			connection.query(query, [event_id], function(err, result){
				eventData = result[0];
				connection.query("select * from event_invites where user_id = ? and event_id =?",[user_id, event_id], function(err, results){
					if(results.length){
						eventData.rsvp = results[0].attending;
					}
					else{
						eventData.rsvp = 0;
					}

					done();
				})
				connection.query("select users.user_id, event_invites.attending, users.fname, users.lname, users.profile_pic from event_invites inner join users on users.user_id = event_invites.user_id where event_id = ?",[event_id], function(err, results){
					eventData.guests = results;
					done();
				});
				connection.query("select posts.*, users.user_id, users.fname, users.lname, users.profile_pic, users.user_id from posts inner join users on users.user_id = posts.user_id where post_scope = 3 and reference_id = ?", [eventData.event_id], function(err, results){
					eventData.posts = [];
					var length = results.length;
					if(!length){
						done();
						return;
					}
					results.forEach(function(r, i){
						console.log(i);
						getComments(r.post_id, function(c){
							r.comments = c;
							eventData.posts.push(r);
							if(i+1 === length){
								done();
							}
						})
					});
				})
			})
		}
		else{
			callback({error: "Not enough permissions to view event"})
		}
		
	})
	function done(){
		complete += 1;
		if(complete === total){
			callback(eventData);
		}
	}
}
exports.getAttending = function(user_id, callback){
	var complete = {
		done:0,
		total:0,
		init: function(data, cb){
			this.data = data;
			this.cb = cb;
		},
		complete:function(){
			if(++this.done === this.total){
				this.cb(this.data);
			}
		},
		add_one:function(){
			this.total++
		}
	}
	var now = (+new Date())/1000
	console.log(now)
	var data = [];
	var query = 
	"select "+
	"users.user_id, "+
	"users.fname, "+
	"users.lname, "+
	"events.title, "+
	"events.description, "+
	"events.start, "+
	"events.end, "+
	"events.event_id, "+
	"events.location, "+
	"events.privacy, "+
	"events.filename "+
	"from events "+
	"inner join users on users.user_id = events.creator_id "+
	"inner join event_invites on event_invites.event_id = events.event_id "+
	"where event_invites.user_id = ? and event_invites.attending = 3 and events.start >= ?";

	query = connection.query(query, [user_id, now]);
	complete.init(data, callback);
	query.on("result", function(r){
		r.attending = true;
		data.push(r);
		complete.add_one();
		connection.query("select * from event_invites where event_id = ? and attending = 3", [r.event_id], function(err, results){
			r.count = results.length;
			complete.complete();
		});
	});
	query.on("end", function(){
		setTimeout(function(){
			if(!data.length){
				callback(data);
			}
			
		}, 500)
	})
}
exports.ownsEvent = function(event_id, user_id, callback){
	connection.query("select * from events where event_id = ? and creator_id = ?", [event_id, user_id], function(err, result){
		if(result.length){
			callback(true)
		}
		else{
			callback(false);
		}
	})
}
exports.addEventPhoto = function(filename, event_id){
	connection.query("update events set filename = ? where event_id = ?", [filename, event_id])
}
exports.rsvp = function(userdata, event_id, rsvp, callback){

	canAttend(userdata.user_id, event_id, userdata.user_school_id, function(yaynay){
		if(yaynay){
			connection.query("select * from event_invites where event_id = ? and user_id = ?", [event_id, userdata.user_id], function(err, results){
				if(results.length){
					connection.query("update event_invites set attending = ? where event_id= ? and user_id= ?", [rsvp, event_id, userdata.user_id], function(err, result){
						callback(true)
					})
				}
				else{
					connection.query("insert into event_invites set attending = ?, event_id = ?, user_id = ?", [rsvp, event_id, userdata.user_id], function(err, result){
						callback(true)
					})
				}
			})
		}
		else{
			callback(false)
		}
	})
}
exports.addFriendship = function(user_1, user_2){
	//We insert it twice so we can make queries either way 
	connection.query("insert into friendships set user_a = ?, user_b = ?", [user_1, user_2]);
	connection.query("insert into friendships set user_a = ?, user_b = ?", [user_2, user_1]);
}
exports.mutualFriends = function(user_1, user_2, callback){
	connection.query("select u2.fname, u2.lname, count(*) as mutual_friends from users inner join friendships on friendships.user_a = users.user_id inner join users as u2 on u2.user_id = friendships.user_b inner join friendships as f2 on f2.user_a = u2.user_id where f2.user_b = ? and users.user_id = ?", [user_1, user_2], function(err, results){
		callback(results);
	})
}
exports.getFriends = function(user_id, callback){
	connection.query("select users.fname, users.lname, users.user_id, users.profile_pic from users inner join friendships on friendships.user_a = users.user_id where friendships.user_b = ?", [user_id], function(err, results){
		callback(results);
	})
}
exports.areFriends = function(user_1, user_2, callback){
	connection.query("select * from friendships where user_a = ? and user_b = ?", [user_1, user_2], function(err, results){
		if(results.length){
			callback(true);
		}
		else{
			connection.query("select * from friend_requests where requester = ? and requested = ? or requester = ? and requested = ?", [user_1, user_2, user_2, user_1], function(err, results){
				if(results.length){
					callback(false, true)
				}
				else{
					callback(false, false)
				}
			})
		}
	})
}
exports.randomQuery = function(query, callback){
	connection.query(query,[],function(err, result){
		if(err){
			callback(err)
		}
		else{
			callback(result);
		}
	})
}
//requests a friendship OR if it has already been requested it adds the two as friends
exports.requestFriendship = function(requester, requested, callback){
	function next(){
		connection.query("select * from friend_requests where requester = ? and requested = ?", [requester, requested], function(err, results){
			if(!results.length){
				connection.query("select * from friend_requests where requester = ? and requested = ?", [requested, requester], function(err, results){
					if(!results.length){
						connection.query("insert into friend_requests set requester = ?, requested = ? ", [requester, requested]);
						callback(true, {"success": "friend request sent"})
					}
					else{
						connection.query("insert into friendships set user_a = ?, user_b = ?", [requester, requested]);
						connection.query("insert into friendships set user_a = ?, user_b = ?", [requested, requester]);
						connection.query("delete from friend_requests where requester = ? and requested = ? or requester = ? and requested = ? limit 1", [requester, requested, requested, requester]);
						callback(true, {"success": "You are now friends"})
					}
				})
			}
			else{
				callback(false, {"ggg":"You have already send a friend request to th in"})
			}
		})
	}
	exports.areFriends(requester, requested, function(yaynay){
		if(!yaynay){
			next();
		}
		else{
			connection.query("delete from friend_requests where requester = ? and requested = ? or requester = ? and requested = ? limit 1", [requester, requested, requested, requester]);
			callback(false, {"error": " You are already friends with this person"});
		}
	})
	
}
exports.getFriendRequests = function(user_id, callback){
	connection.query("select fname, lname, user_id from friend_requests inner join users on users.user_id = friend_requests.requester where requested = ?", [user_id], function(err, results){
		callback(results);
	})
}
exports.getSchools = function(userdata, classification, callback){
	var query;
	var args
	var state = "Utah"
	state = state.toLowerCase();
	if(classification){
		query = "select schools.*, count(schools.school_name) as c from schools left join school_attending on schools.school_id = school_attending.school_id where schools.state = ? and schools.classification = ? group by schools.school_name order by c desc limit 3";
		args = [state, classification];
	}
	else{
		query = "select schools.*, count(schools.school_name) as c  from schools left join school_attending on schools.school_id = school_attending.school_id where schools.state = ? group by schools.school_name order by c desc limit 3";
		args = [state];
	}
	connection.query(query, args, function(err, results){
		callback(results);
	})
}
exports.getStateSchoolClassifications = function(state, callback){
	connection.query("select distinct classification from schools where state = ? ", [state], function(err, results){
		callback(results)
	})
} 
exports.getSchool = function(user_id, school, callback){
	console.log(user_id ,
		"jesus")
	var complete = {
		done:0,
		total:0,
		init: function(data, cb){
			this.data = data;
			this.cb = cb;
		},
		complete:function(){
			if(++this.done === this.total){
				this.cb(this.data);
			}
		},
		add_one:function(){
			this.total++
		},
		get_total: function(){
			return this.total;
		}
	}
	var data;
	var posts = [];
	
	connection.query("select * from schools where school_id = ? limit 1", [school], function(err, results){
		if(results.length){
			data = results[0];
			complete.init(data, callback);
			data.posts = posts;
			q = connection.query("select posts.*, users.fname, users.lname, users.user_id, users.profile_pic from posts inner join users on users.user_id = posts.user_id where reference_id = ? and post_scope = 4", [school]);
			q.on("result", function(r){
				complete.add_one();
				getComments(r.post_id, function(comment){
					posts.push(r);
					r.comments = comment;
					complete.complete();
				});
				complete.add_one();
				checkLiked(user_id, r.post_id, function(like){
					r.liked_post = like;
					complete.complete();
				});
			});
			q.on("err", function(e){
			})
			q.on("end", function(){
				if(!complete.get_total()){
					callback(data);
				}
			})
		}
		else{
			callback(false);
		}
	})
}
exports.schoolUsersWhoAttend = function(school, callback){
	connection.query("select users.user_id, users.fname, users.lname from users inner join school_attending as sa on sa.user_id = users.user_id where sa.school_id = ? and sa.attending = ?", [school, 1], function(err, results){
		callback(results);
	})
}
exports.schoolAlumni = function(school, callback){
	connection.query("select users.user_id, users.fname, users.lname from users inner join school_attending as sa on sa.user_id = users.user_id where sa.school_id = ? and sa.attending = ?", [school, 0], function(err, results){
		callback(results);
	})
}
exports.changeProfilePhoto = function(filename, user_id, callback){
	connection.query("update users set profile_pic = ? where user_id = ? limit 1", [filename, user_id]);
}

exports.searchFriendsByName = function(user_id, name, callback){
	if(name){
		name = name.split(" ");
		fname = name[0];
		lname = name[1];
		if(lname){
			query = "select distinct users.fname, users.lname, users.user_id, users.profile_pic from users inner join friendships as f on f.user_a = users.user_id where f.user_b = ? and users.fname like ? and users.lname like ?";
			values = [user_id, fname+"%", lname+"%"]
		}
		else{
			query = "select distinct users.fname, users.lname, users.user_id, users.profile_pic from users inner join friendships as f on f.user_a = users.user_id where f.user_b = ? and users.fname like ? or users.lname like ?"
			values = [user_id, fname+"%", fname+"%"]
		}
		connection.query(query, values, function(err, results){
			console.log(err);
			callback(results);
		})
	}
	else{
		callback([])
	}
	
}
exports.searchPeopleByName = function(name, callback){
	if(name){
		name = name.split(" ");
		fname = name[0];
		lname = name[1];
		if(lname){
			query = "select distinct users.fname, users.lname, users.user_id, users.profile_pic from users where users.fname like ? and users.lname like ? limit 10";
			values = [fname+"%", lname+"%"]
		}
		else{
			query = "select distinct users.fname, users.lname, users.user_id, users.profile_pic from users where users.fname like ? or users.lname like ? limit 10"
			values = [fname+"%", fname+"%"]
		}
		connection.query(query, values, function(err, results){
			console.log(err);
			callback(results);
		})
	}
	else{
		callback([])
	}
	
}
exports.putInProfilePictureInAlbum = function(filename, user_id, callback){
	connection.query("select * from albums where name = 'Profile Pictures' and user_id = ?", [user_id], function(err, results){
		if(results.length){
			putInAlbumAndPhotos(filename, results[0].album_id, user_id)
		}
		else{
			connection.query("insert into albums set name = 'Profile Pictures', user_id = ?", [user_id], function(err, results){
				putInAlbumAndPhotos(filename, results.insertId, user_id);
			})
		}
	})
	function putInAlbumAndPhotos(filename, album_id, user_id){
		connection.query("insert into photos set user_id = ?, album_id = ?, filename = ?", [user_id, album_id, filename])
	}
}

exports.getQuestions = function(user_id, cat, callback){
	var query, ar;
	data = [];
	stuff = {questions:data}
	queries = QueriesCompleted(0, function(data){
		callback(data);
	}, stuff);
	if(cat){
		query = "select buzz_posts.*, users.fname, users.lname, users.profile_pic from buzz_posts inner join users on users.user_id = buzz_posts.user_id where buzz_posts.category = ? order by buzz_posts.buzz_post_id  desc limit 50";
		ar = [cat]
	}
	else{
		query = "select buzz_posts.*, users.fname, users.lname, users.profile_pic from buzz_posts inner join users on users.user_id = buzz_posts.user_id order by buzz_posts.buzz_post_id  desc limit 50"
		ar = [];
	}
	query = connection.query(query, ar);
	queries.add_query();
	connection.query("select * from buzz_post_categories", [], function(err, results){
		stuff.categories = results;
		queries.complete(0);
	})
	query.on("result", function(r){
		data.push(r);
		queries.add_query();
		connection.query("select users.fname, users.lname, users.profile_pic, users.user_id, body, comment_id, created from buzz_comments inner join users on buzz_comments.user_id = users.user_id where buzz_post_id = ?", [r.buzz_post_id], function(err, results){
			r.answers = results;
			queries.complete();
		})
		queries.add_query();
		connection.query("select * from buzz_likes where user_id = ? and buzz_post_id = ? ", [user_id, r.buzz_post_id], function(err, results){
			r.liked = !!results.length;
			queries.complete();
		});
		queries.add_query();
		connection.query("select * from buzz_likes where buzz_post_id = ? ", [r.buzz_post_id], function(err, results){
			r.like_count = results.length;
			queries.complete();
		});

	});
	query.on("err", function(e){
		console.log(e);
	})
	// query.on("end", function(){
	// 	if(!data.length){
	// 		callback([]);
	// 	}
	// })
}

exports.getCategories = function(callback){
	connection.query("select * from buzz_post_categories", [], function(err, results){
		callback(results);
	})
}

exports.getQuestion = function(question, callback){
	connection.query("select questions.*, users.fname, users.lname, users.profile_pic from questions inner join users on users.user_id = questions.user_id where question_id = ? limit 1", [question], function(err, results){
		if(results.length){
			connection.query("select answers.*, users.fname, users.lname, users.profile_pic from answers inner join users on users.user_id = answers.user_id where question_id =?", [question], function(err, r){
				results[0].answers = r;
				callback(results[0]);
			})
		}
		else{
			callback(false)
		}
	})
}

exports.newAnswer = function(question_id, user_id, answer, callback){
	console.log(question_id)
	connection.query("insert into buzz_comments set buzz_post_id = ?, user_id = ?, body = ?, created = unix_timestamp(now())", [question_id, user_id, answer], function(err, result){
		console.log(err)
		callback(result.insertId);
	})
}

exports.newChatMessage = function(to, from, message){
	connection.query("insert into chat set `to` = ?, `from` = ?, message = ?, date = unix_timestamp(now())", [to, from, message]);
}

exports.getFriend = function(user_id, friend_id, callback){
	connection.query("select * from users inner join friendships as f on users.user_id = f.user_a where users.user_id = ? and f.user_b = ? limit 1", [friend_id, user_id], function(err, result){
		if(result.length){
			delete result[0].password;
			callback(result[0]);
		}
		else{
			callback(false);
		}

	})
}

exports.generateNotification = function(notified, notifier, message, url, callback){
	connection.query("insert into notifications set user_id = ?, notifier_id = ?, notification_text = ?, target_url = ?, date = unix_timestamp(now())", [notified, notifier, message, url], function(err, results){
		if(callback){
			callback(results);
		}
		
	})
}

exports.getNotifications = function(user_id, callback){
	connection.query("select notifications.*, users.fname, users.lname, users.profile_pic from notifications inner join  users on users.user_id = notifications.notifier_id where notifications.user_id = ? order by notification_id desc limit 15",[user_id], function(err, results){
		callback(results);
	})
}

exports.getClubs = function(user_id, callback){
	var send = {
		queries: 0,
		ran: 0,
		init: function(cb){
			this.cb = cb;
		},
		add_one: function(){
			this.queries += 1;
		},
		complete: function(){
			if(++this.ran === this.queries){
				this.cb.apply(null)
			}
		}
	}
	var query = connection.query("select * from clubs inner join club_members on club_members.club_id = clubs.club_id where club_members.user_id = ? limit 10", [user_id]);
	var data = [];
	send.init(function(){
		callback(data);
	});
	query.on("result", function(r){
		send.add_one();
		connection.query("select * from club_members where club_id = ?", [r.club_id], function(err, results){
			r.members = results;
			data.push(r);
			send.complete();
		});
	});


	
}
exports.clubHype = function(callback){
	connection.query("select * from clubs where privacy = 1 limit 2", [], function(err, results){
		connection.query("select clubs.club_name, clubs.club_id, clubs.club_photo, count(clubs.club_name) as members from clubs inner join club_members on club_members.club_id = clubs.club_id where clubs.privacy > 0 group by clubs.club_name order by members desc limit 4 ", [], function(err, r){
			console.log(err, r)
			callback({mostHype:results[0], featured:results[1], topClub: r})
		})
		
	})
}
exports.getClub = function(club_id, user_id, callback){
	var send = {
		queries: 0,
		ran: 0,
		init: function(cb){
			this.cb = cb;
		},
		add_one: function(){
			this.queries += 1;
		},
		complete: function(){
			if(++this.ran === this.queries){
				this.cb.apply(null)
			}
		}
	}
	var query = connection.query("select * from clubs where club_id = ? limit 1", [club_id]);
	var data = [];
	send.init(function(){
		callback(data[0]);
	});
	query.on("result", function(r){
		send.add_one();
		connection.query("select users.fname, users.lname, users.user_id, users.profile_pic, club_members.mod from users  inner join club_members on club_members.user_id = users.user_id inner join clubs on clubs.club_id = club_members.club_id where clubs.club_id = ?", [r.club_id], function(err, results){
			r.members = results;
			data.push(r);
			send.complete();
		});
		send.add_one();
		connection.query("select * from club_members where user_id = ? and club_id = ? limit 1", [user_id, club_id], function(err, results){
			if(results.length){
				r.inClub = true;
				r.clubMod = !!results[0].mod;
				if(r.who_can_invite || results[0].mod){
					r.canInvite = true;
				}
				else{
					r.canInvite = false;
				}
			}
			else{
				r.inClub = false;
				r.clubMod = false;
				if(r.who_can_invite){
					r.canInvite = true;
				}
				else{
					r.canInvite = false;
				}
				
			}
			send.complete();
		});

		send.add_one();
		connection.query("select * from club_invites where user_id = ? and club_id = ?", [user_id, club_id], function(err, results){
			if(results.length){
				r.invited = true;
			}
			send.complete();
		})

		send.add_one();
		connection.query("select * from club_requests where user_id = ? and club_id = ? limit 1", [user_id, club_id], function(err, results){
			r.requestSent = !!results.length;
			send.complete();
		});

	});

	
}

exports.createClub = function(data, user_id, callback){
	var data_array = [
		data.club_name,
		data.club_description,
		data.who_can_see,
		data.who_can_join,
		data.who_can_invite,
		user_id
	],
	insert_id;
	connection.query("insert into clubs (club_name, club_description, privacy, invite_type, who_can_invite, owner_id) VALUES (?,?,?,?,?,?)", data_array, function(err, results){
		insert_id = results.insertId;
		connection.query("insert into club_members set user_id = ?, club_id = ?, `mod` = ?", [user_id, insert_id, 1], function(err, results){
			callback(insert_id);
		})
	});
}

exports.getPost = function(user_id, post_id, callback){
	canSeePost(user_id, post_id, function(auth){
		if(auth){
			connection.query("select * from posts where post_id = ? limit 1", [post_id], function(err, results){
				if(!results.length) {
					callback(false, {"error": "Post does not exist!"});
					return;
				}
				getUserByPost(post_id, function(user){
					for(i in user){
						if(user.hasOwnProperty(i)){
							results[0][i] = user[i];
						}
					}
					getComments(post_id, function(result){
						results[0].comments = result;
						callback(results[0]);
					});
				})
				
			})
		}
		else{
			callback(false, {"error":"You do not have permissions to view this post"})
		}
	})
}
exports.getUserByPost = getUserByPost;

exports.getPhoto = function(photo_id, callback){
	connection.query("select * from photos where photo_id =?", [photo_id], function(err, result){
		if(result.length){
			callback(result[0].filename);
		}
		else{
			callback(false);
		}
	})
}

exports.requestMembership = function(user_id, club_id, callback){
	connection.query("select * from clubs where club_id = ? and invite_type = 2", [club_id], function(err, results){
		if(results.length){
			connection.query("select * from club_requests where user_id = ? and club_id = ?", [user_id, club_id], function(err, results){
				if(!results.length){
					connection.query("insert into club_requests (user_id, club_id) VALUES (?,?)", [user_id, club_id], function(err, results){
						if(err){
							callback(false);
							return;
						}
						callback(true, {"success": "Your request is now pending it needs to be approved by a member of the club!"});
					})
				}
				else{
					callback(false, {"error": "You have already asked to join this club"});
				}
			})
		}
		else{
			callback(false, {"error": "This club does not allow membership requests"});
		}
	})
}

exports.getClubRequests = function(user_id, club_id, callback){
	connection.query("select * from club_members where user_id = ? and club_id = ? and `mod` = 1", [user_id, club_id], function(err, results){
		if(err){
			callback(false, {"error": "Something went wrong"});
			return;
		}
		if(results.length){
			connection.query("select club_requests.club_id, club_requests.club_request_id, users.fname, users.lname, users.user_id, users.profile_pic from club_requests inner join users on users.user_id = club_requests.user_id where declined != 1", function(err, results){
				callback(results);
			})
		}
		else{
			callback(false, {"error": "You do not have permission to moderate this club"})
		}

	})
}

exports.resolveClubRequest = function(user_id, club_id, request_id, answer, callback){
	connection.query("select * from club_members where user_id = ? AND club_id = ? AND `mod` = 1", [user_id, club_id], function(err, results){
		if(err){
			callback(false, {"error": "Something went wrong"});
			return;
		}
		if(results.length){
			if(answer){
				connection.query("select user_id from club_requests where club_request_id = ? limit 1", [request_id], function(err, results){
					if(!results.length){
						return;
					}
					connection.query("insert into club_members (user_id, club_id) VALUES (?,?)", [results[0].user_id, club_id], function(err, r){
						if(err){
							callback(false, {"error": "something went wrong"});
							return;
						}
						connection.query("delete from club_requests where club_request_id = ? limit 1 ", [request_id]);
						callback({user_id:results[0].user_id}, {"success": "User has successfully been added to the club"})
					})
				})
			}
			else{
				connection.query("update club_requests set declined = 1 where club_request_id = ? limit 1", [request_id], function(){
					callback(true, {"success": "User's membership was denied"});
				})
			}
		}
		else{
			callback(false, {"error": "You do not have permissions to moderate this club"})
		}
	})
}
exports.inviteToClub = function(user_id, club_id, invited_ids, callback){
	canInvitePeopleToClub(user_id, club_id, function(auth){
		if(auth){
			invited_ids.forEach(function(id){
				connection.query("insert ignore into club_invites set user_id = ?, club_id = ?", [id, club_id]);
			});
			callback(true, {"success": "People were invited successfully"});
		}
		else{
			callback(false, {"error": "You don't have permission to invite people to this club"});
		}
	})
}
exports.getPosts = function(user_id, post_scope, reference_id, callback){
	var data = [];
	var query = connection.query("select posts.*, users.fname, users.lname, users.profile_pic from posts  inner join users on users.user_id = posts.user_id where post_scope = ? and reference_id = ?", [post_scope, reference_id]);

	query.on("result", function(r){
		data.push(r);

		q.add_one();
		getComments(r.post_id, function(result){
			r.comments = result;
			q.complete();
		});

		q.add_one();
		checkLiked(user_id, r.post_id, function(like){
			r.liked_post = like;
			q.complete();
		})
	});

	var q = {
		total:0,
		done:0,
		add_one: function(){
			this.total += 1;
		},
		complete: function(){
			if(++this.done === this.total){
				callback(data);
			}
		}
	}
}
exports.betterNewPost = function(user_id, post_body, post_scope, reference_id, post_type, attachment_id, ids, callback){
	console.log(ids)
	connection.query("insert into posts (user_id, post_body, post_scope, reference_id, post_type, attachment_id, date) VALUES (?,?,?,?,?,?,?)", [user_id, post_body, post_scope, reference_id, post_type, attachment_id, (+new Date())/1000], function(err, results){
		ids.forEach(function(id){
			connection.query("insert into post_ids set post_id = ?, user_id = ?", [results.insertId, id.user_id]);
		});
		callback(results.insertId)
	})
}

exports.newClubPhotoFromPhotos = function(user_id, photo_id, club_id, callback){
	connection.query("select * from photos where user_id =? and photo_id = ?", [user_id, photo_id], function(err, results){
		if(results.length){
			filename = results[0].filename;
			connection.query("update clubs set club_photo = ? where club_id = ?", [filename, club_id], function(err, results){
				callback(filename);
			})
		}
		else{
			callback("YEA RIGHT!")
		}
	})
}

exports.newEventPhotoFromPhotos = function(user_id, photo_id, event_id, callback){
	connection.query("select * from photos where user_id = ? and photo_id = ?", [user_id, photo_id], function(err, results){
		if(results.length){
			filename = results[0].filename;
			connection.query("update events set filename = ? where event_id = ?", [filename, event_id], function(err, results){
				callback(filename)
			})
		}
		else{
			callback("YEA RIGHT!");
		}
	})
}

exports.canPostToClub = function(user_id, club_id, callback){
	connection.query("select * from club_members where user_id = ? and club_id = ?", [user_id, club_id], function(err, results){
		if(results.length){
			callback(true)
		}
		else{
			callback(false);
		}
	});
}

exports.deletePost = function(post_id, callback){
	connection.query("delete from posts where post_id = ? limit 1", [post_id], function(err, results){
		callback({"success":"Post deleted sucessfully"});
	})
}

exports.canDeletePost = function(user_id, post_id, callback){
	connection.query("select * from posts where post_id = ?", [post_id], function(err, r){
		if(r[0].user_id === user_id){
			callback(true);
		}
		else{
			if(r[0].post_scope === 2){
				connection.query("select * from club_members where user_id = ? and club_id = ? and `mod` = 1", [user_id, r[0].reference_id], function(err, r2d2){
					if(r2d2.length){
						callback(true);
					}
					else{
						callback(false);
					}
				})
			}
			else{
				callback(false)
			}
		}
	})
}

exports.checkUniqueEmail = function(email, callback){
	connection.query("select * from users where email = ?", [email], function(err, results){
		callback(!results.length);
	})
}

exports.newUser = function(userdata, password, salt, callback){
	String.prototype.capitalize = function() {
	    return this.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
	};
	var exp = /\b(High|School|high|school)\b/gi;

	connection.query("INSERT INTO `users` (`fname`, `lname`, `email`, `password`, `salt`, `sex`, `birthdate`, `state`) VALUES(?,?,?,?,?,?,?,?)", [userdata.fname, userdata.lname, userdata.email, password, salt, userdata.gender, userdata.birthdate, userdata.state], function(err, results){
		console.log(err)
		var id = results.insertId;
		connection.query("select * from users where user_id = ?", [id], function(err, results){
			userdata.school = userdata.school.replace(exp, "");
			userdata.school = S(userdata.school).trim().s;
			connection.query("select * from schools where school_name like ?", ["%"+userdata.school+"%"], function(err, r){
				if(!r.length){
					// school = userdata.school.capitalize();
					// connection.query("insert into schools set school_name = ?",[school], function(err, r){
					// 	connection.query("insert into school_attending set school_id = ?, user_id = ?, attending = 1, graduation = ?",[r.insertId, results[0].user_id, userdata.graduation])
					// })
					return;
				}	
				connection.query("insert into school_attending set school_id = ?, user_id = ?, attending = 1, graduation = ?",[r[0].school_id, results[0].user_id, userdata.graduation])
			})
			callback(results[0]);
		})
	})
}
exports.canJoinClub = function(user_id, club_id, callback){
	order([openClub, isInvited], function(auth){
		if(auth){
			callback(true);
		}
		else{
			callback(false, {error:"You cannot join this club"})
		}
	});

	function openClub(callback){
		connection.query("select * from clubs where club_id = ? and invite_type = 1", [club_id], function(err, results){
			callback(!!results.length)
		})
	}
	function isInvited(callback){
		connection.query("select * from clubs where club_id = ?", [club_id], function(err, results){
			if(results.length){
				connection.query("select * from club_invites where user_id =? and club_id = ?", [user_id, club_id], function(err, results){
					if(results.length){
						callback(true);
					}
					else{
						callback(false);
					}
				});
			}
			else{
				callback(false);
			}
		})
	}



}

exports.newClubMember = function(user_id, club_id, callback){
	connection.query("insert into club_members set user_id = ?, club_id = ?", [user_id, club_id], function(err, results){
		if(!err){
			callback({success:"You have successfully joined the club"})
		}
	})
}

exports.canViewClub = function(user_id, club_id, callback){
	function publicClub(cb){
		connection.query("select * from clubs where club_id = ? and privacy = 1", [club_id], function(err, results){
			cb(!!results.length);
		})
	}
	function inClub(cb){
		connection.query("select * from club_members where user_id = ? and club_id = ?", [user_id, club_id], function(err, results){
			cb(!!results.length);
		})
	}
	order([publicClub, inClub], function(auth){
		callback(auth);
	})
}

exports.searchClubs = function(query, callback){
	var query = connection.query("select * from clubs where privacy = 1 and club_name like ? limit 20", ["%"+query+"%"]);
	var data = [];
	var q = {
		total:0,
		done:0,
		add_one: function(){
			this.total += 1;
		},
		complete: function(){
			if(++this.done === this.total){
				callback(data);
			}
		}
	}


	query.on("result", function(result){
		q.add_one();
		connection.query("select * from club_members where club_id = ?", [result.club_id], function(err, results){
			result.members = results;
			data.push(result);
			q.complete();
		});
	});
}

exports.isClubMod = function(user_id, club_id, callback){
	connection.query("select * from club_members where user_id=? and club_id=? and `mod`=1", [user_id, club_id], function(err, results){
		callback(!!results.length, {"error": "You do not have permission to mod this club"});
	})
}

exports.updateClub = function(club_id, fields, callback){
	connection.query("update clubs set ? where club_id = "+connection.escape(club_id), fields, function(err, results){
		if(err){
			callback(false);
		}
		else{
			callback(true);
		}
	})
}
exports.addClubPhoto = function(filename, club_id, callback){
	connection.query("update clubs set club_photo = ? where club_id = ? limit 1", [filename, club_id], function(err, results){
		if(callback){
			callback(results);
		}
	})
}

exports.newSportsPost = function(filename, post_details, user_id, callback){
	connection.query("insert into sports_posts set filename = ?, post_body = ?, sport = ?, league = ?, date = ?, user_id = ?", [filename, post_details.post_body, post_details.sport, post_details.league, (+ new Date())/1000, user_id], function(err, results){
		callback(results.insertId);
	})
}

exports.getSportsPosts = function(sport, callback){
	connection.query("select sports_posts.*, users.fname, users.lname, users.profile_pic, users.user_id from sports_posts  inner join users on users.user_id = sports_posts.user_id where sport = ? order by post_id desc", [sport], function(err, results){
		callback(results);
	})
}

exports.searchSchools = function(school , callback){
	if(school){
		connection.query("select * from schools where school_name LIKE ?", ["%"+school+"%"], function(err, results){
			callback(results);
		})
	}
	else{
		connection.query("select * from schools", function(err, results){
			callback(results);
		})
	}
	
}

exports.seenNotifications = function(user_id){
	connection.query("update notifications set seen = 1 where user_id = ?", [user_id])
}

exports.newPhotoComment = function(user_id, comment_data, callback){
	connection.query("insert into photo_comments set photo_id = ?, user_id = ?, comment_body = ?, date = ?", [comment_data.photo_id, user_id, comment_data.comment, (+new Date())/1000], function(err, results){
		callback({"yeay":"ok"});
	})
}

exports.getCurrentUserSchool = function(user_id, callback){
	connection.query("select school_id from school_attending where user_id = ? and attending = 1", [user_id], function(err, results){
		callback(results[0].school_id);
	})
}
exports.canInviteToEvent = function(user_id, event_id, callback){
	connection.query("select * from events where event_id = ? limit 1", [event_id], function(err, results){
		if(results.length){
			var e = results[0];
			if(user_id === e.user_id){
				callback(true);
			}
			else if(e.privacy === 3){
				callback(true)
			}
			else if(e.can_invite){
				callback(true);
			}
			else{
				callback(false);
			}
		}
		else{
			callback(false);
		}
	})
}
exports.getSchoolIdByUserId = function(user_id, callback){
	connection.query("select school_id from school_attending where user_id = ? limit 1", [user_id], function(err, results){
		if(results.length){
			callback(results[0].school_id);
		}
		else{
			callback(false)
		}
		
	});
}
exports.getUsersBySchoolAndGraduatingYear = function(school_id, year, callback){
	var ids = [];
	if(Array.isArray(year)){
		year.forEach(function(y,idx){
			connection.query("select user_id from school_attending where school_id = ? and graduation = ?", [school_id, y], function(err, results){
				for(var i =0; i< results.length; i++){
					ids.push(results[i].user_id);
				}
				if(idx+1 == year.length){
					callback(ids);
				}
			})

		});
		
	}
	else{
		connection.query("select user_id from school_attending where school_id = ? and graduation = ?", [school_id, year], function(err, results){
			for(var i =0; i< results.length; i++){
				ids.push(results[i].user_id);
			}
			callback(ids)
		})
	}
}
exports.inviteToEvent = function(invites, user_id, event_id){
	invites.forEach(function(id){
		connection.query("insert ignore into event_invites set user_id = ?, event_id = ?, referer_id = ?, attending = 0", [id, event_id, user_id]);
	});
}
exports.canEditEvent = function(user_id, event_id, callback){
	connection.query("select * from events where event_id = ? and creator_id = ?", [event_id, user_id], function(err, results){
		if(results.length){
			callback(true);
		}
		else{
			callback(false);
		}
	})
}
exports.editEvent = function(e, event_id, callback){
	connection.query("update events set description = ?, title = ?, start= ?, location= ? where event_id = ?", [e.description, e.title, e.start, e.location, event_id], function(err, results){
		console.log(err)
		callback()
	})
}

exports.userCss = function(user_id, callback){
	connection.query("select background_id from users where user_id = ?", [user_id], function(err, results){
		if(results.length){
			callback(results[0].background_id);
		}
		else{
			callback(false);
		}
	})
}

exports.newBuzzPost = function(user_id, category, description, filename, callback){
	connection.query("insert into buzz_posts set user_id=?, description=?, filename=?, category=?, created = ?", [user_id, description, filename, category, (+new Date())/1000], function(err, results){
		callback(results.insertId);
	})
}


exports.getUserUnlockedBackgrounds = function(user_id, callback){
	connection.query("select * from backgrounds_unlocked where user_id = ?", [user_id], function(err, results){
		callback(results);
	})
}

exports.backgroundIsUnlocked = function(user_id, bg, callback){
	connection.query("select * from backgrounds_unlocked where user_id = ? and background_id = ?", [user_id, bg], function(err, results){
		if(results.length){
			callback(true);
		}
		else{
			callback(false);
		}
	})
}

exports.changeBackground = function(user_id, bg){
	connection.query("update users set background_id = ? where user_id = ? limit 1", [bg, user_id]);
}

exports.getEditProfile = function(user_id, callback){
	var data;
	connection.query("select users.user_id, users.email, users.tag_line, users.relationship_status, users.state, users.hometown, users.city, users.interests, users.favorite_activities, users.favorite_school_subject, users.sports  from users where user_id = ?", [user_id], function(err, results){
		console.log(err)
		data = results[0];
		connection.query("select schools.school_name as school, sa.graduation from schools inner join school_attending as sa on sa.school_id = schools.school_id where sa.attending =1 and sa.user_id = ?", [user_id], function(err, results){
			console.log(err);
			data.school = results[0].school;
			data.graduation = results[0].graduation;
			callback(data);
		})
	})
}
exports.correctPassword = function(user_id, password, callback){
	connection.query("select password from users where user_id = ? and password = ? limit 1", [user_id, password], function(err, results){
		console.log(results.length)
		callback(results.length);
	})
}
exports.changeEmail = function(user_id, newEmail, callback){
	connection.query("select * from users where email = ?", [newEmail], function(err, results){
		if(results.length){
			callback(false, {error:"email is already taken"});
		}
		else{
			connection.query("update users set email = ? where user_id = ? limit 1", [newEmail, user_id], function(err, results){
				callback(true);
			})
		}
	})
}
exports.changePassword = function(user_id, password, callback){
	connection.query("update users set password = ? where user_id = ? limit 1", [password, user_id], function(err, results){
		callback();
	})
}
exports.editProfile = function(user_id, data, callback){
	
	connection.query("update users set tag_line = ?, relationship_status = ?, city = ?, state = ?, hometown = ?, sports = ?, interests = ?, favorite_activities = ?, favorite_school_subject = ? where user_id = ?", [data.tag_line, data.relationship_status, data.city, data.state, data.hometown, data.sports, data.interests, data.favorite_activities, data.favorite_school_subject, user_id], function(err, results){
		doSchool();
		callback(true);
	})
			
	function doSchool(){
		connection.query("select * from schools where school_name = ?", [data.school_name], function(err, results){
			if(results.length){
				var r = results[0];
				connection.query("delete from school_attending where user_id = ? and attending = 1", [user_id], function(err, results){
					connection.query("insert into school_attending set user_id = ?, school_id = ?, attending = 1, graduation = ?", [user_id, r.school_id, data.graduation])
				})
			}
			
		})
	}
}

exports.modUser = function(club_id, user_id, callback){
	connection.query("update club_members set `mod` = 1 where user_id = ? and club_id = ?", [user_id, club_id], function(err, results){
		callback({"success": "User was successfully made a mod"});
	})
}

exports.banUser = function(club_id, user_id, callback){
	connection.query("delete from club_members where user_id = ? and club_id = ? limit 1", [user_id, club_id], function(err, results){
		callback({"success": "User was banned"});
	})
}

exports.getSchoolStudents = function(school_id, callback){
	connection.query("select users.fname, users.lname, users.profile_pic, users.user_id, school_attending.graduation from school_attending inner join users on users.user_id = school_attending.user_id where school_attending.school_id = ?", [school_id], function(err, results){
		console.log(err);
		callback(results);
	})
}

exports.getUserPhotos = function(user_id, callback){
	connection.query("select * from photos where user_id = ?", [user_id], function(err, results){
		callback(results);
	})
}

exports.getAlbumForPhoto = function(photo_id, callback){
	connection.query("select * from photos inner join albums on albums.album_id = photos.album_id where photos.photo_id = ? limit 1", [photo_id], function(err, results){
		callback(results[0]);
	})
}

exports.getFilenameByPhotoId = function(photo_id, callback){
	connection.query("select * from photos where photo_id = ? limit 1", [photo_id], function(err, results){
		callback(results[0].filename);
	});
}
exports.updatePhotoDescription = function(photo_id, description, callback){
	connection.query("update photos set description = ? where photo_id = ? limit 1", [description, photo_id], function(err, results){
		console.log(err);
		if(err){
			callback(false)
		}
		else{
			callback(true);
		}
	})
}

exports.canEditPhoto = function(user_id, photo_id, callback){
	connection.query("select * from photos where user_id = ? and photo_id = ?", [user_id , photo_id], function(err, results){
		callback(results.length);
	});
}

exports.deletePhoto = function(photo_id, callback){
	connection.query("delete from photos where photo_id = ? limit 1", [photo_id], function(err, results){
		connection.query("delete from posts where post_type = 1 and attachment_id = ? limit 1", [photo_id], function(err, results){
			callback();
		})
	})
}

exports.likeBuzzPost = function(user_id, buzz_post_id, callback){
	connection.query("select * from buzz_likes where buzz_post_id = ? and user_id = ?", [buzz_post_id, user_id], function(err, results){
		console.log(results);
		if(results.length){
			connection.query("delete from buzz_likes where user_id = ? and buzz_post_id = ? ", [user_id, buzz_post_id], function(err, results){
				callback(false);
			})
		}
		else{
			connection.query("insert into buzz_likes set user_id = ?, buzz_post_id = ? ", [user_id, buzz_post_id], function(err, results){
				callback(true);
			})
		}
	})
}

exports.addBuzzPhotoToAlbum = function(user_id, filename, callback){
	connection.query("select * from albums where user_id = ? and name = ?", [user_id, "The Buzz Photos"], function(err, results){
		if(results.length){
			next(results[0].album_id);
		}
		else{
			connection.query("insert into albums set name = ?, user_id = ?, created = ?", ["The Buzz Photos", user_id, (+new Date())/1000], function(err, results){
				next(results.insertId);
			})
		}
	})
	function next(album_id){
		connection.query("insert into photos set filename = ?, album_id = ?, user_id = ?", [filename, album_id, user_id], function(err, results){
			callback();
		})
	}
}

exports.deleteEvent = function(event_id, callback){
	connection.query("delete from events where event_id = ? limit 1", [event_id], function(err, results){
		connection.query("delete from posts where reference_id = ? and post_scope = 3", [event_id], function(err, results){
			callback()
		})
	})
}

exports.getEventsNearLocation = function(lat, lng, distance, callback){
	distance = distance || 25;
	connection.query("SELECT event_id, ( 3959 * acos( cos( radians(?) ) * cos( radians( lat ) ) * cos( radians( lng ) - radians(?) ) + sin( radians(?) ) * sin( radians( lat ) ) ) ) AS distance, title FROM events where privacy = 3 HAVING distance < ?  ORDER BY distance LIMIT 0 , 10", [lat, lng, lat, distance], function(err, results){
		console.log(err, results);
		callback(results);
	})
}

function canInvitePeopleToClub(user_id, club_id, callback){
	connection.query("select * from clubs where club_id = ? limit 1", [club_id], function(err, results){
		if(results.length){
			if(results[0].who_can_invite){
				callback(true);
			}
			else{
				connection.query("select * from club_members where user_id = ? and club_id = ? limit 1", [user_id, club_id], function(err, results){
					if(results.length){
						if(results[0].mod){
							callback(true)
						}
						else{
							callback(false);
						}
					}
					else{
						callback(false);
					}
				})
			}
		}
		else{
			callback(false);
		}
	})
}
function checkLiked( user_id, post_id, callback){ 
	var p = new Promise();
	callback = callback || function(){}
	connection.query("select * from likes where user_id =? and post_id =?", [user_id, post_id], function(err, results){
		
		if(results.length){
			p.resolve(true);
			callback(true)
		}
		else{
			p.resolve(false);
			callback(false);
		}
	});
	return p.promise;
}
function getRsvp( user_id, event_id, callback ){
	connection.query("select * from event_invites where event_invites.user_id = ? and event_invites.event_id = ?", [user_id, event_id], function(err, result){
		if(!result.length){
			callback(0);
		}
		else{
			callback(+result[0].attending);
		}
	})
}
function canAttend(user_id, event_id, school_id, callback){
	//If their invite is in the database of course they can attend
	connection.query("select * from event_invites where user_id = ? and event_id = ?", [user_id, event_id], function(err, result){
		if(!result.length){
			//If it's a public event of course they can attend
			connection.query("select * from events where event_id = ? and privacy = 3", [event_id], function(err, results){
				if(!results.length){
					//if they go to the same school and the event is school wide of course they can attend
					connection.query("select * from events inner join users on users.user_id = events.creator_id where event_id = ? and users.user_school_id = ? and events.privacy = 2", [event_id, school_id], function(err, results){
						if(!results.length){
							connection.query("select * from events inner join users on users.user_id = events.creator_id inner join friendships on friendships.user_a = users.user_id inner join users as u2 on u2.user_id = friendships.user_b where u2.user_id = ? and events.event_id =? and events.privacy = 1 ", [user_id, event_id], function(err, results){
								
								if(results.length){
									callback(true)
								}
								else{
									callback(false);
								}
							})
						}
						else{
							callback(true);
						}
					})
				}
				else{
					callback(true);
				}
			})
		}
		else{
			callback(true);
		}
	})
}

function canSeePost(user_id, post_id, callback){
	connection.query("select * from users inner join posts on posts.user_id = users.user_id inner join friendships as f on users.user_id = f.user_a where posts.post_id = ? and f.user_b = ? OR posts.user_id = ?", [post_id, user_id, user_id], function(err, results){
		if(results.length){
			callback(true);
		}
		else{
			callback(false);
		}
	})
}

function getUserByPost(post_id, callback){
	connection.query("select users.fname, users.lname, users.profile_pic, users.user_id from users inner join posts on posts.user_id = users.user_id where posts.post_id = ? limit 1", [post_id], function(err, results){
		callback(results[0])
	})
}
function getMention(post_id, reference, scope, callback){
	switch(scope){
		case 1:
			connection.query("select fname, lname from users where user_id = ?",[reference], function(err, results){
				callback(results[0].fname+" "+results[0].lname);
			})
			break;
		case 2:
			connection.query("select club_name from clubs where club_id = ?", [reference], function(err, results){
				callback(results[0].club_name)
			});
			break;
		case 3:
			connection.query("select title from events where event_id = ?", [reference], function(err, results){
				callback(results[0].title);
			})
			break;
		case 4:
			connection.query("select school_name from schools where school_id = ?",[reference], function(err, results){
				callback(results[0].school_name)
			})
			break;
		default:
			callback("");
	}
}

function getIds(post_id, callback){
	connection.query("select users.fname, users.lname, users.user_id from post_ids inner join users on users.user_id = post_ids.user_id where post_ids.post_id = ?", [post_id], function(err, results){
		callback(results);
	})
}

function order(functions, callback){
	var count = 0;
	var allAuth = true;
	var events = {
		events: {},
		add: function(name, cb){
			events[name] = cb;
		},
		trigger: function(name, args){
			if(events[name]){
				events[name].apply(null, args);
			}
		}
	}
	function iterate(){
		if(count + 1 == functions.length){
			functions[count](function(auth){
				callback(auth);
			});
		}
		else{
			events.add("fn"+count, function(){
				count += 1;
				iterate();
			});
			functions[count](function(auth){
				if(auth){
					callback(true);
				}
				else{
					events.trigger("fn"+count, []);
				}
				
			});
		}
	}
	iterate();
}