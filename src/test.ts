/**
 * Created by Samuel Gratzl on 14.08.2015.
 */


///<reference path='../typings/tsd.d.ts' />
import d3 = require('d3');

import provider = require('./provider');
import model = require('./model');
import utils = require('./utils');
import ui = require('./ui');

window.onload = function () {
  var arr = [
    {a: 10, b: 20, c: 30, d: 'Row1', l: {alt: 'Google', href: 'https://google.com'}, cat: 'c2'},
    {a: 5, b: 14, c: 2, d: 'Row2', l: {alt: 'ORF', href: 'https://orf.at'}, cat: 'c3'},
    {a: 2, b: 7, c: 100, d: 'Row3', l: {alt: 'heise.de', href: 'https://heise.de'}, cat: 'c2'},
    {a: 7, b: 1, c: 60, d: 'Row4dasfa dsfasdf  adsf asdf asdf', l: {alt: 'Google', href: 'https://google.com'}, cat: 'c1'}];
  var desc = [
    {label: 'D', type: 'string', column: 'd'},
    {label: 'A', type: 'number', column: 'a', 'domain': [0, 10]},
    {label: 'B', type: 'number', column: 'b', 'domain': [0, 30]},
    {label: 'C', type: 'number', column: 'c', 'domain': [0, 120]},
    {label: 'L', type: 'link', column: 'l'},
    {label: 'L2', type: 'link', column: 'a', link: 'https://duckduckgo.com/?q=$1'},
    {label: 'Cat', type: 'categorical', column: 'cat', categories : ['c1','c2','c3']},
    {label: 'Ord', type: 'ordinal', column: 'cat', categories : ['c1','c2','c3']}];
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
  var p = new provider.LocalDataProvider(arr, desc);
  var r = p.pushRanking();

  var root = d3.select('body');

  r.push(p.create(desc[0]));
  r.push(p.create(desc[1]));
  var rstack = p.create(model.StackColumn.desc('Stack'));
  r.push(rstack);
  rstack.push(p.create(desc[1]));
  rstack.push(p.create(desc[2]));
  rstack.push(p.create(desc[3]));
  rstack.setWeights([0.2, 0.4]);
  r.push(p.create(desc[4]));

  var r2 = p.pushRanking();
  r2.push(p.create(desc[1]));
  r2.push(p.create(desc[0]));
  r2.push(p.create(desc[5]));
  r2.push(p.create(desc[6]));
  r2.push(p.create(desc[7]));

  function update() {
    console.log('call', arguments);
    Promise.all([p.sort(r), p.sort(r2)])
      .then(function (argsorts) {
        r.extra.argsort = argsorts[0];
        r2.extra.argsort = argsorts[1];
        body.update();
      });
  }

  var call = utils.delayedCall(update, 2);
  r2.on('dirtySorting', call);
  r2.on('widthChanged', call);
  r.on('dirtySorting', call);
  r.on('widthChanged', call);

  var body = new ui.LineUpRenderer(<Element>root.node(), p, desc, function (rank) {
    return rank.extra.argsort;
  }, {
    additionalDesc : [
      model.StackColumn.desc('+ Stack')
    ]
  });
  update();
};
