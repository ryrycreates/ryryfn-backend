const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const path = require('path');

router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

router.route("/add").get((req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "add.html"));
});

router.post('/submit-asset', async (req, res) => {
  try {
    // Destructure incoming form data
    let {
      name,
      size,
      downloadUrl,
      previewImageUrl,
      type,
      tags,
      childAssets,
      parentAssets,
      hasDownloadUrlOnRyRyFn,
      hasExternalDownloadUrl,
      isAnExactCopyFromGameFiles,
      isRecreated,
      isRemixed,
      UEFNValidates,
      isInCreativeLegacy,
      fnSeasonIntroduced,
    } = req.body;

    // Parse JSON fields (tags, childAssets, parentAssets)
    tags = tags ? JSON.parse(tags) : [];
    childAssets = childAssets ? JSON.parse(childAssets) : [];
    parentAssets = parentAssets ? JSON.parse(parentAssets) : [];

    // Convert boolean fields from strings ("true"/"false") to actual booleans
    hasDownloadUrlOnRyRyFn = hasDownloadUrlOnRyRyFn === 'true';
    hasExternalDownloadUrl = hasExternalDownloadUrl === 'true';
    isAnExactCopyFromGameFiles = isAnExactCopyFromGameFiles === 'true';
    isRecreated = isRecreated === 'true';
    isRemixed = isRemixed === 'true';
    UEFNValidates = UEFNValidates === 'true';
    isInCreativeLegacy = isInCreativeLegacy === 'true';

    // Convert fnSeasonIntroduced to integer or null
    fnSeasonIntroduced = fnSeasonIntroduced ? parseInt(fnSeasonIntroduced, 10) : null;

    // Insert new asset
    const newAsset = await prisma.asset.create({
      data: {
        name,
        size,
        downloadUrl,
        previewImageUrl: previewImageUrl || null,
        type,
        tags,
        childAssets,
        parentAssets,
        hasDownloadUrlOnRyRyFn,
        hasExternalDownloadUrl,
        isAnExactCopyFromGameFiles,
        isRecreated,
        isRemixed,
        UEFNValidates,
        isInCreativeLegacy,
        fnSeasonIntroduced,
        // createdAt will auto-set by Prisma default
      }
    });

    res.render('json', { assetJson: JSON.stringify(newAsset, null, 2) });
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

router.get('/assets', async (req, res) => {
  try {
    const allAssets = await prisma.asset.findMany();
    res.render('json', { assetJson: JSON.stringify(allAssets, null, 2) });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to load assets');
  }
});

// routes/assets.js
router.get('/assets/filter', async (req, res) => {
  const allowedFields = {
    hasDownloadUrlOnRyRyFn: 'boolean',
    hasExternalDownloadUrl: 'boolean',
    fnSeasonIntroduced: 'number',
    isAnExactCopyFromGameFiles: 'boolean',
    isRecreated: 'boolean',
    isRemixed: 'boolean',
    UEFNValidates: 'boolean',
    isInCreativeLegacy: 'boolean',
    type: 'string'
  };

  const queryKeys = Object.keys(req.query);
  const invalidKeys = queryKeys.filter(key => !(key in allowedFields));

  if (invalidKeys.length) {
    return res.status(400).json({
      error: `Invalid filter field(s): ${invalidKeys.join(', ')}`,
      allowedFields: Object.keys(allowedFields)
    });
  }

  // Build where clause for Prisma
  const where = {};
  for (const key of queryKeys) {
    const type = allowedFields[key];
    let value = req.query[key];

    if (type === 'boolean') {
      if (value !== 'true' && value !== 'false') {
        return res.status(400).json({
          error: `Invalid value for '${key}'. Must be 'true' or 'false'`
        });
      }
      value = value === 'true';
    } else if (type === 'number') {
      value = parseInt(value);
      if (isNaN(value)) {
        return res.status(400).json({
          error: `Invalid number for '${key}'`
        });
      }
    }
    where[key] = value;
  }

  const assets = await prisma.asset.findMany({ where });
  res.render('json', { assetJson: JSON.stringify(assets, null, 2) });
});

router.get('/assets/:id', async (req, res) => {
  const id = Number(req.params.id);
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  res.render('json', { assetJson: JSON.stringify(asset, null, 2) });
});

// 2. Search
router.get('/assets/search/:query', async (req, res) => {
  const q = req.params.query.toLowerCase();

  try {
    const allAssets = await prisma.asset.findMany();

    const results = allAssets.filter(asset => {
      const nameMatch = asset.name.toLowerCase().includes(q);
      const tagsMatch =
        Array.isArray(asset.tags) &&
        asset.tags.some(tag =>
          typeof tag === 'string' && tag.toLowerCase().includes(q)
        );

      return nameMatch || tagsMatch;
    });

    res.render('json', { assetJson: JSON.stringify(results, null, 2) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search assets.' });
  }
});

module.exports = router;