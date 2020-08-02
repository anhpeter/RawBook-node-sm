const Helper = require(`${__path.helper}/helper`);
const Firebase = require(`${__path.libs}/firebase`);
const request = require('request');
const cheerio = require('cheerio')
const i2b = require("imageurl-base64");

module.exports = {
    site: 'https://tiki.vn',
    rawQty: 5,

    // data - { url, qty, category }
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
                    if (item) this.raw({ ...data, dbCategory: item }, doneCallback);
                    else // category not exists
                        this.createCategory(data, (err, item) => {
                            this.print('\nnew category created', item);
                            if (!err) this.raw({ ...data, dbCategory: item }, doneCallback);
                            else if (Helper.isFn(doneCallback)) {
                                this.print(err);
                                doneCallback(null, nul);
                            }
                        });
                }
            })
        } else if (Helper.isFn(doneCallback)) doneCallback('invalid', null);
    },

    raw: function (data, doneCallback) {
        data.category = {
            slug: data.dbCategory.slug,
            name: data.dbCategory.name,
        }
        this.rawBooksByCategoryLink(data, (err, jsonData) => {
            if (Helper.isFn(doneCallback)) {
                if (!err) {
                    let result = (jsonData) ? JSON.stringify(jsonData) : null;
                    doneCallback(null, result);
                } else doneCallback(err, jsonData);
            }
        })
    },

    // category
    createCategory: function (data, doneCallback) {
        this.getCategoryName(data.url, (err, name) => {
            if (Helper.isFn(doneCallback)) {
                if (!err) {
                    let item = {
                        name: { value: name, forSearch: name.toLowerCase(), },
                        slug: data.category,
                        status: 'inactive',
                        created: { time: Date.now(), user: { username: 'admin' }, }
                    }
                    Firebase.saveItem({
                        item, collection: 'categories',
                    }, { doneCallback: () => { doneCallback(null, item); } })
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
                    let promises = this.getBookPromises({ ...data, bookLinks });
                    Promise.all(promises)
                        .then((items) => {
                            items = items.filter((item) => {
                                if (item != null) return true;
                                return false;
                            })
                            this.print(`${items.length} were raw!`)
                            if (Helper.isFn(doneCallback)) doneCallback(err, items);
                        })
                }
            } else if (Helper.isFn(doneCallback)) doneCallback(err, bookLinks);
        })
    },

    getBookPromises: function (data) {
        let promises = [];
        let i = 1;
        for (let link of data.bookLinks) {
            link = this.site + link;
            promises.push(
                new Promise((resolve) => {
                    this.rawBook({ ...data, bookLink: link }, (err, item) => {
                        this.showProcess(i, data.bookLinks.length);
                        resolve(item);
                        i++;
                    })
                })
            )
        }
        return promises;
    },

    getBookLinks: function (data, doneCallback) {
        let totalPage = (this.rawQty <= 48) ? 1 : Math.ceil(this.rawQty / 48);

        // category links
        let categoryLinks = [data.url];
        if (totalPage > 1)
            for (let i = 2; i <= totalPage; i++) {
                categoryLinks.push(`${data.url}?page=${i}`);
            }

        let promises = [];
        for (let link of categoryLinks) {
            promises.push(
                new Promise((resolve) => {
                    this.rawBookLinks({ url: link }, (err, links) => {
                        if (!err) resolve(links);
                        else resolve([]);
                    })
                })
            )
        }
        Promise.all(promises)
            .then((result) => {
                let links = [];
                for (let item of result) { links.push(...item); }
                let linksForUse = links.slice(0, this.rawQty);
                this.print(`total links were raw: ${links.length}`)
                this.print(`total links for use: ${linksForUse.length}`)
                if (Helper.isFn(doneCallback)) doneCallback(null, linksForUse);
            })
    },

    rawBookLinks: function (data, doneCallback) {
        request(data.url, function (error, response, body) {
            if (!error) {
                const $ = cheerio.load(body)
                let productItems = $('body>div.wrap div.product-listing>div.product-box>div.product-box-list .product-item');
                let bookLinkArr = [];
                productItems.each(function (i, elm) {
                    let link = $(elm).children('a').attr('href') || '';
                    if (link.match(/2hi=0$/)) bookLinkArr.push(link);
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
        let thumbLink = $(`${prefix} div.Container-itwfbd-0.jFkAwY > div.indexstyle__Wrapper-qd1z2k-0.gQLVSm > div.indexstyle__ProductImages-qd1z2k-1.kQvKqX > div.group-images > div.thumbnail img`).attr('src');
        i2b(thumbLink, (err, result) => {
            if (err && Helper.isFn(doneCallback)) doneCallback('failed to convert image url to base64', null);
            let slugMatch = null;
            slugMatch = data.bookLink.match(/(?<=tiki\.vn\/)[\w\-]+(?=\-p\d)/);
            if (slugMatch && thumbLink) {
                let bookData = this.getBook({
                    $, prefix,
                    slug: slugMatch[0],
                    base64: result.base64,
                    category: data.category,
                })
                if (Helper.isFn(doneCallback)) doneCallback(null, bookData);
            } else if (Helper.isFn(doneCallback)) doneCallback('item is invalid', null);
        });
    },

    // data - { base64, category}
    getBook: function (data) {
        let $ = data.$;
        let title = $(`${data.prefix} div.header>h1.title`).text();
        let author = $(`${data.prefix} div.header>div.brand>h6:first-child>a`).text();
        let description = $(`${data.prefix} div.ProductDescription__Wrapper-fuzaih-0 div.left div.content div.ToggleContent__View-sc-1hm81e2-0.eIzUuC > div`).html();
        let price = $(`${data.prefix} div.body>div.summary>div.left>meta[itemprop="price"]`).attr('content');
        let saleOff = $(`${data.prefix} div.body>div.summary>div.left p.original-price.first-child > span`).text().replace('%', '').trim();
        bookData = {
            slug: data.slug,
            category: data.category,
            title: { value: title, forSearch: title.toLowerCase(), },
            author: { value: author, forSearch: author.toLowerCase(), },
            description: { value: description, forSearch: description },
            status: 'inactive',
            special: 'no',
            saleOff,
            price,
            thumb: data.base64,
            created: {
                time: Date.now(),
                user: { username: 'admin' },
            },
        }
        return bookData;
    },

    // supported functions
    showProcess: function (i, total) {
        let percent = Math.round((i / total) * 100);
        this.print(`${percent}%`);
    },

    print: function (...args) {
        console.log(...args);
    }
}