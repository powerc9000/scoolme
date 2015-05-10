
angular.module("Directives", [])
.directive("backupImage", function(){
	return function(scope, element, attrs){
	
		var newImageUrl = attrs.backupImage || "http://cdn.scoolme.com/photos/default.png"
		var loadElement = $(document.createElement('img'));
		scope.attrs = attrs;
		setTimeout(function(){
			loadElement.attr("src", attrs.ngSrc);
		},500)
		loadElement.bind("error", function(e){
			console.log("fail")
			element.attr("src", newImageUrl);
		});
		
		
	}
})
.directive("buzzShowPhoto", function(){
	return{
		restrict: "A", 
		link: function(scope, element, attrs){
			element.click(function(){
				$("body").toggleClass('body-locked');
				$(".buzz-photo-contain").toggleClass('dp-block');
			})
			
		}
	}
})
.directive("fileUploader", function($location, $rootScope, $parse){
	return{
		restrict: "A",
		link: function(scope, element, attrs){
			// elemet.children("button").preventDefault();
			element.ajaxForm({
				beforeSubmit: function(arr, $form, options){
					if(arr.length <= 1 && !arr[0].value){
						if(attrs.runWithoutImage){
							$("#upload-progress").removeClass("hide");
						}
						else{
							return false
						}
						
					}
					else{
						$("#upload-progress").removeClass("hide");
					}
				},
				uploadProgress: function(event, position, total, percentComplete){
					$("#upload-progress .progress .bar").css({"width":percentComplete+"%"})
					if(+percentComplete === 100){
						$("#upload-progress .message").html("Please wait while we move some bytes");
					}
				},
				success: function(response){
					$("#upload-progress").hide();
					$rootScope.$apply(function(){
						scope.response = response;
						$parse(attrs.runAfter)(scope, response);
					})
				}
			})
		}
	}
})
.directive("eventPhotoUpload", function($location, $rootScope){
	return{
		restrict: "A", 
		link: function(scope, element, attrs){
			element.ajaxForm({	
				beforeSubmit: function(arr, $form, options){
					if(arr.length === 1 && !arr[0].value){
							return false
						}
						else{
							$("#upload-progress").removeClass("hide");
						}
				},
				uploadProgress: function(event, position, total, percentComplete){
					$("#upload-progress .progress .bar").css({"width":percentComplete+"%"})
				},
				success: function(response){
					$("#upload-progress").addClass("hide");
					$rootScope.$apply(function(){
						scope.event.filename = response.fileName;
						scope.eventCopy.filename = response.fileName;
						scope.show_uploader = false;
					})
				},
				error: function(){
					$("#upload-progress").addClass("hide");
				},
				resetForm: true

			})
		}
	}
})
.directive("profilePhotoUpload", function($location, $rootScope, socket){
	return{
		restrict: "A", 
		link: function(scope, element, attrs){
			element.ajaxForm({	
				beforeSubmit: function(arr, $form, options){
					if(arr.length === 1 && !arr[0].value){
							return false
						}
						else{
							$("#upload-progress").removeClass("hide");
						}
				},
				uploadProgress: function(event, position, total, percentComplete){
					$("#upload-progress .progress .bar").css({"width":percentComplete+"%"})
				},
				success: function(response){
					$("#upload-progress").addClass("hide");
					socket.emit("profilePhotoChange", {filename:response});
					$rootScope.$apply(function(){
						scope.show_uploader = false;
						scope.data.profile_pic = response;
						scope.uploadProfilePhoto = false;
						scope.data.posts.forEach(function(p){
							if(p.user_id === scope.loggedInUser.user_id){
								p.profile_pic = response;
							}
						})
					})
				},
				error: function(){
					$("#upload-progress").addClass("hide");
				},
				resetForm: true

			})
		}
	}
})
.directive("checklast", function(){
	return {
		restrict: "A",
		link: function (scope, element, attrs){
			if(scope.$last){
				scope.$emit("lastLoaded");
				runJquery();
			}
		}
	}
})
.directive('markdown', function($compile, $timeout) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
			// scope.$watch(scope.post.post_body, function(newval, oldval){
			// 	var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
			// 	scope.post.post_body.replace(exp, "<a href='$1'>$1</a>")
				
   //      	})
            	
        }
    }
})
.directive("showMore", function(){
	return{
		restrict: "A",
		link: function(scope, element, attrs){
			console.log(scope.showMore)
		}
	}
	
})
.directive("masonry", function(){
	return{
		restrict:"A",
		controller: function($scope, $timeout, loader){
			$timeout(function(){
				$("#photos").imagesLoaded(function(){
					$("#photos").removeClass("hide");
					$("#photos").masonry({

						itemSelector: '.photo',
						columnWidth: function(width){
							return width / 3;
						}
					})

				})
			},500)
		},
		link: function(scope, element, attr){

		}
	}
})
.directive("centerImage", function(){
	return function(scope, el, attrs){
		el.hide();
		el.load(function(){
			var h = el.height();
			var w = el.width();
			el.css("margin-top", h/ -2 + "px")
			el.css({"left":"50%", "margin-left":w/-2 + "px"})
			el.show();
		})
	}
})
.directive("masonry2", function($timeout){
	return{
		restrict:"A",
		link: function(scope, el, attr){
			scope.$on("lastLoaded", function(){
					el.imagesLoaded(function(){
						el.masonry({
							itemSelector: attr.selector,
							columnWidth: function(width){
								return width / 3;
							}
						})
					})
			})
			
		}
	}
})
.directive("masonryRefresh", function($timeout){
	return{
		link: function(scope, el, attr){
			el.click(function(){
				$("[masonry2]").masonry("reload");
			})
			
		}
	}
})
.directive("backToTop", function(){
	return{
		restrict: "A",
		link: function(scope, element, attrs){
		
			$(element).hide();
			$(document).scroll(function(){
				if( $(this).scrollTop() > 500 ) {
					$(element).show();
				}
				else{
					$(element).hide();
				}
			})
			$(element).click(function(){
				$("html, body").animate({scrollTop:0}, "slow");
			});
			

		}
	}
})
.directive("close", function(){
	return{
		restrict: "A",
		link: function(scope, element, attrs){
			$(element).click(function(){
				$(attrs.close).stop();
				$(attrs.close).slideToggle(500, function(){
					$(element).children("i").toggleClass("icon-chevron-down icon-chevron-right")
				});
			})
		}
	}
	
})
.directive("loadImage", function($http){
	return{
		restrict: "A",
		link: function(scope, element, attrs){
			scope.$watch(attrs, function(){
				$http.get("/get-photo/"+attrs.loadImage).success(function(data){
					element.attr("src", "http://cdn.scoolme.com/photos/"+data);
				})
			});

		}
	}
})
.directive("isUniqueEmail", function($http){
	return{
		require:"ngModel",
		controller: function($scope){

			setTimeout(function(){
				$scope.oldEmail = $scope.data.email;
			},100);
		},
		link:function(scope, el, attrs, ngModel){

			scope.$watch('editForm.email.$viewValue', function(newValue, old){
				console.log("data");
				if(!scope.editForm.email.$error.email && !scope.editForm.email.$pristine && scope.oldEmail !== scope.data.email){
					$http.get("/email-is-unique?email="+newValue).success(function(data){
						console.log(data);
						scope.editForm.email.$error.unique = !data.unique;
					})
				}
			})
		}
	}
})
.directive("nthWindow", function(){
	return{
		link: function(scope, el, attrs){
			setTimeout(function(){
				var position = attrs.nthWindow;
				el.css({right:300*position})
			},0)
		}
	}
	
})
.directive("ngHref", function(){
	return function(scope, el, attrs){
		if(!attrs.ngHref){
			el.click(function(e){
				e.preventDefault();
				return false;
			});
		}
		
	}
})
.directive("href", function(){
	return function(scope, el, attrs){
		if(attrs.href === "#"){
			el.click(function(e){
				e.preventDefault();
				return false;
			});
		}
		
	}
})