const Helper = require(`${__path.helper}/helper`);

var firebase = require('firebase/app');
require('firebase/storage');
require('firebase/database');
var app = firebase.initializeApp({
    apiKey: "AIzaSyCr-JyLcPLAsWMtVbbNT0c5jYyqMfL9CwA",
    authDomain: "book-store-25333.firebaseapp.com",
    databaseURL: "https://book-store-25333.firebaseio.com",
    projectId: "book-store-25333",
    storageBucket: "book-store-25333.appspot.com",
    messagingSenderId: "156105229112",
    appId: "1:156105229112:web:3b064e0cc6d0b34eb977cd"
});
module.exports = {
    getItem: function (params, options) {
        this.getRef(params.collection)
            .orderByChild(params.fieldPath)
            .equalTo(params.value)
            .once('value', function (snapshot) {
                let items = [];
                snapshot.forEach(function (childSnapshot) {
                    let item = {
                        key: childSnapshot.key,
                        ...childSnapshot.val(),
                    }
                    items.push(item);
                })
                if (Helper.isFn(options.doneCallback)) options.doneCallback(null, items[0]);
            });
    },

    saveItem: function (params, options) {
        this.getRef(params.collection).push(params.item)
            .then(() => {
                if (Helper.isFn(options.doneCallback)) options.doneCallback();
            })
    },

    getRef(collection) {
        let database = app.database();
        return ref = database.ref(collection);
    }
}