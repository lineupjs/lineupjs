/**
 * Created by Samuel Gratzl on 25.08.2015.
 */

window.onload = function () {
  var arr = [
    {a: 10, b: 20, c: 30, d: 'Row1', l: {alt: 'Google', href: 'https://google.com'}, cat: 'c2'},
    {a: 5, b: 14, c: 2, d: 'Row2', l: {alt: 'ORF', href: 'https://orf.at'}, cat: 'c3'},
    {a: 2, b: 7, c: 100, d: 'Row3', l: {alt: 'heise.de', href: 'https://heise.de'}, cat: 'c2'},
    {a: 7, b: 1, c: 60, d: 'Row4dasfa dsfasdf  adsf asdf asdf', l: {alt: 'Google', href: 'https://google.com'}, cat: 'c1;c3'}];
  var desc = [
    {label: 'D', type: 'string', column: 'd', cssClass: 'orange'},
    {label: 'A', type: 'number', column: 'a', 'domain': [0, 10]},
    {label: 'B', type: 'number', column: 'b', 'domain': [0, 30]},
    {label: 'C', type: 'number', column: 'c', 'domain': [0, 120], cssClass: 'green'},
    {label: 'L', type: 'link', column: 'l'},
    {label: 'L2', type: 'link', column: 'a', link: 'https://duckduckgo.com/?q=$1'},
    {label: 'Cat', type: 'categorical', column: 'cat', categories : ['c1','c2','c3']},
    {label: 'Ord', type: 'ordinal', column: 'cat', categories : ['c1','c2','c3']},
    {label: 'Annadfas fasdf adsf asdfasd fasd', type: 'annotate', column: 'd'}
  ];
  //var colors = d3.scale.category10();
  //desc.forEach(function (d, i) {
  //  d.color = colors(''+i);
  //});
  /*var server = {
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
   };*/
  var p = new LineUpJS.provider.LocalDataProvider(arr, desc);
  var r = p.pushRanking();

  var root = d3.select('body');
  r.insert(p.create(p.createSelectionDesc()),0);
  r.push(p.create(desc[0]));
  r.push(p.create(desc[1]));
  r.push(p.create(desc[8]));
  var rstack = p.create(LineUpJS.model.StackColumn.desc('Stack'));
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

  var body = LineUpJS.create(p, root.node(), {
    additionalDesc : [
      LineUpJS.model.StackColumn.desc('+ Stack')
    ],
    htmlLayout: {
      autoRotateLabels: true
    },
    renderingOptions: {
      histograms: true
    }
  });
  body.update();
};
