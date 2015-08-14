/**
 * Created by Samuel Gratzl on 14.08.2015.
 */


///<reference path='../typings/tsd.d.ts' />
import d3 = require('d3');

import provider = require('./provider');
import model = require('./model');
import utils = require('./utils');
import renderer = require('./renderer');

window.onload = function () {
  var arr = [
    {a: 10, b: 20, c: 30, d: 'Row1', l: {alt: 'Google', href: 'https://google.com'}},
    {a: 5, b: 14, c: 2, d: 'Row2', l: {alt: 'ORF', href: 'https://orf.at'}},
    {a: 2, b: 7, c: 100, d: 'Row3', l: {alt: 'heise.de', href: 'https://heise.de'}},
    {a: 7, b: 1, c: 60, d: 'Row4dasfa dsfasdf  adsf asdf asdf', l: {alt: 'Google', href: 'https://google.com'}}];
  var desc = [
    {label: 'D', type: 'string', column: 'd'},
    {label: 'A', type: 'number', column: 'a', 'domain': [0, 10]},
    {label: 'B', type: 'number', column: 'b', 'domain': [0, 30]},
    {label: 'C', type: 'number', column: 'c', 'domain': [0, 120]},
    {label: 'L', type: 'link', column: 'l'}];
  var colors = d3.scale.category10();
  desc.forEach(function (d, i) {
    (<any>d).color = colors(''+i);
  });
  var server = {
    sort: function (desc) {
      return Promise.resolve(d3.shuffle(d3.range(arr.length)));
    },
    view: function (indices) {
      var p = new Promise(function (resolve) {
        setTimeout(function (bak) {
          resolve(indices.map(function (index) {
            return arr[index];
          }));
        }, 2000 * Math.random());
      });
      return p;
    }
  };
  var provider = new provider.LocalDataProvider(arr, desc);
  var r = provider.pushRanking();

  var root = d3.select('body').append('svg').attr('width', '2000').attr('height', '300');
  var body = new renderer.LineUpBody(root, provider, function (rank) {
    return rank.extra.argsort;
  });

  r.push(provider.create(desc[0]));
  r.push(provider.create(desc[1]));
  var rstack = provider.create(model.StackColumn.desc('Stack'));
  r.push(rstack);
  rstack.push(provider.create(desc[1]), 0.2);
  rstack.push(provider.create(desc[2]), 0.4);
  rstack.push(provider.create(desc[3]), 0.2);
  rstack.normalizeWeights();
  r.push(provider.create(desc[4]));

  var r2 = provider.pushRanking();
  r2.push(provider.create(desc[1]));
  r2.push(provider.create(desc[0]));

  function update() {
    console.log('call', arguments);
    Promise.all([provider.sort(r), provider.sort(r2)])
      .then(function (argsorts) {
        r.extra.argsort = argsorts[0];
        r2.extra.argsort = argsorts[1];
        body.render();
      });
  }

  var call = utils.delayedCall(update, 2);
  r2.on('dirtySorting', call);
  r2.on('widthChanged', call);
  r.on('dirtySorting', call);
  r.on('widthChanged', call);
  update();
}
