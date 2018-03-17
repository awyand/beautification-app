$(document).ready(function() {
    //////////////////////////////
    ////// GLOBAL VARIABLES //////
    //////////////////////////////

    // Cloudinary Variables
    var CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/spiffy-plus/upload";
    var CLOUDINARY_UPLOAD_PRESET = "prdda0cv";
    // Default image (i.e. for when user doesn't upload an image)
    var SPIFFY_LOGO_URL = "http://res.cloudinary.com/spiffy-plus/image/upload/v1521299063/spiffy-temp-logo.png";

    // Variables for uploading images from form
    // These have to be global since we're separating the Choose File button from the upload action
    var imageToUpload;
    var formData;

    ////////////////////////////
    ////// EVENT HANDLERS //////
    ////////////////////////////

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

      // If no image is provided
      if (!imageToUpload) {
        // Call sendTweet with default image
        sendTweet(SPIFFY_LOGO_URL);
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
    });

    // When user clicks upvote or downvote button
    $(".vote-btn").on("click", function() {
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
        // Creat newScore variable
        var newScore;
        // If voteType is up
        if (voteType === "up") {
          // Add one to current score
          newScore = res.score + 1;
        } else if (voteType === "down") {
          // Else if voteType is down, subtract one from current score
          newScore = res.score - 1;
        }

        // AJAX PUT request to update score
        $.ajax(apiRoute, {
          data: {
            score: newScore
          },
          type: "PUT"
        }).then(function(updateResponse) {
          // Set element with class issue-score and matching data-id to score from response
          $(`.issue-score[data-id="${updateResponse.id}"]`).text(updateResponse.score);
        });
      });
    });


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
      };

      // Create message
      var params = {
        status: `We just received a new ${tweetInfo.type} request from ${tweetInfo.username}! Here's the info:\nTitle: ${tweetInfo.title}\nLocation: ${tweetInfo.location}\nImage: ${imageUrl}`
      };

      // Post message
      cb.__call("statuses_update", params, function(reply, rate, err) {
        // Error handling
        if (err) {
          console.log(err);
        } else {
          // call postNewProject and pass imageUrl and tweetID as args
          postNewProject(imageUrl, reply.id_str);
        }
      });
    }

    // Function to post new project to Spiffy API/database
    // Takes image URL and twitter ID as argument
    function postNewProject(imgUrl, twitterID) {
      var newProject = {
        title: $("#userProjectName").val().trim(),
        location: $("#user-location").val().trim(),
        projectType: $("#userProjectType").val().trim(),
        imglocation: imgUrl,
        tweetID: twitterID,
        score: 0,
        userName: userName,
        userEmail: userEmail
      }

      console.log(newProject);

      $.ajax("/api/issues", {
        data: newProject,
        type: "POST"
      }).then(function() {
        console.log("new project added");
      });

      // Reload page
      location.reload();
    }

    $("#viewOne").on("click", function() {
      var user = "hillary";
      $(".issue").empty();
      $.ajax("/api/issues/" + user, {
        type: "GET"
      }).then(function(data) {
        console.log(data);
        console.log(data.issue[0].title);
        console.log(data.issue.length);
        for (i = 0; i < data.issue.length; i++) {
          var newIssueDiv = $('<div class="issue">').html(
            '<p class="issue-title">' + data.issue[i].title +
            '</p><p class="issue-type">CATEGORY: ' + data.issue[i].projectType +
            '</p><p class="issue-location issue-item">LOCATION: ' + data.issue[i].projectType +
            '</p><p class="issue-status issue-item">STATUS: </span><span class="open">' + data.issue[i].status +
            '</p><p class="issue-votes issue-item"><i class="far fa-thumbs-up"></i>' + data.issue[i].upvotes +
            '<i class="far fa-thumbs-down"></i>' + data.issue[i].downvotes +
            '</p><img class="issue-img issue-item" src=' + data.issue[i].imglocation +
            '<button type="button" class="close">Close &times;</button>'
          );
          $(".issues").append(newIssueDiv);
        }
      })
    });

    /*Modal Open and Close*/
    /*Open modal*/
    $(document).on('click', '.issue', function() {
      $(this).next("div").show(200);
    });
    /*close modal*/
    $(document).on('click', '.close', function() {
      console.log("close button clicked");
      $('.modal').hide(200);
    });

    // ************************************************************************************************
    // ***************************** GOOGLE AUTHENTICATION ********************************************
    // ************************************************************************************************
    var userName = "";
    var userEmail = "";


    function onSuccess(googleUser) {
      var profile = googleUser.getBasicProfile();
      //console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
      console.log('Signed in as ' + profile.getName());
      console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
      //console.log('Image URL: ' + profile.getImageUrl());
      userEmail = profile.getEmail();
      userName = profile.getName();
      console.log(userName + ": " + userEmail);
    }

    function onFailure(error) {
      console.log(error);
    }

    function renderButton() {
      gapi.signin2.render('my-signin2', {
        'scope': 'profile email',
        'width': 240,
        'height': 50,
        'longtitle': true,
        'theme': 'dark',
        'onsuccess': onSuccess,
        'onfailure': onFailure
      });
    }

    function signOut() {
      var auth2 = gapi.auth2.getAuthInstance();
      auth2.signOut().then(function() {
        console.log('User signed out.');

        userEmail = "";
        userName = "";
      });
    }
});
