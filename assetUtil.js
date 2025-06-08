const path = require("path");
const fs = require("fs");

var assets;

reloadData();
function reloadData() {
dataPath2 = path.join(__dirname, "/public/asset_data.json");
rawData2 = fs.readFileSync(dataPath2, "utf8");
assets = JSON.parse(rawData2);
}


function findAsset(req, res, next) {
  reloadData();
    for(var i=0; i<assets.length; i++) {
        if(assets[i].id == req.params.id) {
            req.asset = assets[i];
            return next();
        }
    }
    return res.render("not_found");
}

function processResult(req, res, next) {
    if(!req.asset) {
        req.result = "preview_error"
    } else if(req.asset.prev_type == 1 || !req.asset.prev_type) {
        req.result = "preview"
    } else if(req.asset.prev_type == 2) {
        req.result = "preview02"
    } else if(req.asset.prev_type == 3) {
        req.result = "preview03"
    }
    next();
}

function createHTMLAssetList(req, res, next) {
  reloadData();
  var HTML = ``;
    var asset_list = req.asset_list;
     for(var i=0; i<asset_list.length; i++) {
        for(var k=0; k<assets.length; k++) {
          if(assets[k].id == asset_list[i]) {
            HTML += `arrow1a class=asset-card target=_blank href=../preview/${asset_list[i]}arrow2arrow1div class=rank-badgearrow2arrow1/divarrow2
                        arrow1img class=asset-img src=https://ryryfn.com/${assets[k].img}arrow2
                        arrow1span class=asset-name style=margin-bottom:10pxarrow2${assets[k].name}arrow1/spanarrow2
                        arrow1span class=asset-categoryarrow2arrow1strongarrow1Category:arrow1/strongarrow2 ${assets[k].category}arrow1/spanarrow2
                        arrow1span class=asset-categoryarrow2arrow1strongarrow2Credits:arrow1/strongarrow2 ${assets[k].credits}arrow1/spanarrow2
                      arrow1/aarrow2`
          }
        }
    }
    req.generatedHTML = HTML;
    next();
}

// ========== Middleware: generateId ==========
function generateId(req, res, next) {
  req.generateId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  next();
}


function uploadAssetMetadata(req, res, next) {
  const dataPath = path.join(__dirname, "/public/uploads.json");
  const dataPath2 = path.join(__dirname, "/public/activity_feed.json");

  try {

    const id = req.generateId; // Properly generate the ID

    // Parse array fields
    const season = Array.isArray(req.body.season)
      ? req.body.season.map(s => s.trim())
      : [req.body.season?.trim()].filter(Boolean);

    const keywords = Array.isArray(req.body.keywords)
      ? req.body.keywords.map(k => k.trim())
      : [req.body.keywords?.trim()].filter(Boolean);

    const gallery = Array.isArray(req.body.gallery)
      ? req.body.gallery.map(g => g.trim())
      : [req.body.gallery?.trim()].filter(Boolean);

    const meta = {
      upload_user: req.session.username,
      id,
      name: req.body.name,
      season,
      category: req.body.category,
      credits: req.body.credits,
      keywords,
      file: req.body.file,
      img: req.body.img,
      gallery,
      premium: req.body.premium,
      uploadedAt: new Date().toISOString(),
      status: "pending",
    };

    // Load existing asset data
    let data = [];
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, "utf8");
      data = JSON.parse(raw);
    }

    // Load existing activity feed
    let data2 = [];
    if (fs.existsSync(dataPath2)) {
      const raw2 = fs.readFileSync(dataPath2, "utf8");
      data2 = JSON.parse(raw2);
    }

    const activity = {
      activity: [req.session.username, "uploaded", meta.name, meta.id, new Date().toISOString()]
    };

    data.push(meta);
    data2.push(activity);

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    fs.writeFileSync(dataPath2, JSON.stringify(data2, null, 2));

    console.log(`✔ Metadata saved for asset ID: ${id}`);
    next();

  } catch (err) {
    console.error("❌ Error saving metadata:", err);
    return res.status(500).json({ error: "Failed to save asset metadata" });
  }

}

function getActivityFeed(req, res, next) {
  const dataPath2 = path.join(__dirname, "/public/activity_feed.json");
  let data2 = [];
  const raw2 = fs.readFileSync(dataPath2, "utf8");
  data2 = JSON.parse(raw2);

  req.activityFeed = data2;
  next();
}

module.exports = {
    findAsset,
    processResult,
    uploadAssetMetadata,
    generateId,
    createHTMLAssetList,
    getActivityFeed
}