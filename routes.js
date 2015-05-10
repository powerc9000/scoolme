
var http = require("http");
var gm = require('googlemaps');
module.exports = function(sockets, database, crypto, im, client, fs, s3){
	var routes = {};


	//Hands out the main page to the user to build the page they need
	//Redirects if not logged in
	routes.index = function(req, res){
		if(req.session.auth){
			res.render("index.html");
		}
		else{
			res.redirect("/login");
		}
		
	}

	//Gets someones homepage newsfeed and personal data if the have ?jason=true in the url otherwise it just hands them index.html
	routes.home = function(req, res){
		if(req.query["json"]){
			database.getHome(req.session.userdata.user_id, function(results){
				res.send(results);
			});
		}
		else{
			res.render("index.html");
		}
		
	}


	//Gets events near a given location using google maps API 
	routes.eventsNearLocation = function(req, res){
		if(req.query["location"]){
			gm.geocode(req.query["location"], function(err, d){
			if(d.status === 'OK'){
				geo = d.results[0].geometry.location;

				//the lat a long of the event are stored in the DB when the event is made and this finds the ones X distance away
				database.getEventsNearLocation(geo.lat, geo.lng, req.query["distance"], function(events){
					res.send(events);
				});
			}
			else{
				res.send(404);
			}
			
		})
			
		}
		else{
			res.send(404)
		}
	}

	//Gets the users profile data if it their profile or gives them the profile data of someone elses profile
	routes.profile = function(req, res){
		var user;
		if(req.query["json"]){
			if(req.params.id){
				user = req.params.id;
			}
			else{
				user = req.session.userdata.user_id;
				
			}
			database.getProfile(user, req.session.userdata.user_id, function(data){
				res.send(data);
			});
			
		}
		else{
			res.render("index.html");
		}
		
	}

	//Gets basic user info for a user 
	//User id, profile picture, first name and last name
	routes.userdata = function(req, res){
		database.getBasicUserInfo(req.session.userdata.user_id, function(results, err){
			if(results){
				res.send(results);
			}
			else{
				res.send(500);
			}
		});
	}

	//Checks username ans password vs what the database has
	routes.auth = function(req, res){
		var password = req.body.password,
		email = req.body.email;
		password = crypto.createHash("sha1").update(password).digest("hex");
		database.checkAuth(email, password, function(result){
			
			if(result){
				req.session.auth = true;
				req.session.userdata = result;
				res.method = "get";
				res.redirect("/");
			}
			else{
				if(req.query["json"]){
					res.send({"error":"Username or password did not match"});
				}
				else{
					res.method = "get";
					res.redirect("/login");
				}
				
			}
		});
	}

	//Checks if the user owns a photo album
	routes.ownsAlbum = function(req, res, next){
		if(req.query["album"]){
			database.getUserIdbyAlbumId(req.query["album"], function(user_id){
				if(user_id == req.session.userdata.user_id){
					next();
				}
				else{
					res.send(400)
				}
			})
		}
		else{
			res.send(400);
		}
	}


	routes.deleteAlbum = function(req, res){
		database.deleteAlbum(req.query["album"], function(){
			res.send(200);
		})
	}

	//checks the session to see if they are logged in if not makes them log in if they are let's them continue
	//Use routes.auth first for every page you want to password protect
	routes.loggedIn = function(req, res, next){
		if(req.session.auth){
			next();
		}
		else{
			res.redirect("/login");
		}
	}

	routes.login = function(req, res){
		if(req.session.auth){
			res.redirect("/");
		}
		else{
			res.render("front_page");
		}
		
	}

	//logs a user out by deleting their session also tells socket.io that they are offline
	routes.logout = function(req, res){
		sockets.disconnectUser(req.session.userdata.user_id);
		req.session.auth = false;
		req.session.userdata = {};
		res.redirect("/login");
	}

	//creates a new post
	routes.newPost = function(req, res){
		var user_id = req.session.userdata.user_id;
		var post_body = req.body.post_body;
		var mention_id = req.body.mention_id;
		var post_scope = req.body.post_scope;
		var reference_id = req.body.reference_id;
		if(mention_id && +mention_id !== 0){
			reference_id = mention_id;
			post_scope = 1;
		}
		database.betterNewPost(user_id, post_body, post_scope, reference_id, 0, null, req.body.ids, function(result){
			if(result){
				res.send({post_id:result})
			}
			else{
				res.send({"error": "You cannot post to this person's wall"}, 403);
			}
			if(req.body.ids){
				req.body.ids.forEach(function(id){
					console.log(id);
					generateNotification(id.user_id, user_id, "IDed you in a post", "/post/"+result, function(){});
				})
			}
			
		});
	}

	routes.newComment = function(req, res){
		var user_id = req.session.userdata.user_id,
		comment_body = req.body.comment_body,
		post_id = req.body.post_id;

		database.newComment(user_id, comment_body, post_id, function(result){
			database.getUserByPost(post_id, function(result){
				generateNotification(result.user_id, user_id, "Commented on your post", "/post/"+post_id);
			})
			res.send({comment_id:result});
		});
	}


	routes.getPeopleYouMayKnow = function(req, res){
		database.peopleYouMayKnow(req.session.userdata.user_id, function(results){
			res.send(results);
		});
	}


	//Uploads a photo given to it resizes to multiple sizes for different uses
	//Can handle multipule file uploads
	routes.uploadFile = function(req, res){

		function renameFile(file, ext){
			var filename = file.name
			var i = filename.lastIndexOf('.');
		    var extension = (i < 0) ? '' : filename.substr(i);
		    var newName = crypto.randomBytes(20).toString("hex");
		    if(ext){
		    	return newName+ext;
		    }
		    else{
		    	return newName+extension;
		    }
		    
		}

		function resizeFile(src, dst, width, height, callback){
			options = {
				srcPath: src,
				dstPath: dst,
			}
			if(width){
				options.width = width;
			}
			if(height){
				options.height = height;
			}

			im.resize(options, 
				function(err){
					if(err){
						console.log("im: "+err)
					}
					callback();
				});
		}
		function putFileToS3(src, dst, callback){
			client.putFile(src, dst, function(err, res){
				if(err){
					console.log("s3: "+err)
				}
				console.log(src, dst, res.statusCode);
				callback();
			});
		}

		function putInDatabase(filename, user_id, callback){
			database.addPhoto(filename, user_id, function(photo_id){
				callback(photo_id)
			});
		}
		var sendAfter = {
			init: function(number, callback){
				this.items = number;
				this.finished = 0;
				this.callback = callback;
			},
			done: function(){
				this.finished += 1;
				if(this.items === this.finished){
					this.callback();
				}
			}
		};
		//Checks to see if it was multiple files or one file
		if(Object.prototype.toString.call( req.files.files[0] ) === "[object Array]"){
			var photo_ids = [];
			sendAfter.init(req.files.files[0].length, function(){
				req.session.userdata.tempAlbum = photo_ids;
				res.send(photo_ids);
			});

			req.files.files[0].forEach(function(file){
				var fileName = renameFile(file);
				var smaller = renameFile(file, ".jpg")
				resizeFile(file.path, "public/img/photos/full/"+fileName, 600, null, function(){
					putFileToS3("public/img/photos/full/"+fileName, "/photos/full/"+fileName, function(){
						fs.unlink("public/img/photos/full/"+fileName);
					});
				});
				resizeFile(file.path, "public/img/photos/"+fileName, 300, 300, function(){
					putFileToS3("public/img/photos/"+fileName, "/photos/"+fileName, function(){
						putInDatabase(fileName, req.session.userdata.user_id, function(photo_id){
							photo_ids.push({photo_id:photo_id, filename:fileName});
							sendAfter.done();
							fs.unlink("public/img/photos/"+fileName);
						});
					});
				});
			});
		}
		else{
			file = req.files.files[0];
			fileName = renameFile(file);
			resizeFile(file.path, "public/img/photos/full/"+fileName, 600, null, function(){
				putFileToS3("public/img/photos/full/"+fileName, "/photos/full/"+fileName, function(){
					fs.unlink("public/img/photos/full/"+fileName);
				});
			});
			resizeFile(file.path, "public/img/photos/"+fileName, 300, 300, function(){
				putFileToS3("public/img/photos/"+fileName, "/photos/"+fileName, function(){
					putInDatabase(fileName, req.session.userdata.user_id, function(photo_id){
						req.session.userdata.tempAlbum = [{photo_id:photo_id, filename:fileName}];
						res.send([{photo_id:photo_id, filename:fileName}]);
						fs.unlink("public/img/photos/"+fileName);
					});
				});
			});
		}
		
	}

	routes.photos = function(req,res){
		var user_id = req.params.id,
		data = {};
		database.getPhotos(user_id, function(result){
			data.photos = result
			database.getAlbums(user_id, function(result){
				data.albums = result;
				database.getBasicUserInfo(user_id, function(results){
					data.user = results;
					res.send(data);
				})
				
				
			});
		});
	}

	routes.tempAlbum = function(req, res){
		if(req.session.userdata.tempAlbum){
			database.getAlbumsForUser(req.session.userdata.user_id, function(result){
				res.send({photos: req.session.userdata.tempAlbum, albums:result});
			})
			
		}
		else{
			res.send(200);
		}
	}

	routes.tempToExistingAlbum = function(req, res){
		var photos, album_id;

		if(!req.session.userdata.tempAlbum){
			req.send(400);
			return 0;
		}
		photos = req.session.userdata.tempAlbum;
		album_id = req.body.album_id;
		if(photos.length === 1){
			database.newPhotoPost(req.session.userdata.user_id, photos[0].photo_id);
		}
		database.addToAlbum(req.session.userdata.user_id, album_id, photos, function(result){
			if(result){
				delete req.session.userdata.tempAlbum;
				res.send({album_id: result});
			}
			else{
				res.send(400);
			}
		})
	}


	//The newly uploaded photos are held onto until they are either put in an existing album or a new one. This one handles making a new album and putting photos in it
	routes.tempToNewAlbum = function(req, res){
		var photos;
		if(!req.session.userdata.tempAlbum){
			req.send(400);
			return;
		}
		photos = req.session.userdata.tempAlbum;
		if(photos.length === 1){
			database.newPhotoPost(req.session.userdata.user_id, photos[0].photo_id);
		}
		database.createAlbum(req.session.userdata.user_id, req.body.album_name, function(result){
			database.addToAlbum(req.session.userdata.user_id, result, photos, function(result){
				if(result){
					delete req.session.userdata.tempAlbum;
					res.send({album_id: result});
				}
				else{
					res.send(400);
				}
			});
		});
	}

	routes.getAlbum = function( req, res ){
		database.getAlbum(req.params.id, function(result){
			res.send(result);
		});
	}

	routes.likePost = function ( req, res ){

		database.likePost(req.session.userdata.user_id, req.params.id, function(result){
			if(result.user_id !== req.session.userdata.user_id){
				generateNotification(result.user_id, req.session.userdata.user_id, "liked your post", "/post/"+req.params.id);
			}
			res.send(200);
		});
	}

	routes.unlikePost = function(req, res){
		database.unlikePost(req.session.userdata.user_id, req.params.id, function(result){
			res.send(200);
		});
	}

	routes.getEvents = function(req, res){
		data = {events:[]};
		total = 5;
		done = 0;

		database.schoolEvents(req.session.userdata.user_id, req.session.userdata.user_school_id, function(result){
			data.events = data.events.concat(result);
			finished();
		});
		database.invitedTo(req.session.userdata.user_id, function(result){

			data.events = data.events.concat(result);
			finished();
		});
		database.friendsEvents(req.session.userdata.user_id, function(result){

			data.events = data.events.concat(result);
			finished();
		});
		database.eventsFriendsAttending(req.session.userdata.user_id, function(result){

			data.events = data.events.concat(result);
			finished();
		})
		database.getAttending(req.session.userdata.user_id, function(result){
			data.events = data.events.concat(result);
			finished();
		});

		function finished(){
			done += 1;
			console.log(done)
			if(done === total){
				res.send(data);
			}
		}
	}

	routes.newEvent = function(req, res){
		var data = {},
			body = req.body;

		gm.geocode(body.location, function(err, d){
			if(d.status === 'OK'){
				data.geometry = d.results[0].geometry.location;
			}
			else{
				data.geometry = false;
			}
			next();
		})

		function next(){
			data.description = body.description;
			data.creator_id = req.session.userdata.user_id;
			data.title = body.title;
			data.location = body.location;
			data.privacy = body.privacy;
			data.start = body.start;
			data.end = body.end || null;
			data.can_invite = body.can_invite;
			database.newEvent(data, function(result){
				res.send({event_id:result});
			});
		}
		
	}

	routes.getEvent = function(req, res){
		var event_id = req.params.id;

		database.getEvent(req.session.userdata.user_id, event_id, req.session.userdata.user_school_id, function(result){
			res.send(result);
		})
	}

	routes.newEventPhoto = function(req, res){

		function renameFile(file, ext){
			var filename = file.name
			var i = filename.lastIndexOf('.');
		    var extension = (i < 0) ? '' : filename.substr(i);
		    var newName = crypto.randomBytes(20).toString("hex");
		    if(ext){
		    	return newName+ext;
		    }
		    else{
		    	return newName+extension;
		    }
		    
		}

		function resizeFile(src, dst, width, height, callback){
			options = {
					srcPath: src,
					dstPath: dst,
				}
			if(width){
				options.width = width;
			}
			if(height){
				options.height = height;
			}

			im.resize(options, 
				function(err){
					if(err){
						console.log("im: "+err)
					}
					callback();
				});
		}
		function putFileToS3(src, dst, callback){
			client.putFile(src, dst, function(err, res){
				if(err){
					console.log("s3: "+err)
				}
				console.log(src, dst, res.statusCode);
				callback();
			});
		}

		function putInDatabase(filename, event_id, callback){
			database.addEventPhoto(filename, event_id, function(photo_id){
				callback(photo_id)
			});
		}


		var event_id = req.params.id
		database.ownsEvent(event_id, req.session.userdata.user_id, function(result){
			if(result){
				file = req.files.files;
				fileName = renameFile(file);
				resizeFile(file.path, "public/img/photos/"+fileName, 300, null, function(){
					putFileToS3("public/img/photos/"+fileName, "/photos/"+fileName, function(){
						putInDatabase(fileName, event_id)
						fs.unlink("public/img/photos/"+fileName);
						res.send({fileName: fileName})
					})
				})
			}
			else{
				res.status(403);
				res.send({error: "You are not allowed to make changes to this event"})
			}
		});
	}

	routes.rsvpForEvent = function(req, res){
		var rsvp = req.body.rsvp,
		event_id = req.body.event;

		database.rsvp(req.session.userdata, event_id, rsvp, function(result){
			if(result){
				res.send(200);
			}
			else{
				res.send(403)
			}
			
		});
	}

	routes.requestFriendship = function(req, res){
		database.requestFriendship(req.session.userdata.user_id, req.params.id, function(result,message){
			if(result){
				res.send(message);
			}
			else{
				res.send(message, 400);
			}
		});
	}

	routes.notifications = function(req, res){
		database.getFriendRequests(req.session.userdata.user_id, function(results){
			res.send({friend_requests: results})
		});
	}

	routes.getSchools = function(req, res){
		var classification = req.query.classification || false;
		var data = {};
		var done = 0;
		var total = 2;
		database.getSchools(req.session.userdata, classification, function(results){
			data.schools = results;
			complete();
		});
		database.getStateSchoolClassifications(req.session.userdata.state, function(r){
				data.classifications = r;
				complete();
		});
		function complete(){
			if(++done === total){
				res.send(data);
			}
		}
	}

	routes.newClubPhoto = function(req, res){
		function renameFile(file, ext){
			var filename = file.name
			var i = filename.lastIndexOf('.');
		    var extension = (i < 0) ? '' : filename.substr(i);
		    var newName = crypto.randomBytes(20).toString("hex");
		    if(ext){
		    	return newName+ext;
		    }
		    else{
		    	return newName+extension;
		    }
		    
		}

		function resizeFile(src, dst, width, height, callback){
			options = {
					srcPath: src,
					dstPath: dst,
				}
			if(width){
				options.width = width;
			}
			if(height){
				options.height = height;
			}

			im.resize(options, 
				function(err){
					if(err){
						console.log("im: "+err)
					}
					callback();
				});
		}
		function putFileToS3(src, dst, callback){
			client.putFile(src, dst, function(err, res){
				if(err){
					console.log("s3: "+err)
				}
				console.log(src, dst, res.statusCode);
				callback();
			});
		}

		function putInDatabase(filename, club_id, callback){
			database.addClubPhoto(filename, club_id, function(photo_id){
				if(callback){
					callback(photo_id)
				}
				
			});
		}


		var club_id = req.params.id
		file = req.files.photo;
		fileName = renameFile(file);
		resizeFile(file.path, "public/img/photos/"+fileName, 300, null, function(){
			putFileToS3("public/img/photos/"+fileName, "/photos/"+fileName, function(){
				putInDatabase(fileName, club_id)
				fs.unlink("public/img/photos/"+fileName);
				res.send({fileName: fileName})
			})
		})
	}


	routes.getSchool = function(req, res){
		var school = req.params.id;
		var data = {};
		var total = 3;
		var done = 0;
		database.getSchool(req.session.userdata.user_id, school, function(results){
			if(results){
				data = results;
				complete();
			}
			else{
				res.send(404);
			}
		});

		database.schoolUsersWhoAttend(school, function(results){
			data.attend = results;
			complete();
		});

		database.schoolAlumni(school, function(results){
			data.alumni = results;
			complete();
		});

		function complete(){
			if(++done === total){
				res.send(data);
			}
		}
	}

	routes.getUserSchool = function(req, res){
		var school = req.params.id;
		var data = {};
		var total = 3;
		var done = 0;
		database.getCurrentUserSchool(req.session.userdata.user_id, function(result){
			database.getSchool(req.session.userdata.user_id, result, function(results){
				if(results){
					data = results;
					complete();
				}
				else{
					res.send(404);
				}
			});
		})
		

		database.schoolUsersWhoAttend(school, function(results){
			data.attend = results;
			complete();
		});

		database.schoolAlumni(school, function(results){
			data.alumni = results;
			complete();
		});

		function complete(){
			if(++done === total){
				res.send(data);
			}
		}
	}

	routes.newProfilePhoto = function(req, res){
		function renameFile(file, ext){
			var filename = file.name
			var i = filename.lastIndexOf('.');
		    var extension = (i < 0) ? '' : filename.substr(i);
		    var newName = crypto.randomBytes(20).toString("hex")
		    if(ext){
		    	return newName+ext;
		    }
		    else{
		    	return newName+extension;
		    }
		    
		}

		function resizeFile(src, dst, width, height, crop, callback){
			options = {
					srcPath: src,
					dstPath: dst,
				}
			if(width){
				options.width = width;
			}
			if(height){
				options.height = height;
			}
			if(crop){
				im.crop(options, 
				function(err){
					if(err){
						console.log("im: "+err);
					}
					if(callback){
						callback();
					}
				})
			}
			else{
				im.resize(options, 
				function(err){
					if(err){
						console.log("im: "+err);
					}
					if(callback){
						callback();
					}
				})
			}
			
		}
		function multipleSizes(path, images, callback){
			var i;
			var totalImages = images.length;
			var done = 0;
			function complete(){
				if(++done === totalImages){
					callback();
				}
			}
			images.forEach(function(image){
				resizeFile(path, image.dst, image.width, image.height, image.crop, function(){
					image.callback(complete);
				});
			})

				
			
		}
		function putFileToS3(src, dst, callback){
			client.putFile(src, dst, function(err, res){
				if(err){
					console.log("s3: "+err)
				}
				else{
					console.log(res.statusCode);
				}
				if(callback){
					callback();
				}
			})
		}

		function putInDatabase(filename, user_id, callback){
			database.changeProfilePhoto(filename, user_id, function(photo_id){
				callback(photo_id);
			});
		}

		var file = req.files.photo;
		var filename = renameFile(file);
		var fileSizes =[
			{
				dst:"public/img/profile_pics/80px/"+filename, 
				width:80, 
				height:80,
				crop:true,
				callback: function(c){
					putFileToS3("public/img/profile_pics/80px/"+filename, "photos/profile_photos/80px/"+filename, function(){
						fs.unlink("public/img/profile_pics/80px/"+filename);
						c();
					});

				}
			},
			{
				dst:"public/img/profile_pics/30px/"+filename, 
				width:30, 
				height:30,
				crop:true,
				callback: function(c){
					putFileToS3("public/img/profile_pics/30px/"+filename, "photos/profile_photos/30px/"+filename, function(){
						fs.unlink("public/img/profile_pics/30px/"+filename);
						c();
					});
				}
			},
			{
				dst: "public/img/profile_pics/200px/"+filename,
				width:200,
				height:200,
				crop:true,
				callback: function(c){
					putFileToS3("public/img/profile_pics/200px/"+filename, "photos/profile_photos/200px/"+filename, function(){
						fs.unlink("public/img/profile_pics/200px/"+filename);
						c();
					});
				}
			},
			{
				dst: "public/img/photos/"+filename,
				width: 300,
				height: 300,
				callback: function(c){
					putFileToS3("public/img/photos/"+filename, "photos/"+filename, function(){
						fs.unlink("public/img/photos/"+filename);
						c();
					});
				}
			},
			{
				dst: "public/img/photos/full/"+filename,
				width: 700,
				height: false,
				callback: function(c){
					putFileToS3("public/img/photos/full/"+filename, "photos/full/"+filename, function(){
						fs.unlink("public/img/photos/full/"+filename);
						c();
					});
				}
			}
		];

		multipleSizes(file.path, fileSizes, function(){
			putInDatabase(filename, req.session.userdata.user_id, function(){});
			database.putInProfilePictureInAlbum(filename, req.session.userdata.user_id);
			res.send(filename);
		});
	}

	routes.getQuestions = function(req, res){
		var cat = req.query["cat"] || "";
		database.getQuestions(req.session.userdata.user_id, cat, function (data){
			res.send(data);
		});
	}

	routes.getQuestion = function(req, res){
		var question_id = req.params.id;
		database.getQuestion( question_id, function(data){
			if(data){
				res.send(data);
			}
			else{
				res.send(404);
			}
		});
	}

	routes.newAnswer = function(req, res){
		var answer = req.body.answer;
		var question_id = req.body.question_id;
		var user_id = req.session.userdata.user_id;

		database.newAnswer(question_id, user_id , answer, function(data){
			if(data){
				res.send({answer_id: data});
			}
			else{
				res.send(400);
			}
		});
	}
	
	routes.getFriendData = function(req, res){
		var rows, data = {};
		database.getFriend(req.session.userdata.user_id, req.params.id, function(result){
			if(result){
				rows = req.query["rows"].split(" ");
				for(i=0;i<rows.length; i++){
					data[rows[i]] = result[rows[i]];
				}
				res.send(data);
			}
		})
	}
	
	routes.getClubs = function(req, res){
		database.getClubs(req.session.userdata.user_id, function(results){
			res.send(results);
		});
	}

	routes.getClub = function(req, res){
		database.getClub(req.params.id, req.session.userdata.user_id, function(data){
			res.send(data);
		})
	}

	routes.formClub = function(req, res){
		database.createClub(req.body, req.session.userdata.user_id, function(result){
			res.send({club_id:result});
		});
	}

	routes.getPost = function(req, res, next){
		if(req.query["json"]){
			database.getPost(req.session.userdata.user_id, req.params.id, function(result, error){
				if(!result){
					if(error){
						res.send(error, 404);
					}
					else{
						res.send(404);
					}
					return;
				}
				res.send(result);
			})
		}
		else{
			next();
		}
	}

	routes.getPhoto = function(req, res){
		database.getPhoto(req.params.id, function(result){
			if(!result){
				res.send(404);
				return;
			}
			res.send(result);
		})
	}

	routes.requestMembership = function(req, res){
		database.requestMembership(req.session.userdata.user_id, req.params.id, function(result, message){
			var m;
			if(result){
				res.send(message);
			}
			else{
				m = message || {"error":"Something went wrong"};
				res.send(m, 401)
			}
		})
	}

	routes.clubRequests = function(req, res){
		database.getClubRequests(req.session.userdata.user_id, req.params.id, function(results, message){
			if(results){
				res.send(results)
			}
			else{
				res.send(401, message);
			}
		}); 
	}

	routes.resolveClubRequest = function(req, res){

		database.resolveClubRequest(req.session.userdata.user_id, req.params.id, req.body.club_request_id, req.body.answer, function(results, message){
			if(results){

				res.send(message)
				if(req.body.answer){
					generateNotification(results.user_id, req.session.userdata.user_id, "Accpted your club request", "/clubs/club/"+req.params.id);
				}
			}
			else{
				res.send(message, 401);
			}
		})
	}

	routes.admin = function(req, res){
		isAdmin = false;
		if(!isAdmin){
			res.redirect("/");
			return;
		}
		if(req.query["html"]){
			res.render("admin");
		}
		else{
			res.render("index");
		}
	}

	routes.inviteToClub = function(req, res){
		database.inviteToClub(req.session.userdata.user_id, req.params.id, req.body.invites, function(success, message){
			if(success){
				res.send(message);
			}
			else{
				res.send(message, 401);
			}
		})
	}

	routes.getPosts = function(req, res){
		database.getPosts(req.session.userdata.user_id, req.params.post_scope, req.params.reference_id, function(results){
			res.send(results);
		})
	}

	routes.newClubPost = function(req, res){
		database.betterNewPost(req.session.userdata.user_id, req.body.post_body, 2, req.params.id, 0, null, function(result){
			res.send({post_id:result});
		});
	}

	routes.canPostToClub = function(req, res, next){
		database.canPostToClub(req.session.userdata.user_id, req.params.id, function(result){
			if(result){
				next()
			}
			else{
				res.send({"error":"You do not have permission to post in this club"}, 401);
			}
		});
	}
	routes.deletePost = function(req, res){
		database.deletePost(req.body.post_id, function(data){
			res.send(data);
		})
	}
	routes.canDeletePost = function(req, res, next){
		database.canDeletePost(req.session.userdata.user_id, req.body.post_id, function(auth){
			if(auth){
				next();
			}
			else{
				res.send({"error": "You do not have permission to delete this post"}, 401);
			}
		})
	}

	routes.signUpPart1 = function(req, res){
		var password = req.body.password, salt;
		password = crypto.createHash("sha1").update(password).digest("hex");
		salt = crypto.randomBytes(5).toString("hex");
		req.body.birthdate = +new Date(req.body.month+" "+req.body.day+" "+req.body.year)/1000;
		console.log(req.body.birthdate, req.body.month, req.body.day, req.body.year);
		database.newUser(req.body, password, salt, function(data){
			if(data){
				req.session.userdata = data;
				req.session.auth = true;
				req.method = "get";
				res.redirect("/");
			}
			else{
				res.send(400);
			}
		});
	}

	routes.newBuzzPost = function(req, res){
		function renameFile(file, ext){
			var filename = file.name

			var i = filename.lastIndexOf('.');
		    var extension = (i < 0) ? '' : filename.substr(i);
		    var newName = crypto.randomBytes(20).toString("hex")
		    if(ext){
		    	return newName+ext;
		    }
		    else{
		    	return newName+extension;
		    }
		    
		}

		function resizeFile(src, dst, width, height, crop, callback){
			options = {
					srcPath: src,
					dstPath: dst,
				}
			if(width){
				options.width = width;
			}
			if(height){
				options.height = height;
			}
			if(crop){
				im.crop(options, 
				function(err){
					if(err){
						console.log("im: "+err);
					}
					if(callback){
						callback();
					}
				})
			}
			else{
				im.resize(options, 
				function(err){
					if(err){
						console.log("im: "+err);
					}
					if(callback){
						callback();
					}
				})
			}
			
		}
		function putFileToS3(src, dst, callback){
			client.putFile(src, dst, function(err, res){
				if(err){
					console.log("s3: "+err)
				}
				else{
					console.log("s3: " + res.statusCode);
				}
				if(callback){
					callback();
				}
			})
		}

		var file = req.files.photo;
		var fileName;
		if(file.name){
			fileName = renameFile(file);
			resizeFile(file.path, "public/img/photos/"+fileName, 700, null, false, function(){
				putFileToS3("public/img/photos/"+fileName, "/photos/"+fileName, function(){
					putFileToS3("public/img/photos/"+fileName, "/photos/full/"+fileName, function(){
						fs.unlink("public/img/photos/"+fileName);
						next();
					})
				})

			})
		}
		else{
			next();
		}
		function next(){
			database.newBuzzPost(req.session.userdata.user_id, req.body.category, req.body.description, fileName, function(result){
				res.method = "get";
				res.redirect("/buzz");
			})
		}
		
		
	}

	routes.uniqueEmail = function(req, res){
		email = req.query["email"];
		database.checkUniqueEmail(email, function(unique){
			res.send({unique:unique});
		})
	}	

	routes.canViewClub = function(req, res, next){
		database.canViewClub(req.session.userdata.user_id, req.params.id, function(auth){
			if(auth){
				next()
			}
			else{
				res.send(401);
			}
		})
	}

	routes.canJoinClub = function(req, res, next){
		database.canJoinClub(req.session.userdata.user_id, req.params.id, function(auth, message){
			if(auth){
				next()
			}
			else{
				res.send(message, 401);
			}
		})
	}

	routes.joinClub = function(req, res){
		database.newClubMember(req.session.userdata.user_id, req.params.id, function(result){
		res.send(result);
	})
	}

	routes.searchClubs = function(req, res){
		if(!req.query.query){
			res.end();
		}
		database.searchClubs(req.query.query, function(result){
			res.send(result);
		})
	}

	routes.isClubMod = function(req, res, next){
		
		var club_id = req.params.id || req.body.club_id
	
		
		database.isClubMod(req.session.userdata.user_id, club_id, function(result, message){
			if(result){
				next();
			}
			else{
				res.send(message, 401)
			}
		})
	}

	routes.updateClub = function(req, res){
		database.updateClub(req.params.id, req.body, function(result){
			if(result){
				res.send({"success": "Club was update succesfully"});
			}
			else{
				res.send({"error": "Something went wrong"}, 500);
			}
			
		})
	}

	routes.newSportsPost = function(req, res){
		function renameFile(file, ext){
			var filename = file.name
			var i = filename.lastIndexOf('.');
			var extension = (i < 0) ? '' : filename.substr(i);
			var newName = crypto.randomBytes(20).toString("hex")
			if(ext){
				return newName+ext;
			}
			else{
				return newName+extension;
			}
		}

		function resizeFile(src, dst, width, height, crop, callback){
			options = {
					srcPath: src,
					dstPath: dst,
				}
			if(width){
				options.width = width;
			}
			if(height){
				options.height = height;
			}
			if(crop){
				im.crop(options, 
				function(err){
					if(err){
						console.log("im: "+err);
					}
					if(callback){
						callback();
					}
				})
			}
			else{
				im.resize(options, 
				function(err){
					if(err){
						console.log("im: "+err);
					}
					if(callback){
						callback();
					}
				})
			}
			
		}
		function putFileToS3(src, dst, callback){
			client.putFile(src, dst, function(err, res){
				if(err){
					console.log("s3: "+err)
				}
				else{
					console.log(res.statusCode);
				}
				if(callback){
					callback();
				}
			})
		}

		function putInDatabase(filename, post_details, user_id,  callback){
			database.newSportsPost(filename, post_details, user_id, function(post_id){
				callback(post_id);
			});
		}
		
		if(req.files.photo){
			file = req.files.photo;
			fileName = renameFile(file);
			resizeFile(file.path, "public/img/photos/"+fileName, 300, null, false, function(){
				putFileToS3("public/img/photos/"+fileName, "/photos/"+fileName, function(){
					putInDatabase(fileName, req.body, req.session.userdata.user_id, function(post_id){
						res.send({filename: fileName, post_id:post_id})
					})
					fs.unlink("public/img/photos/"+fileName);
				});
			});
		}
		else{
			database.newSportsPost(false, req.body, req.session.userdata.user_id, function(post_id){
				res.send({post_id:post_id});
			});
		}

	}

	routes.getSportsPosts = function(req, res){
		var sport = req.query["sport"] || false;
		database.getSportsPosts(sport, function(result){
			res.send(result);
		})
	}

	routes.searchSchools = function(req, res){
		var school = req.query["school"];
		database.searchSchools(school, function(result){
			res.send(result);
		})
	}

	routes.seenNotifications = function(req, res){
		database.seenNotifications(req.session.userdata.user_id);
		res.end();
	}

	routes.newPhotoComment = function(req, res){
		database.newPhotoComment(req.session.userdata.user_id, req.body, function(result){
			res.send(result);
		})
	}

	routes.canInviteToEvent = function(req, res, next){
		console.log("hey!")
		database.canInviteToEvent(req.session.userdata.user_id, req.params.id, function(auth){
			if(auth){
				next()
			}
			else{
				res.send({"error":"You do not have permission to invite people to this event"})
			}
		});
	}
	routes.getInvitesBySchoolYear = function(req, res, next){
		console.log("hey!")
		database.getSchoolIdByUserId(req.session.userdata.user_id, function(school_id){
			if(school_id){
				database.getUsersBySchoolAndGraduatingYear(school_id, req.body.years, function(ids){
					req.body.invites = ids;
					next();
				})
			}
			else{
				res.send({"error":"something went wrong!"}, 500);
			}
		});
	}
	routes.inviteToEvent = function(req, res){
		database.inviteToEvent(req.body.invites, req.session.userdata.user_id, req.params.id);
		res.send({"success":"You have succesfully invited people to this event"});
		req.body.invites.forEach(function(id){
			generateNotification(id, req.session.userdata.user_id, "invited you to an event", "/events/event/"+req.params.id);
		})
	}

	routes.canEditEvent = function(req, res, next){
		var event_id = req.params.id || req.body.event_id;
		database.canEditEvent(req.session.userdata.user_id, event_id, function(auth){
			if(auth){
				next();
			}
			else{
				res.send(401);
			}
		})
	}
	routes.editEvent = function(req, res){
		database.editEvent(req.body, req.params.id, function(){
			res.send(200);
		})
	}

	routes.userCss = function(req, res){
		var user;
		if(req.query["user"]){
			user = req.query["user"];
			db(user, function(){});
		}
		else{
			user = req.session.userdata.user_id;
			if(req.session.userdata.background){
				res.send({background_id:req.session.userdata.background});
			}
			else{
				db(user, function(css){
					req.session.userdata.background = css;
				})
			}
		}
		
		function db(user, callback){
			database.userCss(user, function(data){
				if(data){
					res.send({background_id:data});
					callback(data);
				}
				else{
					res.send(400);
					callback(0);
				}
			})
		}
	}

	routes.getGradients = function(req, res){
		d = {};
		database.getUserUnlockedBackgrounds(req.session.userdata.user_id, function(data){
			d.unlocked = data || [{background_id:0}];
			database.userCss(req.session.userdata.user_id, function(data){
				d.current = data;
				res.send(d);
			})
		})
	}
	routes.backgroundIsUnlocked = function(req, res, next){
		var bg = req.query["background"];
		if(bg){
			if(+bg === 0 || +bg === 13 || +bg== 15 || +bg === 16 || +bg === 17){
				next();
			}
			else{
				database.backgroundIsUnlocked(req.session.userdata.user_id, bg, function(auth){
					if(auth){
						next();
					}
				})
			}
		}
	}
	routes.changeBackground = function(req, res){
		database.changeBackground(req.session.userdata.user_id, req.query["background"]);
		req.session.userdata.background = req.query["background"]
		res.end();
	}

	routes.getFriends = function(req, res){
		var user = req.params.id || req.session.userdata.user_id;
		database.getFriends(user, function(friends){
			res.send(friends);
		})
	}

	routes.clubHype = function(req, res){
		database.clubHype(function(data){
			res.send(data);
		})

		
	}

	routes.getEditProfile = function(req, res){
		database.getEditProfile(req.session.userdata.user_id, function(data){
			res.send(data);
		});
	}

	routes.editProfile = function(req, res){
		database.editProfile(req.session.userdata.user_id, req.body, function(success, message){
			if(success){
				res.send(message)
			}
			else{
				res.send(message, 500);
			}
		})

	}
	routes.correctPassword= function(req,res,next){
		var password = req.body.password,
		password = crypto.createHash("sha1").update(password).digest("hex");
		database.correctPassword(req.session.userdata.user_id, password, function(auth){
			if(auth){
				next();
			}
			else{
				res.send({"error":"password was incorrect"}, 401);
			}
		})
	}
	routes.changeEmail = function(req, res, next){
		if(req.body.email == req.session.userdata.email){
			next();
		}
		else{
			database.changeEmail(req.session.userdata.user_id, req.body.email, function(success, message){
				if(success){
					req.session.userdata.email = req.body.email;
					next();
				}
				else{
					res.send(message, 500);
				}
			})
		}
	}
	routes.changePassword = function(req, res){
		var password, cpass;
		if(req.body.new_password && req.body.confirm_password){
			password = req.body.new_password;
			password = crypto.createHash("sha1").update(password).digest("hex");
			cpass = req.body.confirm_password;
			cpass = crypto.createHash("sha1").update(cpass).digest("hex");
			if(cpass !== password){
				res.send({error:"passwords do not match!"}, 401)
			}
			else{
				database.changePassword(req.session.userdata.user_id, password, function(){
					res.send(200);
				})
			}
		}
		else{
			res.send(200);
		}
		
		
	}
	routes.modUser = function(req, res){
		var user = req.query["user"];
		if(!user){
			res.send({"error":"Something went wrong"}, 500);
			return;
		}
		database.modUser(req.params.id, user, function(message){
			res.send(message);
		})
	}

	routes.banUser = function(req, res){
		console.log("here")
		var user = req.query["user"];
		if(!user){
			res.send({"error": "Something went wrong"})
			return;
		}
		database.banUser(req.params.id, user, function(message){
			res.send(message);
		})
	}

	routes.getSchoolStudents = function(req, res){
		database.getSchoolStudents(req.params.id, function(data){
			res.send(data);
		})
	}

	routes.getUserPosts = function(req, res){
		database.getUserPosts(req.session.userdata.user_id, function(data){
			res.send(data);
		})
	}

	routes.getUserSchoolPosts = function(req, res){
		database.getUserSchoolPosts(req.session.userdata.user_id, function(data){
			res.send(data);
		})
	}

	routes.getUserPhotos = function(req, res){
		database.getUserPhotos(req.session.userdata.user_id, function(data){
			res.send(data);
		})
	}

	routes.hasBeenProfilePhoto = function(req, res, next){
		database.getAlbumForPhoto(req.body.photo_id, function(data){
			if(data.name === "Profile Pictures"){
				database.changeProfilePhoto(data.filename, req.session.userdata.user_id);
				res.send({filename:data.filename})
			}
			else{
				next();
			}
		})
	}
	routes.newProfilePhotoFromPhotos = function(req, res){
		function resizeFile(src, dst, width, height, crop, callback){
			options = {
					srcPath: src,
					dstPath: dst,
				}
			if(width){
				options.width = width;
			}
			if(height){
				options.height = height;
			}
			if(crop){
				im.crop(options, 
				function(err){
					if(err){
						console.log("im: "+err);
					}
					if(callback){
						callback();
					}
				})
			}
			else{
				im.resize(options, 
				function(err){
					if(err){
						console.log("im: "+err);
					}
					if(callback){
						callback();
					}
				})
			}
			
		}
		function multipleSizes(path, images, callback){
			var i;
			var totalImages = images.length;
			var done = 0;
			function complete(){
				if(++done === totalImages){
					callback();
				}
			}
			images.forEach(function(image){
				resizeFile(path, image.dst, image.width, image.height, image.crop, function(){
					image.callback(complete);
				});
			})

				
			
		}
		function putFileToS3(src, dst, callback){
			client.putFile(src, dst, function(err, res){
				if(err){
					console.log("s3: "+err)
				}
				else{
					console.log(res.statusCode);
				}
				if(callback){
					callback();
				}
			})
		}

		function putInDatabase(filename, user_id, callback){
			database.changeProfilePhoto(filename, user_id, function(photo_id){
				callback(photo_id);
			});
		}


		database.getFilenameByPhotoId(req.body.photo_id, function(filename){
			download = s3.download("/photos/"+filename, __dirname+"/public/img/photos/"+filename)
			download.on("end", function(){
			
				var fileSizes =[
					{
						dst:"public/img/profile_pics/80px/"+filename, 
						width:80, 
						height:80,
						crop:true,
						callback: function(c){
							putFileToS3("public/img/profile_pics/80px/"+filename, "photos/profile_photos/80px/"+filename, function(){
								fs.unlink("public/img/profile_pics/80px/"+filename);
								c();
							});

						}
					},
					{
						dst:"public/img/profile_pics/30px/"+filename, 
						width:30, 
						height:30,
						crop:true,
						callback: function(c){
							putFileToS3("public/img/profile_pics/30px/"+filename, "photos/profile_photos/30px/"+filename, function(){
								fs.unlink("public/img/profile_pics/30px/"+filename);
								c();
							});
						}
					},
					{
						dst: "public/img/profile_pics/200px/"+filename,
						width:200,
						height:200,
						crop:true,
						callback: function(c){
							putFileToS3("public/img/profile_pics/200px/"+filename, "photos/profile_photos/200px/"+filename, function(){
								fs.unlink("public/img/profile_pics/200px/"+filename);
								c();
							});
						}
					},
				];

				multipleSizes(__dirname+"/public/img/photos/"+filename, fileSizes, function(){
					putInDatabase(filename, req.session.userdata.user_id, function(){});
					res.send({filename:filename});
				});
			})
		});
	}

	routes.searchFriendsByName = function(req, res){
		database.searchFriendsByName(req.session.userdata.user_id, req.query["query"], function(data){
			res.send(data);
		})
	}

	routes.canEditPhoto = function(req, res, next){
		if(req.params.id){
			var photo_id  = req.params.id;
		}
		else{
			var photo_id = req.body.photo_id;
		}
		database.canEditPhoto(req.session.userdata.user_id, photo_id, function(auth){
			if(auth){
				next();
			}
			else{
				res.send({"error":"you do not have permission to edit this photo"})
			}
		})
	}

	routes.editPhotoDescription = function(req, res){
		database.updatePhotoDescription(req.body.photo_id, req.body.description, function(data){
			console.log(data);
			if(data){
				res.send(200)
			}
			else{
				res.send(400);
			}
		})
	}	

	routes.deletePhoto = function(req, res){
		database.deletePhoto(req.body.photo_id, function(){
			res.send(200);
		})
	}

	routes.likeBuzzPost = function(req, res){
		database.likeBuzzPost(req.session.userdata.user_id, req.body.buzz_post_id, function(liked){
			res.send(liked);
		})
	}

	routes.getCategories = function(req, res){
		database.getCategories(function(cat){
			res.send(cat);
		})
	}

	routes.addBuzzPhotoToAlbum = function(req, res){
		database.addBuzzPhotoToAlbum(req.session.userdata.user_id, req.body.filename, function(){
			res.send(200);
		})
	}

	routes.newClubPhotoFromPhotos = function(req, res){
		database.newClubPhotoFromPhotos(req.session.userdata.user_id, req.body.photo_id, req.body.club_id, function(filename){
			res.send({filename:filename})
		})
	}

	routes.newEventPhotoFromPhotos = function(req, res){
		database.newEventPhotoFromPhotos(req.session.userdata.user_id, req.body.photo_id, req.body.event_id, function(filename){
			res.send({filename:filename})
		})
	}

	routes.deleteEvent = function(req, res){
		database.deleteEvent(req.params.id, function(){
			res.send(200);
		})
	}

	routes.searchPeople = function(req, res){
		var person = req.query["person"];
		database.searchPeopleByName(person, function(names){
			res.send(names);
		})
	}
	function generateNotification(notified, notifier, message, url, callback){
		if(notified === notifier) return;
		database.generateNotification(notified, notifier, message, url, function(results){

			if(callback){
				callback(results);
			}
		});
		database.getBasicUserInfo(notifier, function(result){
			sockets.notification(notified, result.fname, result.lname, result.profile_pic, message, url);
		})
	}
	return routes;
}
