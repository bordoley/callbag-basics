var Benchmark = require('benchmark');
var callbag = require('../index');
var xs = require('xstream').default;
var most = require('most');
var rx = require('rx');
var rxjs = require('rxjs');
var kefir = require('kefir');
var bacon = require('baconjs');
var lodash = require('lodash');
var highland = require('highland');

var runners = require('./runners');
var fromArray = require('./callbag-listenable-array');
var kefirFromArray = runners.kefirFromArray;

// Create a stream from an Array of n integers
// filter out odds, map remaining evens by adding 1, then reduce by summing
var n = runners.getIntArg(1000000);
var a = new Array(n);
for(var i = 0; i< a.length; ++i) {
  a[i] = i;
}

var suite = Benchmark.Suite('scan -> reduce ' + n + ' integers');
var options = {
  defer: true,
  onError: function(e) {
    e.currentTarget.failure = e.error;
  }
};

suite
  .add('cb-basics', function(deferred) {
    runners.runCallbag(deferred,
      callbag.pipe(
  fromArray(a),
  callbag.scan(sum, 0),
  callbag.scan(passthrough, 0),
      )
    );
  }, options)
  .add('xstream', function(deferred) {
    runners.runXStream(deferred, xs.fromArray(a).fold(sum, 0).fold(passthrough, 0).last());
  }, options)
  .add('most', function(deferred) {
    runners.runMost(deferred, most.from(a).scan(sum, 0).reduce(passthrough, 0));
  }, options)
  .add("reactive-js", function(deferred) {
    const { fromArray, pipe, scan } = require("@reactive-js/observable");
    const observable = pipe(fromArray(a), scan(sum, 0), scan(passthrough, 0));
    runners.runReactiveJS(deferred, observable);
  }, options)
  .add('rx 5', function(deferred) {
    runners.runRx5(deferred, rxjs.Observable.from(a).scan(sum, 0).reduce(passthrough, 0));
  }, options)
  .add('rx 4', function(deferred) {
    runners.runRx(deferred, rx.Observable.fromArray(a).scan(sum, 0).reduce(passthrough, 0));
  }, options)
  .add('kefir', function(deferred) {
    runners.runKefir(deferred, kefirFromArray(a).scan(sum, 0).scan(passthrough, 0).last());
  }, options)
  .add('bacon', function(deferred) {
    runners.runBacon(deferred, bacon.fromArray(a).scan(0, sum).reduce(0, passthrough));
  }, options)
  .add('highland', function(deferred) {
    runners.runHighland(deferred, highland(a).scan(0, sum).reduce(0, passthrough));
  }, options)
  .add('lodash', function() {
    return lodashScan(sum, 0, a).reduce(passthrough, 0);
  })
  .add('Array', function() {
    return arrayScan(sum, 0, a).reduce(passthrough, 0);
  })

runners.runSuite(suite);

function arrayScan(f, initial, a) {
  var result = initial;
  return a.map(function(x) {
    return result = f(result, x);
  });
}

function lodashScan(f, initial, a) {
  var result = initial;
  return lodash(a).map(function(x) {
    return result = f(result, x);
  });
}

function sum(x, y) {
  return x + y;
}

function passthrough(z, x) {
  return x;
}
