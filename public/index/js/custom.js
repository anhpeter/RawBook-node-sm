$(document).ready(function () {
    _interface.run();
    _firebase.setup();
    _main.run();
})

let _main = {
    run: function () {
        this.onSaveBtnClick();
        this.onCopyBtnClick();
    },

    // ON SAVE
    onSaveBtnClick: function () {
        $(_slt.saveBtn).click(() => {
            let itemsJson = $(_slt.itemsJsonParam).text() || '';
            if (itemsJson.trim() != '') {
                // enable progress bar
                $(_slt.progressBarContainer).removeClass('d-none')

                // get firebase upload promises
                let promises = this.getFirebaseUploadPromises(itemsJson);

                // solve after upload
                Promise.all(promises)
                    .then((result) => {
                        // save items to database
                        _firebase.save({ items: result }, {
                            task: 'insert-many',
                            doneCallback: (result) => {
                                // disable save btn
                                $(_slt.saveBtn).attr('disabled', 'disabled');

                                // show items added json
                                $(_slt.resultAreaContainer).removeClass('d-none');
                                $(_slt.resultArea).val(JSON.stringify(result));

                                // show message
                                $(_slt.message).text(`${result.length} items added`);
                                $(_slt.message).removeClass('d-none');
                            }
                        })
                    })
            } else alert('Please raw data first')
            return false;
        })
    },

    getFirebaseUploadPromises: function (itemsJson) {
        let items = JSON.parse(itemsJson);
        let promises = [];
        let i = 1;
        for (let item of items) {
            promises.push(
                new Promise((resolve) => {
                    _firebase.uploadImageByBase64({ basePath: _firebase._collection, upload: { base64: item.thumb } }, {
                        doneCallback: (upload) => {
                            item.thumb = upload._url;
                            let percent = `${((i / items.length) * 100).toFixed(2)}%`;
                            $(_slt.progressBar).css('width', percent);
                            $(_slt.progressBar).text(`Saving ${percent}`);
                            resolve(item);
                            i++;
                        }
                    })
                })
            )
        }
        return promises;
    },

    // COPY
    onCopyBtnClick: function () {
        $(_slt.copyBtn).click(function () {
            const el = document.createElement('textarea');
            el.value = $(_slt.resultArea).val();
            el.setAttribute('readonly', '');
            el.style.position = 'absolute';
            el.style.left = '-9999px';
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        })
    },
}

let _interface = {
    run: function () {
        this.rawBtnDisabled();
        this.confirmCheckboxCheck();
    },

    confirmCheckboxCheck: function () {
        let $this = this;
        $(_slt.confirmedCb).click(function () {
            $this.solveDisabledRawBtn();
        });
    },

    rawBtnDisabled: function () {
        let $this = this;
        $(`${_slt.urlInput}, ${_slt.qtyInput}`).keyup(function () {
            $this.solveDisabledRawBtn();
        })
    },

    solveDisabledRawBtn: function () {
        if (this.isInputValid() && this.isConfirmedCbChecked()) $(_slt.rawBtn).removeAttr('disabled');
        else $(_slt.rawBtn).attr('disabled', 'disabled');
    },

    isConfirmedCbChecked: function () {
        return $(_slt.confirmedCb).prop('checked');
    },

    isInputValid: function () {
        let flag = false;
        let url = $(_slt.urlInput).val() || '';
        let qty = $(_slt.qtyInput).val() || '';
        qty = Number.parseInt(qty);
        qty = Number.parseInt(qty);
        if (url.trim() != '' && !Number.isNaN(qty)) {
            let urlMatch = url.match(/(?<=tiki\.vn\/)[\w\-]+(?=\/)/);
            if (urlMatch) if (urlMatch[0].trim() != '' && qty > 0) flag = true;
        }
        return flag;
    },
}

let _firebase = {
    _collection: 'books',
    setup: function () {
        var firebaseConfig = {
            apiKey: "AIzaSyCr-JyLcPLAsWMtVbbNT0c5jYyqMfL9CwA",
            authDomain: "book-store-25333.firebaseapp.com",
            databaseURL: "https://book-store-25333.firebaseio.com",
            projectId: "book-store-25333",
            storageBucket: "book-store-25333.appspot.com",
            messagingSenderId: "156105229112",
            appId: "1:156105229112:web:3b064e0cc6d0b34eb977cd"
        };
        firebase.initializeApp(firebaseConfig);

    },

    save: function (params, options) {
        switch (options.task) {
            case 'insert-many':
                this.insertMany(params, options);
                break;
        }
    },

    insertMany: function (params, options) {
        if (params.items.length > 0) {
            let promises = [];
            for (let item of params.items) {
                promises.push(
                    new Promise((resolve) => {
                        this.ref.push(item)
                            .then(() => { resolve(item) });
                    })
                )
            }
            Promise.all(promises)
                .then((result) => {
                    if (_helper.isFn(options.doneCallback)) options.doneCallback(result);
                })
        }
    },

    uploadImageByBase64: function (params, options) {
        let filePath = `${params.basePath}/${Date.now()}-${_helper.getAutoName(5)}`;
        let fileRef = firebase.storage().ref(filePath);
        let task = fileRef.putString(params.upload.base64, 'base64', { contentType: 'image/jpg' });
        task.on('state_changed', (snapshot) => {
            // In Progress 
            if (options.progressCallback) {
                let percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                params.upload._progress = percent;
                options.progressCallback(params.upload);
            }
        }, (error) => {
            // Error
            console.log('upload error');
            console.log(error);

        }, () => {
            // Done
            task.snapshot.ref.getDownloadURL().then(function (downloadURL) {
                params.upload._url = downloadURL;
                options.doneCallback(params.upload);
            });
        })

    },

    get ref() {
        let database = firebase.database();
        return database.ref(this._collection);
    }
}

let _helper = {
    isFn(fn) {
        if (fn != null && typeof fn == 'function') return true;
        return false;
    },

    getAutoName: function (len) {
        let char = this.genCharArray('a', 'z');
        let number = this.genCharArray('0', '9');
        let random = this.shuffleArray([...char, ...number]);
        return random.slice(0, len).join('');
    },

    genCharArray: function (charA, charZ) {
        var a = [], i = charA.charCodeAt(0), j = charZ.charCodeAt(0);
        for (; i <= j; ++i) {
            a.push(String.fromCharCode(i));
        }
        return a;
    },

    shuffleArray: function (array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }
}

let _slt = {
    message: '#message',
    progressBar: '#progress-bar',
    progressBarContainer: '#progress-bar-container',

    // buttons
    saveBtn: '#save-btn',
    rawBtn: '#raw-btn',
    copyBtn: '#copy-btn',

    // areas
    resultAreaContainer: '#result-area-container',
    resultArea: '#result-area',

    // inputs
    urlInput: 'input#url-input',
    qtyInput: 'input#qty-input',

    // checkbox
    confirmedCb: 'input#confirmed-cb',

    // params
    itemsJsonParam: 'div#params > div[data-key="items-json"]',
    urlParam: 'div#params > div[data-key="url"]',
    qtyParam: 'div#params > div[data-key="qty"]',
}
