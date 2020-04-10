const assert = require('assert');
const { echo } = require('ternal');

module.exports = function(data) {
    assert.equal(data, 'Davis');
    echo ({color:'green', format:'bold'}, 'Executable Test 3 Successful');
}