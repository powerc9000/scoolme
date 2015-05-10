exports.router = function(sockets, database, crypto, im, client, fs){
	var routes = require("./routes");
	routes = routes.apply(this, arguments);

	//Change www to non www
	this.get('/*', function(req, res, next) {
	  if (req.headers.host.match(/^www/) !== null ) {
	    res.redirect('http://' + req.headers.host.replace(/^www\./, '') + req.url);
	  } else {
	    next();     
	  }
	});

	this.get("/usercss", routes.loggedIn, routes.userCss);

	//View routes
	this.get("/", routes.index);
	this.get("/home", routes.loggedIn, routes.home);
	this.get("/profile", routes.loggedIn, routes.profile);
	this.get("/user/:id", routes.loggedIn, routes.profile);
	this.get("/user/:id/*", routes.loggedIn, routes.profile);
	this.get("/events", routes.loggedIn, routes.index);
	this.get("/events/*", routes.loggedIn, routes.index);
	this.get("/schools*", routes.loggedIn, routes.index);
	this.get("/buzz*", routes.loggedIn, routes.loggedIn, routes.index);
	this.get("/post/:id", routes.loggedIn, routes.getPost, routes.index);
	this.get("/404", routes.loggedIn, routes.index);
	this.get("/clubs*", routes.loggedIn, routes.index);
	this.get("/points", routes.loggedIn, routes.index);
	this.get("/sports*", routes.loggedIn, routes.index);
	this.get("/backgrounds", routes.loggedIn, routes.index);
	this.get("/friends*", routes.loggedIn, routes.index);
	this.get("/profile/edit", routes.loggedIn, routes.index);
	this.get("/user", function(req,res){
		res.redirect("profile")
	})
	this.get("/profile/account-settings", routes.loggedIn, routes.index);

	//Api routes 


	//Getting data
	this.get("/userdata", routes.loggedIn, routes.userdata);
	this.get("/login", routes.login);
	this.get("/logout", routes.logout);
	this.get("/auth", function(req,res){res.redirect("/login")})
	this.get("/photos/:id", routes.loggedIn, routes.photos);
	this.get("/temp-album", routes.loggedIn, routes.tempAlbum);
	this.get("/album/:id", routes.loggedIn, routes.getAlbum);
	this.get("/like-post/:id", routes.loggedIn, routes.likePost);
	this.get("/unlike-post/:id", routes.loggedIn, routes.unlikePost);
	this.get("/get-events", routes.loggedIn, routes.getEvents);
	this.get("/get-event/:id", routes.loggedIn, routes.getEvent);
	this.get("/notifications", routes.loggedIn, routes.notifications);
	this.get("/request-friendship/:id", routes.loggedIn, routes.requestFriendship);
	this.get("/get-schools", routes.loggedIn, routes.getSchools);
	this.get("/get-school/:id", routes.loggedIn, routes.getSchool);
	this.get("/get-school", routes.loggedIn, routes.getUserSchool);
	this.get("/get-questions", routes.loggedIn, routes.getQuestions);
	this.get("/get-friend-data/:id", routes.loggedIn, routes.getFriendData);
	this.get("/get-all-friends", routes.loggedIn, routes.getFriends)
	this.get("/get-question/:id", routes.loggedIn, routes.getQuestion);
	this.get("/posts/:id", routes.loggedIn, function(req, res){res.redirect("/post/"+req.params.id)})
	this.get("/seen-notifications", routes.loggedIn, routes.seenNotifications);
	this.get("/get-friends/:id", routes.loggedIn, routes.getFriends);
	this.get("/get-clubs", routes.loggedIn, routes.getClubs);
	this.get("/get-club/:id", routes.loggedIn, routes.canViewClub, routes.getClub);
	this.get("/get-photo/:id", routes.loggedIn, routes.getPhoto);
	this.get("/request-membership/:id", routes.loggedIn, routes.requestMembership);
	this.get("/club-requests/:id", routes.loggedIn, routes.clubRequests);
	this.get("/admin", routes.loggedIn, routes.admin)
	this.get("/get-posts/:post_scope/:reference_id", routes.loggedIn, routes.getPosts)
	this.get("/email-is-unique", routes.uniqueEmail);
	this.get("/join-club/:id", routes.canJoinClub, routes.joinClub);
	this.get("/search-club", routes.loggedIn, routes.searchClubs);
	this.get("/search-schools", routes.searchSchools);
	this.get("/get-sports-posts", routes.loggedIn, routes.getSportsPosts);
	this.get("/user-css", routes.loggedIn, routes.userCss);
	this.get("/get-gradients", routes.loggedIn, routes.getGradients);
	this.get("/change-background", routes.loggedIn, routes.backgroundIsUnlocked, routes.changeBackground);
	this.get("/club-hype", routes.loggedIn, routes.clubHype);
	this.get("/edit-profile", routes.loggedIn, routes.getEditProfile);
	this.get("/all-students/:id", routes.loggedIn, routes.getSchoolStudents);
	this.get("/get-user-posts", routes.loggedIn, routes.getUserPosts);
	this.get("/get-user-school-posts", routes.loggedIn, routes.getUserSchoolPosts);
	this.get("/get-user-photos", routes.loggedIn, routes.getUserPhotos);
	this.get("/search-friends-by-name", routes.loggedIn, routes.searchFriendsByName);
	this.get("/get-categories", routes.loggedIn, routes.getCategories);
	this.get("/people-you-may-know", routes.loggedIn, routes.getPeopleYouMayKnow);
	this.get("/search-people", routes.loggedIn, routes.searchPeople);
	this.get("/events-near-location", routes.loggedIn, routes.eventsNearLocation)


	//Creating and editing data
	this.post("/edit-event/:id", routes.loggedIn, routes.canEditEvent, routes.editEvent);
	this.post("/invite-to-event/:id", routes.loggedIn, routes.canInviteToEvent, routes.inviteToEvent);
	this.post("/new-sports-post", routes.loggedIn, routes.newSportsPost);
	this.post("/front-page-signup", routes.signUpPart1);
	this.post("/update-club/:id", routes.loggedIn, routes.isClubMod, routes.updateClub)
	this.post("/new-club-photo/:id", routes.loggedIn, routes.isClubMod, routes.newClubPhoto);
	this.post("/delete-post", routes.loggedIn, routes.canDeletePost, routes.deletePost);
	this.post("/new-club-post/:id", routes.loggedIn, routes.canPostToClub, routes.newClubPost);
	this.post("/invite-to-club/:id", routes.loggedIn, routes.inviteToClub);
	this.post("/resolve-club-request/:id", routes.loggedIn, routes.resolveClubRequest)
	this.post("/form-club", routes.loggedIn, routes.formClub);
	this.post("/auth", routes.auth);
	this.post("/new-post", routes.loggedIn, routes.newPost);
	this.post("/new-comment", routes.loggedIn, routes.newComment);
	this.post("/new-photo", routes.loggedIn, routes.uploadFile);
	this.post("/new-profile-photo", routes.loggedIn, routes.newProfilePhoto);
	this.post("/temp-album/existing", routes.loggedIn, routes.tempToExistingAlbum);
	this.post("/temp-album/new", routes.loggedIn, routes.tempToNewAlbum);
	this.post("/new-event", routes.loggedIn, routes.newEvent);
	this.post("/new-event-photo/:id", routes.loggedIn, routes.newEventPhoto);
	this.post("/rsvp", routes.loggedIn, routes.rsvpForEvent);
	this.post("/new-answer", routes.loggedIn, routes.newAnswer);
	this.post("/new-photo-comment", routes.loggedIn, routes.newPhotoComment);
	this.post("/edit-profile", routes.loggedIn, routes.editProfile);
	this.post("/mod-user/:id", routes.loggedIn, routes.isClubMod, routes.modUser);
	this.post("/ban-user/:id", routes.loggedIn, routes.isClubMod, routes.banUser);
	this.post("/new-buzz-post", routes.loggedIn, routes.newBuzzPost);
	this.post("/new-profile-photo-from-photos", routes.loggedIn, routes.hasBeenProfilePhoto, routes.newProfilePhotoFromPhotos);
	this.post("/edit-photo-description", routes.loggedIn, routes.canEditPhoto, routes.editPhotoDescription);
	this.post("/delete-photo", routes.loggedIn, routes.canEditPhoto, routes.deletePhoto);
	this.post("/like-buzz-post", routes.loggedIn, routes.likeBuzzPost);
	this.post("/add-buzz-photo-to-album", routes.loggedIn, routes.addBuzzPhotoToAlbum);
	this.post("/new-club-photo-from-photos", routes.loggedIn, routes.isClubMod, routes.newClubPhotoFromPhotos);
	this.post("/new-event-photo-from-photos", routes.loggedIn, routes.canEditEvent, routes.newEventPhotoFromPhotos);
	this.post("/delete-event/:id", routes.loggedIn , routes.canEditEvent, routes.deleteEvent);
	this.post("/delete-album", routes.loggedIn, routes.ownsAlbum, routes.deleteAlbum);
	this.post("/account-settings", routes.loggedIn, routes.correctPassword, routes.changeEmail, routes.changePassword);
	this.post("/invite-school-years/:id", routes.loggedIn, routes.canInviteToEvent, routes.getInvitesBySchoolYear, routes.inviteToEvent);
}