const express = require("express");
const session = require("express-session");
const crypto = require("crypto");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const fetch = require('node-fetch');
const archiver = require("archiver");
const { findAsset, processResult, uploadAssetMetadata, createHTMLAssetList, getActivityFeed, generateId } = require("./assetUtil.js");
const { isLoggedIn, createUser, verifyPassword, verifyUser, getUser, countUploads, createUserObject, countDownloads, findAvatar, getSortedUsers, getUserNot, checkLog, countDownloadsIndividual, countDownloads24h} = require("./userUtil.js");
const PORT = 3000;
const app = express();

app.use(express.urlencoded({ extended: true }));

app.use(cors({ origin: "*" }));

app.use(express.json()); // must be included before route handlers

const isProduction = process.env.NODE_ENV === "production";

app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || "fallback-secret", // 🔐 change this to something strong
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    httpOnly: true,
    secure: isProduction, // true if using HTTPS
    sameSite: "lax"
  }
}));


function timeAgoString(isoTime) {
  const now = new Date();
  const then = new Date(isoTime);
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const years = Math.floor(days / 365);

  const remainingDays = days % 365;
  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  let parts = [];

  if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  if (remainingDays > 0) parts.push(`${remainingDays} day${remainingDays !== 1 ? 's' : ''}`);
  if (remainingHours > 0) parts.push(`${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`);
  if (parts.length === 0 || (years === 0 && days === 0 && hours === 0 && minutes < 5)) {
    parts.push(`${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`);
  }

  return parts.join(', ') + ' ago';
}

function searchAssets(searchTerm, assets) {
  const results = [];
  const words = searchTerm.toLowerCase().split(/\s+/);

  for (const asset of assets) {
    let score = 0;
    const name = asset.name?.toLowerCase() || "";
    const category = asset.category?.toLowerCase() || "";
    const keywords = (asset.keywords || []).map(k => k.toLowerCase());

    for (const word of words) {
      // Substring matches
      if (name.includes(word)) score += 10;
      if (category.includes(word)) score += 5;
      for (const kw of keywords) {
        if (kw.includes(word)) score += 3;
      }

      // Fuzzy bonus
      score += fuzzyScore(name, word);
      score += fuzzyScore(category, word);
      for (const kw of keywords) {
        score += fuzzyScore(kw, word);
      }
    }

    if (score > 0) {
      results.push({ asset, score });
    }
  }

  // Sort by best match
  results.sort((a, b) => b.score - a.score);
  return results.map(r => r.asset); // return just assets, sorted
}

function fuzzyScore(text, term) {
  if (!text || !term) return 0;

  let score = 0;
  let tIndex = 0;
  for (let i = 0; i < text.length && tIndex < term.length; i++) {
    if (text[i] === term[tIndex]) {
      score++;
      tIndex++;
    }
  }

  return score >= term.length - 1 ? 2 : 0; // basic fuzzy tolerance
}

function getLatestSortedEntriesByUser(entries, targetUsername) {
  const latestByAssetId = {};

  for (const entry of entries) {
    if (entry.username !== targetUsername || !entry.id) continue;

    const existing = latestByAssetId[entry.id];

    // Compare timestamps, keep the latest
    if (!existing || new Date(entry.uploadedAt) > new Date(existing.uploadedAt)) {
      latestByAssetId[entry.id] = entry;
    }
  }

  // Convert to array and sort by time descending
  return Object.values(latestByAssetId).sort((a, b) => {
    return new Date(b.uploadedAt) - new Date(a.uploadedAt);
  });
}

function getDriveDisplayLink(inputUrl) {
  var splitURL = inputUrl.split("/");
  return `https://drive.google.com/uc?export=view&id=${splitURL[5]}`;
}



app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // folder for EJS files

app.use(express.static("public"));
console.log(countDownloads, countDownloads24h, findAvatar); // Should NOT show undefined


app.get("/leaderboard", getSortedUsers, (req, res)=> {
  res.render("leaderboard", {sorted: req.user_table});
})
app.get("/", (req, res) => {
  dataPath2 = path.join(__dirname, "/public/asset_data.json");
  rawData2 = fs.readFileSync(dataPath2, "utf8");
  assets = JSON.parse(rawData2).slice(-10).reverse();
 var admin = false;
  if(req.session.username == "admin") {
    admin = true;
  }
    assets.forEach(asset => {
  asset.timeAgo = timeAgoString(asset.uploadedAt);
});
    res.render("home", {assets: assets, admin: admin})
})

app.get("/preview/:id", findAsset, countDownloadsIndividual, processResult, (req, res) => {

    res.render(req.result, { asset: req.asset, count: req.download_count_individual });
});

app.get("/login", (req, res) => {
    res.render("login", {error: "", created: ""});
})

app.get("/create", (req, res) => {
    res.render("create", {error: ""});
})

app.get("/search/:search", (req, res) => {
  var dataPath2 = path.join(__dirname, "/public/asset_data.json");
  var rawData2 = fs.readFileSync(dataPath2, "utf8");
  var assets = JSON.parse(rawData2);

  var filtered = searchAssets(req.params.search, assets);

  res.render("assets", {assets: filtered});

})

app.get("/approve", (req, res) => {
  if(req.session.username == "admin") {
    res.render("approve");
  } else {
    res.render("no_permission");
  }
})

app.post("/approve", (req, res) => {
  var dataPath2 = path.join(__dirname, "/public/asset_data.json");
  var rawData2 = fs.readFileSync(dataPath2, "utf8");
  var assets = JSON.parse(rawData2);

    var dataPath3 = path.join(__dirname, "/public/uploads.json");
  var rawData3 = fs.readFileSync(dataPath3, "utf8");
  var assets3 = JSON.parse(rawData3);

  assets.push(JSON.parse(req.body.asset_data));
  fs.writeFileSync(dataPath2, JSON.stringify(assets, null, 2));

  assets3.push(req.body.asset_data);
  fs.writeFileSync(dataPath3, JSON.stringify(assets3, null, 2));

  res.send("Success");
})

app.post("/login", verifyUser, verifyPassword, (req, res) => {
    res.redirect("/");
});

app.post("/create", getUserNot, createUser, (req, res) => {
  res.render("login", {error: "", created: "created"})
});

app.get("/upload", isLoggedIn, (req, res) => {
    res.render("upload");
})

app.get('/avatar/:fileId', async (req, res) => {
  const fileId = req.params.fileId;
  const url = `https://drive.google.com/uc?export=display&id=${fileId}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch file');
    }
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', response.headers.get('content-type'));

    // Pipe the file content to the client
    response.body.pipe(res);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

app.post("/upload", generateId, uploadAssetMetadata, (req, res) => {
  res.render("success");
})

app.post("/avatar", (req, res) => {
   var dataPath2 = path.join(__dirname, "/public/avatars.json");
  var rawData2 = fs.readFileSync(dataPath2, "utf8");
  var avatars = JSON.parse(rawData2);
  var avatar = 
    {
        "username": req.session.username,
        "avatar": getDriveDisplayLink(req.body.link)
    }
    avatars.push(avatar);
    fs.writeFileSync(dataPath2, JSON.stringify(avatars, null, 2));
    res.redirect("/dashboard");
})

app.get("/request", isLoggedIn, (req, res) => {
   var dataPath2 = path.join(__dirname, "/public/requests.json");
  var rawData2 = fs.readFileSync(dataPath2, "utf8");
  var requests = JSON.parse(rawData2);
  res.render("requests", { requests: requests })
})

app.post("/request", isLoggedIn, (req, res) => {
   var dataPath2 = path.join(__dirname, "/public/requests.json");
  var rawData2 = fs.readFileSync(dataPath2, "utf8");
  var requests = JSON.parse(rawData2);
  var request = {
    name: req.body.name,
    description: req.body.description,
    imageUrl: req.body.imageUrl
  }
  requests.push(request);
  fs.writeFileSync(dataPath2, JSON.stringify(requests, null, 2));

  res.render("requests", { requests: requests })
})

app.get("/assets", (req, res) => {
  dataPath2 = path.join(__dirname, "/public/asset_data.json");
  rawData2 = fs.readFileSync(dataPath2, "utf8");
  assets = JSON.parse(rawData2);
  res.render("assets", {assets: assets });
})

app.get("/users/:username", getUser, countUploads, countDownloads, findAvatar, createHTMLAssetList, createUserObject, (req, res) => {
  res.render("user_page", { user: req.user });
})

app.get("/dashboard", isLoggedIn, countDownloads, countDownloads24h, findAvatar, (req, res) => {
  const allEntries = JSON.parse(fs.readFileSync(path.join(__dirname, "/public/asset_data.json"), "utf8"));
  const userEntries = getLatestSortedEntriesByUser(allEntries, req.session.username);

  res.render("user_list", { assets: userEntries, downloads: req.download_count, downloads24h: req.download_count24h, avatar: req.user_avatar, username: req.session.username});
})

app.get("/download/:id", isLoggedIn, findAsset, checkLog, (req, res) => {
  const filePath = "https://ryryfn.com/fetch.php?file=" + req.asset.file;
    res.redirect(filePath);
    var dataPath2 = path.join(__dirname, "/public/download_log.json");
    var rawData2 = fs.readFileSync(dataPath2, "utf8");
    var downloads = JSON.parse(rawData2);
    var download = {
        "download_username": req.session.username,
        "upload_username": req.asset.upload_user,
        "asset_id": req.params.id,
        "time": Date.now(),
        "ip": req.headers['x-forwarded-for'] || req.socket.remoteAddress
    };
    downloads.push(download);
    if(!req.already_downloaded) {
      fs.writeFileSync(dataPath2, JSON.stringify(downloads, null, 2));
    }
});

app.get("/download-data", (req, res) => {
  if(req.session.username == "admin") {
    const zipPath = path.join(__dirname, "data_bundle.zip");
  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    res.download(zipPath, "site-data.zip", (err) => {
      if (err) {
        console.error("Download error:", err);
      } else {
        fs.unlinkSync(zipPath); // Clean up zip after download
      }
    });
  });

  archive.on("error", (err) => {
    throw err;
  });

  archive.pipe(output);

  // Add files
  archive.file(path.join(__dirname, "/public/requests.json"), { name: "requests.json" });
  archive.file(path.join(__dirname, "users.json"), { name: "users.json" });
  archive.file(path.join(__dirname, "/public/uploads.json"), { name: "uploads.json" });
  archive.file(path.join(__dirname, "/public/download_log.json"), { name: "download_log.json" });
  archive.file(path.join(__dirname, "/public/avatars.json"), { name: "avatars.json" });

  archive.finalize();
  }
})

app.get("/session-debug", (req, res) => {
  res.json(req.session);
});

app.use((req, res) => {
    res.status(404).render("404");
});

app.listen(PORT, () => {
    console.log("server is running on port 3000")
})

