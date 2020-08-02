const Helper = require(`${__path.helper}/helper`);
const Firebase = require(`${__path.libs}/firebase`);
const request = require('request');
const cheerio = require('cheerio')
const i2b = require("imageurl-base64");

module.exports = {
    site: 'https://tiki.vn',
    timeout: 5000,
    rawQty: 5,

    // data - { url, category }
    run: function (data, doneCallback) {
        if (data.url.trim() != '' && data.qty > 0) {
            this.rawQty = data.qty;
            // check category
            Firebase.getItem({
                collection: 'categories',
                fieldPath: 'slug',
                value: data.category,
            }, {
                doneCallback: (err, item) => {
                    if (item) {
                        fn(item);
                    } else {
                        // category not exists
                        this.createCategory(data, (err, item) => {
                            if (!err) {
                                fn(item);
                            } else if (Helper.isFn(doneCallback)) {
                                this.print(err);
                                doneCallback(null, nul);
                            }
                        });
                    }
                }
            })

            // raw
            let fn = (category) => {
                data.category = {
                    slug: category.slug,
                    name: category.name,
                 }
                this.rawBooksByCategoryLink(data, (err, jsonData) => {
                    if (!err) {
                        let result = (jsonData) ? JSON.stringify(jsonData) : null;
                        if (Helper.isFn(doneCallback)) doneCallback(null, result);
                    } if (Helper.isFn(doneCallback)) doneCallback(err, null);
                })
            }
        } else if (Helper.isFn(doneCallback)) doneCallback('invalid', null);
    },

    // category
    createCategory: function (data, doneCallback) {
        this.getCategoryName(data.url, (err, name) => {
            if (Helper.isFn(doneCallback)) {
                if (!err) {
                    let item = {
                        name: {
                            value: name,
                            forSearch: name.toLowerCase(),
                        },
                        slug: data.category,
                        status: 'inactive',
                        created: {
                            time: Date.now(),
                            user: { username: 'admin' },
                        }
                    }
                    Firebase.saveItem({
                        item,
                        collection: 'categories',
                    }, {
                        doneCallback: () => {
                            doneCallback(null, item);
                        }
                    })
                } else doneCallback(err);
            }
        });
    },

    getCategoryName: function (url, doneCallback) {
        request(url, function (error, response, body) {
            const $ = cheerio.load(body);
            let name = $('body>div.wrap div.product-listing>div.product-box>div.filter-list-box>h1').text() || '';
            name = name.replace(':', '').trim();
            if (Helper.isFn(doneCallback)) {
                if (name.trim() != '') doneCallback(null, name);
                else doneCallback('Category name not found', null);
            }
        });
    },

    rawBooksByCategoryLink: function (data, doneCallback) {
        this.getBookLinks(data, (err, bookLinks) => {
            if (!err) {
                if (bookLinks.length > 0) {
                    let bookLinksForUse = bookLinks.slice(0, this.rawQty);
                    let promises = this.getBookPromises({ ...data, bookLinksForUse });
                    Promise.all(promises)
                        .then((items) => {
                            items = items.filter((item) => {
                                if (item) return true;
                            })
                            if (Helper.isFn(doneCallback)) doneCallback(err, items);
                        })
                }
            } else if (Helper.isFn(doneCallback)) doneCallback(err, null);
        })
    },

    getBookPromises: function (data) {
        let promises = [];
        let i = 1;
        for (let link of data.bookLinksForUse) {
            link = this.site + link;
            promises.push(
                new Promise((resolve) => {
                    let timeout = setTimeout(() => {
                        this.print('raw item timeout');
                        resolve(null);
                    }, this.timeout);

                    this.rawBook({ ...data, bookLink: link }, (err, item) => {
                        clearTimeout(timeout);
                        this.showProcess(i, data.bookLinksForUse.length);
                        resolve(item);
                        i++;
                    })
                })
            )
        }
        return promises;
    },

    showProcess: function (i, total) {
        let percent = ((i / total) * 100).toFixed(2);
        this.print(`${percent}%`);
    },

    getBookLinks: function (data, doneCallback) {
        request(data.url, function (error, response, body) {
            if (!error) {
                const $ = cheerio.load(body)
                let productItems = $('body>div.wrap div.product-listing>div.product-box>div.product-box-list .product-item');
                let bookLinkArr = [];
                productItems.each(function (i, elm) {
                    let link = $(elm).children('a').attr('href');
                    if (link) bookLinkArr.push(link);
                });
                if (Helper.isFn(doneCallback)) doneCallback(null, bookLinkArr);
            } else if (Helper.isFn(doneCallback)) doneCallback(error, null);
        });
    },

    // book
    rawBook: function (data, doneCallback) {
        let $this = this;
        request(data.bookLink, function (error, response, body) {
            if (!error) {
                const $ = cheerio.load(body)
                $this.getBookData($, data, (err, item) => {
                    if (Helper.isFn(doneCallback)) doneCallback(err, item);
                });
            } else if (Helper.isFn(doneCallback)) doneCallback(error, null);
        });
    },

    getBookData: function ($, data, doneCallback) {
        let prefix = 'body>div#__next main';
        //img
        let thumbLink = $(`${prefix} div.Container-itwfbd-0.jFkAwY > div.indexstyle__Wrapper-qd1z2k-0.gQLVSm > div.indexstyle__ProductImages-qd1z2k-1.kQvKqX > div.group-images > div.thumbnail img`).attr('src');
        i2b(thumbLink, (err, result) => {
            if (err && Helper.isFn(doneCallback)) doneCallback('failed to convert image url to base64', null);
            let bookData = null;
            let slugMatch = null;
            slugMatch = data.bookLink.match(/(?<=tiki\.vn\/)[\w\-]+(?=\-p\d)/);
            if (slugMatch && thumbLink) {
                let title = $(`${prefix} div.header>h1.title`).text();
                let author = $(`${prefix} div.header>div.brand>h6:first-child>a`).text();
                let description = $(`${prefix} div.ProductDescription__Wrapper-fuzaih-0 div.left div.content div.ToggleContent__View-sc-1hm81e2-0.eIzUuC > div`).html();
                bookData = {
                    thumb: result.base64,
                    slug: slugMatch[0],
                    category: data.category,
                    title: { value: title, forSearch: title.toLowerCase(), },
                    author: { value: author, forSearch: author.toLowerCase(), },
                    description: { value: description, forSearch: description },
                    price: $(`${prefix} div.body>div.summary>div.left>meta[itemprop="price"]`).attr('content'),
                    saleOff: $(`${prefix} div.body>div.summary>div.left p.original-price.first-child > span`).text().replace('%', '').trim(),
                    status: 'inactive',
                    special: 'no',
                    created: {
                        time: Date.now(),
                        user: { username: 'admin' },
                    },
                }
                if (Helper.isFn(doneCallback)) doneCallback(null, bookData);
            } else {
                //this.print('invalid link: ', data.bookLink);
                if (Helper.isFn(doneCallback)) doneCallback('item is invalid', null);
            }
        });
    },

    // supported functions
    print: function (...args) {
        console.log(...args);
    }
}