#!/usr/bin/env node

let [ a, b, ...args] = process.argv;
let arg = args[0];

if (arg == 'test') {
    require('../test/test');
} else {
    const shell = require('./shell');
    shell.run(...args);
}