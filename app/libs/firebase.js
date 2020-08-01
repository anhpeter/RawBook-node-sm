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
    pushDefaultData: function (data, doneCallback) {
        if (data) {
            this.deleteList(() => {
                this.ref.push(data).then(() => {
                    if (Helper.isFn(doneCallback)) doneCallback();
                })
            })
        }
    },

    deleteList: function (doneCallback) {
        this.ref.remove().then(() => {
            if (Helper.isFn(doneCallback)) doneCallback();
        })
    },

    get ref() {
        let database = app.database();
        return ref = database.ref('raw-books');
    }
}