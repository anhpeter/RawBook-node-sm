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
    let data = {
        url: req.body.url,
        category: 'truyen-ngan-tan-van-tap-van',
    }
    RawData.run(data, (err, data) => {
        if (err) res.send(err)
        else {
            res.render(`${viewFolder}/index`, { title: 'Express', jsonData: data });
        }
    });
});

module.exports = router;
