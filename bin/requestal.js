#!/usr/bin/env node

const Test = require('../test/test');

let [ a, b, ...args] = process.argv;

let arg = args[0];

if (arg == 'demo') {
    Test.test();
} else if (arg == 'delete') {
    Test.delete();
} else if (arg == 'test') {
    Test.test();
    Test.delete();
}