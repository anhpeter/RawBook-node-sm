const Helper = require(`${__path.helper}/helper`);
const Firebase = require(`${__path.libs}/firebase`);
const request = require('request');
const cheerio = require('cheerio')

module.exports = {
    site: 'https://tiki.vn',

    // data - { url, category }
    run: function (data, doneCallback) {
        if (data.url) {
            this.rawBooksByCategoryLink(data, (err, jsonData) => {
                if (!err) {
                    let result = (jsonData) ? JSON.stringify(jsonData) : null;
                    if (Helper.isFn(doneCallback)) doneCallback(null, result);
                } if (Helper.isFn(doneCallback)) doneCallback(err, null);
            })
        } else if (Helper.isFn(doneCallback)) doneCallback('invalid', null);
    },

    // category
    rawBooksByCategoryLink: function (data, doneCallback) {
        this.getBookLinks(data, (err, bookLinks) => {
            if (!err) {
                if (bookLinks.length > 0) {
                    let bookLinksForUse = bookLinks.slice(0, 50);
                    let promises = [];
                    let i = 1;
                    for (let link of bookLinksForUse) {
                        link = this.site + link;
                        promises.push(
                            new Promise((resolve) => {
                                this.rawBook({ ...data, bookLink: link }, (err, bookJson) => {
                                    let percent = ((i / bookLinksForUse.length) * 100).toFixed(2);
                                    console.log(percent);
                                    resolve(bookJson);
                                    i++;
                                })
                            })
                        )
                    }
                    Promise.all(promises)
                        .then((books) => {
                            if (Helper.isFn(doneCallback)) doneCallback(err, books);
                        })
                }
            } else if (Helper.isFn(doneCallback)) doneCallback(error, null);
        })
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
                let bookData = $this.getBookData($, data);
                if (Helper.isFn(doneCallback)) doneCallback(null, bookData);
            } else if (Helper.isFn(doneCallback)) doneCallback(error, null);
        });
    },

    getBookData: function ($, data) {
        let bookData = {};
        let prefix = 'body>div#__next main';
        let slugMatch = data.bookLink.match(/(?<=tiki\.vn\/)[\w\-]+(?=\-p\d)/);
        if (slugMatch) {
            bookData = {
                slug: slugMatch[0],
                category: data.category,
                title: $(`${prefix} div.header>h1.title`).text(),
                author: $(`${prefix} div.header>div.brand>h6:first-child>a`).text(),
                description: $(`${prefix} div.ProductDescription__Wrapper-fuzaih-0 div.left div.content div.ToggleContent__View-sc-1hm81e2-0.eIzUuC > div`).html(),
                price: $(`${prefix} div.body>div.summary>div.left>meta[itemprop="price"]`).attr('content'),
                saleOff: $(`${prefix} div.body>div.summary>div.left p.original-price.first-child > span`).text().replace('%', '').trim(),
                status: 'inactive',
                special: 'no',
                created: {
                    time: Date.now(),
                    user: { username: 'admin' },
                },

            }
        }else{
            console.log('invalid', data.bookLink);
        }
        return bookData;
    }
}