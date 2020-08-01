var express = require('express');
var router = express.Router();

let controller = 'index';
let viewFolder = `index/pages/${controller}`;
const RawData = require(`${__path.libs}/raw-data`);
const Firebase = require(`${__path.libs}/firebase`);

// INDEX
router.get('/', async function (req, res, next) {
    res.render(`${viewFolder}/index`, { title: 'Express' });
});

// SOLVE URL
router.post('/', async function (req, res, next) {
    let fn = (jsonData = null) => {
        res.render(`${viewFolder}/index`, { title: 'Express', jsonData});
    }
    if (req.body.url) {
        let categoryLink = req.body.url.match(/(?<=tiki\.vn\/)[\w\-]+(?=\/)/);
        let data = {
            url: req.body.url,
            category: categoryLink[0].trim(),
        }
        RawData.run(data, (err, data) => {
            if (err) res.send(err)
            else fn(data);
        });
    } else fn(null);
});

module.exports = router;
