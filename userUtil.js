const path = require("path");
const fs = require("fs");
var dataPath;
var rawData;
var users;
var dataPath;
var rawData2;
var assetUploads;
var dataPath3;
var rawData3;
var assetDownloads;
var dataPath4;
var rawData4;
var userAvatars;
reloadData();
function reloadData() {
dataPath = path.join(__dirname, "/users.json");
rawData = fs.readFileSync(dataPath, "utf8");
users = JSON.parse(rawData);

dataPath2 = path.join(__dirname, "/public/asset_data.json");
rawData2 = fs.readFileSync(dataPath2, "utf8");
assetUploads = JSON.parse(rawData2);

dataPath3 = path.join(__dirname, "/public/download_log.json");
rawData3 = fs.readFileSync(dataPath3, "utf8");
assetDownloads = JSON.parse(rawData3);

dataPath4 = path.join(__dirname, "/public/avatars.json");
rawData4 = fs.readFileSync(dataPath4, "utf8");
userAvatars = JSON.parse(rawData4);
}

function isLoggedIn(req, res, next) {
    if(!req.session || !req.session.loggedIn) {
        res.render("login", {error: "", created: ""});
        return;
    }
    next();
}

function getUser(req, res, next) {
    reloadData();
    for(var i=0; i<users.length; i++) {
        if(users[i].username == req.params.username) {
            return next();
        }
    }
    res.render("user_not_found")
    return;
}

function getUserNot(req, res, next) {
    reloadData();
    
    const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const isAdmin = req.session.username === "admin";
    const usernameTaken = users.some(user => user.username === req.body.username);
    const ipInUse = users.some(user => user.ip === userIP);

    if (usernameTaken) {
        return res.render("create", {
            error: "Username taken. Please choose another."
        });
    }

    if (!isAdmin && ipInUse) {
        return res.render("create", {
            error: "Creating multiple accounts under the same IP is disallowed."
        });
    }

    next();
}


function checkLog(req, res, next) {
    reloadData();
    req.already_downloaded = false;
    for(var i=0; i<assetDownloads.length; i++) {
        if(assetDownloads[i].ip == req.headers['x-forwarded-for'] || req.socket.remoteAddress) {
            req.already_downloaded = true;
        }
    }
    return next();
}

function createUser(req, res, next) {
    reloadData();
    const meta = {
        username: req.body.username,
        password: req.body.password,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    };

    current = [];
    const dataPath5 = path.join(__dirname, "/public/activity_feed.json");
    rawData3 = fs.readFileSync(dataPath5, "utf8");
    current = JSON.parse(rawData3);

    const act = {
        "activity": [meta.username, "created an account", "", new Date().toISOString()]
    }

    current.push(act);

    fs.writeFileSync(dataPath5, JSON.stringify(current, null, 2));

    users.push(meta);
    fs.writeFileSync(dataPath, JSON.stringify(users, null, 2));
    next();
}

function getSortedUsers(req, res, next) {
  reloadData();

  // Initialize user map with 0 downloads for each user
  var usermap = {};
  for (var l = 0; l < users.length; l++) {
    usermap[users[l].username] = 0;
  }

  // Count downloads per user
  for (var i = 0; i < assetDownloads.length; i++) {
    const username = assetDownloads[i].upload_username;
    if (usermap[username] !== undefined) {
      usermap[username] += 1;
    } else {
      usermap[username] = 1; // In case username not in users array
    }
  }

  // Convert to array, filter out users with 0 downloads, then sort descending by downloads
  const sorted = Object.entries(usermap)
    .filter(([username, count]) => count > 0) // Remove zero downloads
    .sort((a, b) => b[1] - a[1]);

  req.user_table = sorted;
  next();
}

function countUploads(req, res, next) {
    reloadData();
    var asset_list = [];
    var count = 0;
    for(var i=0; i<assetUploads.length; i++) {
        if(assetUploads[i].upload_user == req.params.username) {
            count++;
            asset_list.push(assetUploads[i].id);
        }
    }
    req.count_uploads = count;
    req.asset_list = asset_list;
    return next();
}

function countDownloads(req, res, next) {
    reloadData();
    var count = 0;
    for(var i=0; i<assetDownloads.length; i++) {
        if(assetDownloads[i].upload_username == req.params.username || assetDownloads[i].upload_username == req.session.username) {
            count++;
        }
    }
    req.download_count = count;
    next();
}

function isWithinLast24Hours(isoTime) {
  const now = new Date();
  const then = new Date(isoTime);
  const diff = now - then; // in ms

  return diff <= 24 * 60 * 60 * 1000; // 24 hours in milliseconds
}

function countDownloads24h(req, res, next) {
    reloadData();
    var count = 0;
    for(var i=0; i<assetDownloads.length; i++) {
        if((assetDownloads[i].upload_username == req.params.username || assetDownloads[i].upload_username == req.session.username) && (isWithinLast24Hours(assetDownloads[i].time))) {
            count++;
        }
    }
    req.download_count24h = count;
    next();
}

function countDownloadsIndividual(req, res, next) {
    reloadData();
    var count = 0;
    for(var i=0; i<assetDownloads.length; i++) {
        if(assetDownloads[i].asset_id === req.params.id) {
            count++;
        }
    }
    req.download_count_individual = count;
    next();
}

function findAvatar(req, res, next) {
    reloadData();
    var found;
    for(var i=0; i<userAvatars.length; i++) {
        if((userAvatars[i].username == req.params.username) || userAvatars[i].username == req.session.username) {
            found = userAvatars[i].avatar;
        }
    }
    if(!found) {
        req.user_avatar = "https://ryryfn.com/simple-user-default-icon-free-png.webp";
    } else {
        req.user_avatar = found;
    }
    next();
}

function createUserObject(req, res, next) {
    var user = {
        username: req.params.username,
        upload_count: req.count_uploads,
        asset_list: req.generatedHTML,
        download_count: req.download_count,
        avatar: req.user_avatar
    }
    req.user = user;
    return next();
}

function verifyUser(req, res, next) {
    var found = false;
    for(var i=0; i<users.length; i++) {
        if(req.body.username == users[i].username) {
            found = true;
            req.passwordCompare = users[i].password;
            next();
        }
    }
    if(!found) {
        res.render("login", {error: "User not found"})
        return;
    }
}

function verifyPassword(req, res, next) {
    if(req.body.password == req.passwordCompare) {
        req.session.loggedIn = true;
        req.session.username = req.body.username;
        return next();
    }
    res.render("login", { error: "Invalid username or password" });
    return;
}

module.exports = {
    isLoggedIn,
    verifyPassword,
    verifyUser,
    getUser,
    countUploads,
    createUserObject,
    countDownloads,
    findAvatar,
    getSortedUsers,
    getUserNot,
    createUser,
    checkLog,
    countDownloadsIndividual,
    countDownloads24h
}