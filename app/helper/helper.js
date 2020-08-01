const format = require('string-format')

module.exports = {
    get strFormat() { return format; },

    isFn(fn){
        if (fn != null && typeof fn == 'function') return true;
        return false;
    }
}