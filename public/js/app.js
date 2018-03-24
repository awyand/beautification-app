$(document).ready(function() {

    //////////////////////// GLOBALS ////////////////////////////////

    // Cloudinary Variables
    var CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/spiffy-plus/upload";
    var CLOUDINARY_UPLOAD_PRESET = "prdda0cv";

    // Variables for uploading images from form
    // These have to be global since we're separating the Choose File button from the upload action
    var imageToUpload;
    var formData;
    // Sets up the users location as a global variable
    var userEnteredLocation;

    //User Email
    var userEmail;

    //////////////////////// GOOGLE MAPS AUTOCOMPLETE ////////////////////////////////


    function initAutocomplete() {
      // Create the autocomplete object, restricting the search to geographical
      // location types.
      autocomplete = new google.maps.places.Autocomplete(
        (document.getElementById('user-location')), {
          types: ['address']
        });
      };

      $(document).ready(initAutocomplete);

      ////////////////////////GOOGLE MAPS AUTOCOMPLETE ////////////////////////////////



    //////////////////////// TIPPY TOOLTIPS ////////////////////////////////

    tippy('.tippy-btn', {
      arrow: true
    });

    //////////////////////// POPULATE MAPBOX ////////////////////////////////
    mapPoints("all", userEmail);


    //////////////////////// EVENT HANDLERS ////////////////////////////////

    // When the user selects an image using the Choose File button (triggers a change)
    $("#userImg").on("change", function() {
      // Store the file object in imageToUpload
      imageToUpload = $(this)[0].files[0];

      // Construct FormData object
      formData = new FormData();
      formData.append("file", imageToUpload);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    });

    // When the user clicks the upload button
    $("#submit-new-issue").on("click", function(e) {
      // Prevent default
      e.preventDefault();

      //Client side form validation:
      //Check to make sure the user is signed in
      if (userEmail === "") {
        googleFailure();
      }
      //Check to make sure they've entered a project name
      else if ($("#userProjectName").val() === ""){
        $(".error-message").html("Error - please enter a user project name");
        $("#userProjectName").attr("style", "border:1px solid red");
        $("#user-location").attr("style", "border:1px solid #D1D1D1");
        return;
      }
      //Check to make sure they've entered a Location
      else if ($("#user-location").val() === ""){
        $(".error-message").html("Error - please enter a location");
        $("#user-location").attr("style", "border:1px solid red");
        $("#userProjectName").attr("style", "border:1px solid #D1D1D1");
        return;
      } else {
      // If no image is provided
      if (!imageToUpload) {
        //Send an error message to upload an image
        $(".error-message").html("Error - please upload a photo");
        return;
      } else {
        // Otherwise the user uploaded an image
        // Make an AJAX POST request to Cloudinary
        $.ajax({
          url: CLOUDINARY_URL,
          data: formData,
          type: "POST",
          contentType: false,
          processData: false

        }).then(function(cloudinaryRes) {
          // Call sendTweet function and pass image url
          sendTweet(cloudinaryRes.url);
        }).catch(function(cloudinaryErr) {
          // Error handling
          console.error(cloudinaryErr);
        });
      }
    }
    });

    // When user clicks upvote or downvote button
    $(document).on("click", ".vote-btn", function() {
      // Set type of vote (for use during AJAX PUT below)
      var voteType;
      if ($(this).hasClass("upvote-btn")) {
        voteType = "up";
      } else if ($(this).hasClass("downvote-btn")) {
        voteType = "down";
      }

      // Set API route based on ID
      var apiRoute = `/api/issues/${$(this).attr("data-id")}`;

      // AJAX request to get current score and perform appropriate PUT request based on voteType
      // i.e. either increment or decrement current score
      $.ajax(apiRoute, {
        type: "GET"
      }).then(function(res) {
        // Create newScore variable
        var newScore;
        // Create newStatus variable and set it to current status
        var newStatus = res.status;
        // If voteType is up
        if (voteType === "up") {
          // Add one to current score
          newScore = res.score + 1;
          // If current status is New and new score is 5
          if (res.status === "New" && newScore === 5) {
            // Set newStatus to Open
            newStatus = "Open";
            // Send new tweet replying to original tweet
            replyToTweet(res.tweetID, newStatus, res.title, res.id, res.userName);
          }
        } else if (voteType === "down") {
          // Else if voteType is down, subtract one from current score
          newScore = res.score - 1;
        }

        // AJAX PUT request to update score
        $.ajax(apiRoute, {
          data: {
            score: newScore,
            status: newStatus
          },
          type: "PUT"
        }).then(function(updateResponse) {
          // Set element with class issue-score and matching data-id to score from response
          $(`.issue-score[data-id="${updateResponse.id}"]`).text(" " + updateResponse.score);
          // Set element with class issue-status-span and matching data-id to status from response
          $(`.issue-status[data-id="${updateResponse.id}"]`).text(" " + updateResponse.status);
        });
      });
    });

    // Function to handle Close Issue button being clicked
    $(".close-issue-btn").on("click", function(e) {
      // Prevent default
      e.preventDefault();
      // Set API route based on ID
      var apiRoute = `/api/issues/${$(this).attr("data-id")}`;
      // Get issue from db
      $.ajax(apiRoute, {
        type: "GET"
      }).then(function(res) {
        // If status is not closed
        if (res.status !== "Closed") {
          // AJAX PUT request to update status
          $.ajax(apiRoute, {
            data: {
              status: "Closed"
            },
            type: "PUT"
          }).then(function(updateResponse) {
            // Set status on page based on response
            $(`.issue-status[data-id="${updateResponse.id}"]`).text(" " + updateResponse.status);
            // Disable voting buttons
            $(`.vote-btn[data-id=${updateResponse.id}]`).prop("disabled", true);
            // Send update tweet
            replyToTweet(updateResponse.tweetID, "Closed", updateResponse.title, updateResponse.id, updateResponse.userName);
          });
        } else {
          console.log("Already closed.");
        }
      });
    });

    //Form Success Modal
    $("#back-to-top").on("click", function() {
     $("#formSuccess").attr("style", "display:none");
      location.reload();
    });


    //////////////////////// TWITTER API FUNCTIONS ////////////////////////////////

    // Function to send tweet, which takes an image URL as an arg
    function sendTweet(imageUrl) {
      // Set up Codebird
      var cb = new Codebird();
      cb.setConsumerKey("fBm9xMcWCrSIzi4sjqC9mCI9T", "awCSRWNXzqCl1Rz3k5fvZl5XyKOwAX4PE7tVthASHjGm52OqOg");
      cb.setToken("973723797613367298-sBw6uEPUauV5v2ceKQYlvuZofplRlYu", "knYbR6dulgqloyYCwxZtd6BeSuesb3DbgdsyPQwsKaKBu");

      // Grab pertinent information from form
      var tweetInfo = {
        title: $("#userProjectName").val().trim(),
        location: $("#user-location").val().trim(),
        type: $("#userProjectType").val().trim().toLowerCase(),
        username: userName
      };

      // Create message
      var params = {
        status: `New ${tweetInfo.type} request from ${tweetInfo.username}! Here's the info:\n\nProject Name: ${tweetInfo.title}\nLocation: ${tweetInfo.location}\nImage: ${imageUrl}\n\n Visit spiffy.plus to vote and we'll get started right away!`
      };

      // Post message
      cb.__call("statuses_update", params, function(reply, rate, err) {

        // If Twitter API responded with error stating the tweet is too long
        // If reply errors exists
        if (reply.errors) {
          // Check to see if code is 187 (tweet too long)
          if (reply.errors[0].code === 186) {
            // Tell user to shorten some fields in order to make it short enough
            $(".error-message").html("Error - Please shorten your project name and/or location.");
            $("#userProjectName").attr("style", "border:1px solid red");
            $("#user-location").attr("style", "border:1px solid #D1D1D1");
          } else {
            // Alert user that there was an error and to try again
            $(".error-message").html(`Error ${reply.httpstatus} - Please see console for more details.`);
            $("#userProjectName").attr("style", "border:1px solid red");
            $("#user-location").attr("style", "border:1px solid #D1D1D1");
            console.log(reply.errors);
          }
        } else if (reply.httpstatus === 200) {
          // Else, if Twitter API responsed with 200 OK
          // Call function that posts new project to our backend database
          // And pass Cloudnary image URL and Twitter ID
          postNewProject(imageUrl, reply.id_str);
        } else {
          // Catch all else for any weird error
          $(".error-message").html("Error - Please try again.");
          $("#userProjectName").attr("style", "border:1px solid red");
          $("#user-location").attr("style", "border:1px solid #D1D1D1");
        }
      });
    }

    // function to reply to a tweet with a status update
    function replyToTweet(originalTweetID, newStatus, issueTitle, issueID, issueUserName) {
      // Set up Codebird
      var cb = new Codebird();
      cb.setConsumerKey("fBm9xMcWCrSIzi4sjqC9mCI9T", "awCSRWNXzqCl1Rz3k5fvZl5XyKOwAX4PE7tVthASHjGm52OqOg");
      cb.setToken("973723797613367298-sBw6uEPUauV5v2ceKQYlvuZofplRlYu", "knYbR6dulgqloyYCwxZtd6BeSuesb3DbgdsyPQwsKaKBu");

      // Set update status based on newStatus
      var statusUpdate;
      if (newStatus === "Open") {
        statusUpdate = `We've started work on a project! Here's the info:\n\nSpiffy ID: ${issueID}\nSubmitted By: ${issueUserName}\nProject Name: ${issueTitle}\n\nStay tuned for updates!`;
      } else if (newStatus === "Closed") {
        statusUpdate = `Project Complete! We've completed work on the following project:\n\nSpiffy ID: ${issueID}\nSubmitted By: ${issueUserName}\nProject Name: ${issueTitle}\n\nThanks for the tip, and have a spiffy day!`;
      }

      // Create message and point it at originalTweetID
      var params = {
        status: statusUpdate,
        in_reply_to_status_id: originalTweetID
      }

      // Post message
      cb.__call("statuses_update", params, function(reply, rate, err) {
        // Error handling
        if (err) {
          console.log(err);
        } else {
          console.log(reply);
        }
      });
    }

    //////////////////////// SPIFFY API FUNCTIONS ////////////////////////////////

    // Function to post new project to Spiffy API/database
    // Takes image URL and twitter ID as argument
    function postNewProject(imgUrl, twitterID) {

      var userEnteredLocation = $("#user-location").val().trim();
      // function to run geoCoder first to grab matching location name for database
      getGeoLocation(userEnteredLocation, function(geocodeLat, geocodeLong){
        // pass return location name from call back into newProject variable
        var newProject = {
          title: $("#userProjectName").val().trim(),
          location: userEnteredLocation,
          projectType: $("#userProjectType").val().trim(),
          imglocation: imgUrl,
          tweetID: twitterID,
          score: 0,
          userName: userName,
          userEmail: userEmail,
          lat: geocodeLat,
          lon: geocodeLong
        }

        console.log(newProject);

        $.ajax("/api/issues", {
          data: newProject,
          type: "POST"
        }).then(function() {
        $("#formSuccess").attr("style", "display:block");
          console.log("new project added");

        });

      });
    }




    //////////////////////////// ISSUE VIEWS ///////////////////////////////////
    ////////////////// VIEW ALL, VIEW NEW, VIEW ONE USER ///////////////////////

    //Function to create the appropriate divs and populate them
    function createIssueCards(data) {
    $(".issue-header").remove();
    $(".issue-body-modal").remove();
    for (i = 0; i < data.length; i++) {

      var newIssueDivTitle = $("<div class='issue issue-header'>").html("<p class='issue-title'>" + data[i].title + "</p>");
      var newIssueBody = $("<div class='issue-body'>").html("<button type='button' class='close'>Close &times;</button>");
      var newIssueBodyTitle = $("<div class='issue-title'>").html(data[i].title);
      var newIssueImg = $("<div class='issue-img-div'>").html("<img class='issue-img' src='"+ data[i].imglocation +"'>")
      var newIssueDetails = $("<div class='issue-details'>").html("<p><u>CATEGORY:</u><span class='issue-type' data-id=" + data[i].id + ">" + data[i].projectType + "</span>"
          + "</p><p><u>LOCATION:</u><span class='issue-location' data-id=" + data[i].id + ">" + data[i].location + "</span>"
          + "</p><p><u>STATUS:</u><span class='" + data[i].status + "' data-id=" + data[i].id + "> " + data[i].status + "</span>"
          + "</p><p><u>SCORE:</u><span class='issue-score' data-id=" + data[i].id + "> " + data[i].score + "</span>"
          + "</p><p><u>DATE:</u><span class='issue-date' data-id=" + data[i].id + "> " + data[i].createdAt + "</span>"
          + "</p><button type='button' class='vote-btn upvote-btn' data-id=" + data[i].id + "><i class='far fa-thumbs-up'></i></button>"
          + "<button type='button' class='vote-btn downvote-btn' data-id=" + data[i].id + "><i class='far fa-thumbs-down'></i></button>"
          + "<a class='button twitter-btn' data-id="+ data[i].id +" href='https://twitter.com/spiffyplus/status/"+ data[i].tweetID + "' target='_blank'><i class='fab fa-twitter'></i>&nbsp;View on Twitter</a>"
          + "<button type='button' class='close-issue-btn' data-id="+ data[i].id +"><i class='fas fa-flag-checkered'></i>&nbsp;Close Issue</button>"
        );
      var newModal = $('<div class="modal issue-body-modal"></div>');
      $(newIssueBody).prepend(newIssueDetails);
      $(newIssueBody).prepend(newIssueImg);
      $(newIssueBody).prepend(newIssueBodyTitle);
      $(newModal).append(newIssueBody);
      $(".issues").append(newIssueDivTitle);
      $(".issues").append(newModal);
      if (userEmail === "spiffyplus@gmail.com"){
        $(".close-issue-btn").attr("style", "display:block");
      }
    };
  };
  //VIEW BUTTONS
  ///VIEW MY ISSUES Function
    $("#viewOneUser").on("click", function() {
  //verify the user is signed in
      if (userEmail === "") {
        googleFailure();

      } else {

      $(".issue").empty();
      $.ajax("/api/issues/userEmail/" + userEmail, {
        type: "GET"
      }).then(function(data) {
        mapPoints("mine", userEmail);
        createIssueCards(data);
        // console.log(data);
      })
      }
    });

    //VIEW ALL ISSUES
    $("#viewAll").on("click", function() {
      $(".issue").empty();
      $.ajax("api/all", {
        type: "GET"
      }).then(function(data){
        mapPoints("all", userEmail);
        createIssueCards(data);
        // console.log(data);
      });
    });

    //VIEW ALL ISSUES
    $("#viewNew").on("click", function() {
      $(".issue").empty();
      $.ajax("api/issues/status/new", {
        type: "GET"
      }).then(function(data){
        mapPoints("new", userEmail);
        createIssueCards(data);
        // console.log(data);
      });
    });

////////////////////////////  MODALS ////////////////////////////////////////////
//OPEN MODAL
    $(document).on('click', '.issue-header', function() {
      $(this).next("div").fadeIn(200);
    });
//CLOSE MODAL
    $(document).on('click', '.close', function() {
      console.log("close button clicked");
      $('.modal').fadeOut(200);
    });

    // ************************************************************************************************
    // ***************************** GOOGLE AUTHENTICATION ********************************************
    // ************************************************************************************************

    // variables where we will store the users info on log in
    var userName = "";
    var userEmail = "";

    // on page load render the google btn to the nav
    renderButton("1");

    // execute sign out
    $(document).on('click', '#google-signOut', function() {
      signOut();
    });


    // function that renders google btn
    function onSuccess(googleUser) {
      var profile = googleUser.getBasicProfile();
      //console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
      console.log('Signed in as ' + profile.getName());
      console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
      //console.log('Image URL: ' + profile.getImageUrl());
      userEmail = profile.getEmail();
      userName = profile.getName();

      // render sign out button
      $(".googleBtn").empty();
      $(".googleBtn").html(`<div id="google-signOut">Sign Out</div>`);

      //If the user is admin (spiffyplus@gmail.com), show the close issue button
      if (userEmail === "spiffyplus@gmail.com"){
        $(".close-issue-btn").attr("style", "display:block");
      }

      // close modal if open
      document.getElementById("google-signIn-failure").style.display = "none";

    };

    function onFailure(error) {
      console.log(error);
    };

    // render google sign in button
    var signInBtn;
    function renderButton(btnNum) {
      signInBtn = "google-signIn" + btnNum;
      gapi.signin2.render(signInBtn, {
        'scope': 'profile email',
        'width': 240,
        'height': 50,
        'longtitle': true,
        'theme': 'dark',
        'onsuccess': onSuccess,
        'onfailure': onFailure
      });
    };

    // google sign out function
    function signOut() {
      var auth2 = gapi.auth2.getAuthInstance();
      auth2.signOut().then(function() {
        console.log('User signed out.');

        // empty the variables holding user info
        userEmail = "";
        userName = "";

        // render the sign in button
        $(".googleBtn").empty();
        $(".googleBtn").html(`<div id="google-signIn1"></div>`);

        renderButton("1");

        $(".close-issue-btn").attr("style", "display:none");

      });
    }

  // google sign in failure modal
  function googleFailure() {
    document.getElementById("google-signIn-failure").style.display = "block";
    renderButton("2");
  }

  $(".close-btn").on("click", function() {
    document.getElementById("google-signIn-failure").style.display = "none";
  });

// ************************************************************************************************  
// ***************************** Nav Menu *********************************************************
// ************************************************************************************************

$(".nav-open-btn").on("click", function() {
  openNav();
});

$(".nav-close-btn").on("click", function() {
  closeNav();
});

function openNav() {
  document.getElementById("mySidenav").style.width = "250px";
}

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
}


// ************************************************************************************************
// ***************************** JS EFFECTS *******************************************************
// ************************************************************************************************


// ************************************ NAV MENU SCROLL JUMP **************************************
$(".nav-home").on("click", function() {
  $('html,body').animate({
    scrollTop: $("#home").offset().top
  }, 1000);
});

$(".nav-about").on("click", function() {
  $('html,body').animate({
    scrollTop: $("#about").offset().top
  }, 1000);
});

$(".nav-current-projects").on("click", function() {
  $('html,body').animate({
    scrollTop: $("#current-projects").offset().top
  }, 1000);
});

$(".nav-add-project").on("click", function() {
  $('html,body').animate({
    scrollTop: $("#add-a-project").offset().top
  }, 1000);
});

// ************************************ ABOUT PROJECT EXAMPLES **************************************
var projects = [
  {
    title : "Clean Up",
    desc : "Report areas in your community that require clean up.",
    image : "images/clean-up.jpg",
  },

  {
    title : "Paint",
    desc : "Commission an artist to breath life in your community with a mural or other street art.",
    image : "images/paint.jpg",
  },

  {
    title : "Plant",
    desc : "Coordinate with your county or city to enhance your community with plant life.",
    image : "images/plant.jpg",
  }
]

for (i = 0; i < projects.length; i++) {
  $(".examples").append(`
      <div class="grid-item">
        <img class="card-image ${projects[i].title}" src="${projects[i].image}">
        <div class="card-contents">
          <h4>${projects[i].title}</h4> 
          <p>${projects[i].desc}</p> 
        </div>
      </div>
    `);

  }

  $(".Clean").on("click", function() {
    $('html,body').animate({
      scrollTop: $("#add-a-project").offset().top
    }, 1000);
    $("#userProjectType").val('Clean Up');
  });

  $(".Paint").on("click", function() {
    $('html,body').animate({
      scrollTop: $("#add-a-project").offset().top
    }, 1000);
    $("#userProjectType").val('Paint');
  });

  $(".Plant").on("click", function() {
    $('html,body').animate({
      scrollTop: $("#add-a-project").offset().top
    }, 1000);
    $("#userProjectType").val('Plant');
  });

});
