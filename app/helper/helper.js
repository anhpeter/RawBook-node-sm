const format = require('string-format')

module.exports = {
    get strFormat() { return format; },

    isFn(fn){
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