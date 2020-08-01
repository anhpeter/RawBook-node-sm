module.exports = {
    get root() { return __dirname.replace(/(\/|\\)[\w\-]+$/, '') },
    get routes() { return `${this.root}/routes` },
    get public() { return `${this.root}/public` },
    get public_index() { return `${this.root}/index` },

    // app
    get app() { return `${this.root}/app` },
    get config() { return `${this.app}/config` },
    get helper() { return `${this.app}/helper` },
    get libs() { return `${this.app}/libs` },
    get models() { return `${this.app}/models` },
    get schemas() { return `${this.app}/schemas` },
    get validates() { return `${this.app}/validates` },
    get views() { return `${this.app}/views` },
    get views_index() { return `${this.views}/index` },
}