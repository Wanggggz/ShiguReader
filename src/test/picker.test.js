const assert = require('assert');
const picker = require("../human-name-picker");

describe('name picker', () => {
    let s1;
    let result;
    it('normal', ()=> {

        s1 = null;
        result = picker.parse(s1);
        assert.ok(result === null);

        s1 = "[LCBD-00601] Riho Iida 飯田里穂 – りほの島、楽園の光 Blu-ray";
        result = parser.parse(s1);
        console.log(result)
        assert.ok(result === null);
    });

});
