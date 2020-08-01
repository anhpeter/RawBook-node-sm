var express = require('express');
var router = express.Router();

let controller = 'index';
let viewFolder = `index/pages/${controller}`;
const firebase = require(`${__path.libs}/firebase`);

// INDEX
router.get('/', async function (req, res, next) {
    //let data = await userModel.model.find({});
    //console.log(data);
    res.render(`${viewFolder}/index`, { title: 'Express' });
});

// SOLVE URL
router.post('/', async function (req, res, next) {
    console.log(firebase.test());
    res.render(`${viewFolder}/index`, { title: 'Express' });
});

module.exports = router;
