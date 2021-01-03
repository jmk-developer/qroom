/*

   ____  _____                       
  / __ \|  __ \                      
 | |  | | |__) |___   ___  _ __ ___  
 | |  | |  _  // _ \ / _ \| '_ ` _ \ 
 | |__| | | \ \ (_) | (_) | | | | | |
  \___\_\_|  \_\___/ \___/|_| |_| |_|

QRoom
by jmkdev

January 1st-3rd 2021
made for the MLH 2021 new year hackathon

I'm very sorry for not making this code more clean.
I was quite pressured for time.

*i swear i write code that looks better than this*

*/

const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const fs = require("fs");

const app = express();

app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());

function getSession(request) {
  // Get a session from a request.
  if (request.cookies["Authentication_Token"]) {
    let data = fs.readFileSync(__dirname + "/storage/authenticated.json", {
      encoding: "utf8",
      flag: "r"
    });
    let authenticated = JSON.parse(data);
    let sessions = authenticated["sessions"];
    let session = sessions[request.cookies["Authentication_Token"]];
    if (session) {
      return session;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

function isSessionAuthenticated(session) {
  // Check if a session is authenticated.
  if (session["enabled"]) {
    let session_date = new Date(session["date"]);
    let current_date = new Date(Date.now());
    let date_time_diff = current_date.getTime() - session_date.getTime();
    let date_day_diff = date_time_diff / (1000 * 3600 * 24);

    if (date_day_diff < 1) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

function isAuthenticated(request) {
  // Check if a request is authenticated.
  let session = getSession(request);
  return isSessionAuthenticated(session);
}

function decodeQRoom(qroom_code) {
  // Decodes a QRoom code.
  console.log("Recieved QRoom Code " + qroom_code);
  if (qroom_code.startsWith("_RI")) {
    console.log("Valid code.");
    // We know that this is a QRoom code.
    let code_split = qroom_code.split("");
    let building_code = code_split[3] + code_split[4] + code_split[5];
    let room_code = parseInt(code_split[6] + code_split[7] + code_split[8]);
    return {
      qroom_code: "_RI" + building_code + room_code.toString(),
      building_code: building_code,
      room_code: room_code
    };
  } else {
    console.log("Invalid code.")
    return false;
  }
}

function joinRoom(username, building, room) {
  // User joins a new room.
  let data = fs.readFileSync(__dirname + "/storage/rooms.json", {
    encoding: "utf8",
    flag: "r"
  });
  data = JSON.parse(data);

  if (data["userRooms"][username]["building"]) {
    return false;
  }
  
  if (!data["buildings"][building.toLowerCase()]) {
    return false; // Building does not exist, so we return.
  }
  
  data["userRooms"][username]["building"] = building; // Set the user's building
  data["userRooms"][username]["room"] = room; // Set the user's room
  data["buildings"][building.toLowerCase()]["rooms"][room]["people"].push(username); // Append username to "people" in rooms

  let str_data = JSON.stringify(data, null, 1);
  fs.writeFileSync(__dirname + "/storage/rooms.json", str_data);
  return true;
}

function leaveRoom(username) {
  // Removes the user from their current room.
  let data = fs.readFileSync(__dirname + "/storage/rooms.json", {
    encoding: "utf8",
    flag: "r"
  });
  data = JSON.parse(data);

  if (data["userRooms"][username]["building"] == false) {
    return false;
  }

  let building = data["userRooms"][username]["building"];
  let room = data["userRooms"][username]["room"];
  let roomPeople = data["buildings"][building.toLowerCase()]["rooms"][room]["people"];
  data["userRooms"][username] = {
    building: false,
    room: false
  };

  const index = roomPeople.indexOf(username);
  if (index > -1) {
    roomPeople.splice(index, 1);
  }

  let str_data = JSON.stringify(data, null, 1);
  fs.writeFileSync(__dirname + "/storage/rooms.json", str_data);
  return true;
}

function getRoom(username) {
  // Gets info about the room a user is in.
  let data = fs.readFileSync(__dirname + "/storage/rooms.json", {
    encoding: "utf8",
    flag: "r"
  });
  data = JSON.parse(data);

  if (data["userRooms"][username]["building"]) {
    return data["buildings"][data["userRooms"][username]["building"].toLowerCase()]["rooms"][
      data["userRooms"][username]["room"]
    ];
  } else {
    return false; // User is not in any rooms.
  }
}

function getRoomInfo(building, room) {
  // Gets info about a specific room, with a given building/room code.
  let data = fs.readFileSync(__dirname + "/storage/rooms.json", {
    encoding: "utf8",
    flag: "r"
  });
  data = JSON.parse(data);
  return data["buildings"][building.toLowerCase()]["rooms"][room];
}

app.get("/isAuthenticated", (request, response) => {
  // Checks if the active user is authenticated, and, if so, returns username data.
  let session = getSession(request);
  if (session && isSessionAuthenticated(session)) {
    response.send({
      loggedIn: true,
      username: session["username"]
    });
  } else {
    response.send({
      loggedIn: false,
      username: false
    });
  }
});

app.get("/test", (request, response) => {
  // Used for "Ping" button.
  console.log(request.cookies)
  response.send("Done!");
});

app.get("/myRoom", (request, response) => {
  let session = getSession(request);
  if (session && isSessionAuthenticated(session)) {
    response.send({
      roomName: getRoom(session.username).name
    });
  } else {
    response.status(401).send({
      message: "You are not logged in."
    });
  }
})

app.get("/decode", (request, response) => {
  // Decodes a QRoom code into room and building codes.
  let decoded = decodeQRoom(request.query.qroom);
  if (decoded) {
    response.send(decoded);
  } else {
    response.status(400).send({
      message: "Invalid QRoom code."
    });
  }
});

app.post("/submitQR", (request, response) => {
  // Submits a QRoom code.
  let decoded = decodeQRoom(request.body.qroom);
  let session = getSession(request);
  if (session && isSessionAuthenticated(session)) {
    console.log("User authenticated.")
    if (decoded) {
      if (getRoom(session["username"])) {
        leaveRoom(session["username"]); // Leave the old room
        console.log("User " + session["username"] + " has left room.")
      }
      console.log("User " + session["username"] + " has joined building=" + decoded.building_code + " room=" + decoded.room_code)
      
      let roomInfo = getRoomInfo(decoded.building_code, decoded.room_code)
      
      joinRoom(session["username"], decoded.building_code, decoded.room_code); // Join the new room
      
      response.send({
        roomName: roomInfo.name
      });
    } else {
      console.log("Recieved invalid QRoom code.")
      response.status(400).send({
        message: "Invalid QRoom code."
      });
    }
  } else {
    console.log("no baby 😢😢")
    response.status(401).send({
      message: "Not authenticated."
    });
  }
});

app.post("/leaveRoom", (request, response) => {
  // Removes the user from their room.
  let session = getSession(request);
  if (session && isSessionAuthenticated(session)) {
    leaveRoom(session["username"]);
    response.send({
      message: "Left QRoom room."
    });
  } else {
    response.status(401).send({
      message: "Not authenticated."
    });
  }
});

app.get("/getRoom", (request, response) => {
  // Gets the user's current room and building.
  let session = getSession(request);
  if (session && isSessionAuthenticated(session)) {
    let room = getRoom(session.username);
    return room;
  } else {
    response.status(401).send({
      message: "Not authenticated."
    });
  }
});

app.post("/login", (request, response) => {
  if (request.body.username && request.body.password) {
    fs.readFile(__dirname + "/storage/accounts.json", "utf8", (err, data) => {
      if (err) {
        // At this point there was an error reading the account database.
        response.status(401).send({
          message: "Failed to retrieve account database. Try again later."
        });
        return;
      }

      let accounts = JSON.parse(data);

      if (accounts[request.body.username]) {
        // At this point we know that the account exists.
        if (
          accounts[request.body.username]["password"] == request.body.password
        ) {
          // At this point we know that the account exists and the password is correct, which means the user can log in.

          // Load JSON from DB.
          let authenticated_data = fs.readFileSync(
            __dirname + "/storage/authenticated.json",
            { encoding: "utf8", flag: "r" }
          );
          let authenticated = JSON.parse(authenticated_data);

          // Generate token and session.
          let token = crypto.randomBytes(64).toString("hex");
          while (authenticated["sessions"][token]) {
            token = crypto.randomBytes(64).toString("hex");
          }
          authenticated["sessions"][token] = {
            username: request.body.username,
            date: new Date(Date.now()).toISOString(),
            enabled: true
          };

          // Stringify and save JSON back to DB.
          authenticated_data = JSON.stringify(authenticated, null, 1);
          fs.writeFileSync(
            __dirname + "/storage/authenticated.json",
            authenticated_data
          );
          
          response.send({
            message: "Successfully logged in.",
            token: token
          });
        } else {
          // At this point we know the password is invalid.
          response.status(401).send({
            message: "Invalid username or password."
          });
        }
      } else {
        // At this point the account does not exist (invalid username).
        response.status(401).send({
          message: "Invalid username or password."
        });
      }
    });
  } else {
    response.status(401).send({
      message: "No username or password was specified."
    });
  }
});

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
