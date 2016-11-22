/**
 * Created by Samuel Gratzl on 25.08.2015.
 */

window.onload = function () {
  var arr = [
    {a: 10, b: 20, c: 30, d: 'Row1', e: false, l: {alt: 'Google', href: 'https://google.com'}, cat: 'c2'},
    {a: 5, b: 14, c: 2, d: 'Row2', e: true, l: {alt: 'ORF', href: 'https://orf.at'}, cat: 'c3'},
    {a: 2, b: 7, c: 100, d: 'Row3', e: false, l: {alt: 'heise.de', href: 'https://heise.de'}, cat: 'c2'},
    {a: 7, b: 1, c: 60, d: 'Row4dasfa dsfasdf  adsf asdf asdf', e: false, l: {alt: 'Google', href: 'https://google.com'}, cat: 'c1;c3'},
    {a: 2, b: 4, c: 30, d: 'Row5', e: false, l: {alt: 'heise.de', href: 'https://heise.de'}, cat: 'c2'},
    {a: NaN, b: '', c: 30, d: '', e: false, l: {alt: 'heise.de', href: 'https://heise.de'}, cat: 'c2'}];
  var desc = [
    {label: 'D', type: 'string', column: 'd', cssClass: 'orange'},
    {label: 'A', type: 'number', column: 'a', 'domain': [0, 10]},
    {label: 'B', type: 'number', column: 'b', 'domain': [0, 30]},
    {label: 'C', type: 'number', column: 'c', 'domain': [0, 120], color: 'green'},
    {label: 'L', type: 'link', column: 'l'},
    {label: 'L2', type: 'link', column: 'a', link: 'https://duckduckgo.com/?q=$1'},
    {label: 'Cat', type: 'categorical', column: 'cat', categories : ['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13','c14','c15','c16','c17','c18','c19']},
    {label: 'Ord', type: 'ordinal', column: 'cat', categories : ['c1','c2','c3']},
    {label: 'Annadfas fasdf adsf asdfasd fasd', type: 'annotate', column: 'd'},
    {label: 'BB', type: 'boolean', column: 'e'},
    {label: 'Cat Label', type: 'categorical', column: 'cat', categories : [{name: 'c1', label: 'C1', color: 'green'},{name: 'c2', label: 'C2', color: 'blue'},{name: 'c3', label: 'C3', color: 'red'}]},
    {label: 'L.alt', type: 'string', column: 'l.alt' }
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
  r.insert(p.create(LineUpJS.model.createSelectionDesc()),0);
  r.push(p.create(desc[0]));
  r.push(p.create(desc[1]));
  r.push(p.create(desc[8]));
  r.push(p.create(desc[9]));
  r.push(p.create(desc[10]));
  r.push(p.create(desc[11]));
  var rstack = p.create(LineUpJS.model.createStackDesc('Stack'));
  r.push(rstack);
  rstack.push(p.create(desc[1]));
  rstack.push(p.create(desc[2]));
  rstack.push(p.create(desc[3]));
  rstack.setWeights([0.2, 0.4]);
  r.push(p.create(desc[4]));
  var rscript = p.create(LineUpJS.model.createScriptDesc('Script'));
  r.push(p.create(desc[1]));
  r.push(p.create(desc[2]));
  r.push(p.create(desc[3]));
  r.push(rscript);
  rscript.push(p.create(desc[1]));
  rscript.push(p.create(desc[2]));
  rscript.push(p.create(desc[3]));
  var rnested = p.create(LineUpJS.model.createNestedDesc('Nested'));
  r.push(rnested);
  rnested.push(p.create(desc[1]));
  rnested.push(p.create(desc[2]));
  rscript.push(p.create(desc[0]));

  var r2 = p.pushRanking();
  r2.push(p.create(desc[1]));
  r2.push(p.create(desc[0]));
  r2.push(p.create(desc[5]));
  r2.push(p.create(desc[6]));
  r2.push(p.create(desc[7]));

  var body = LineUpJS.create(p, root.node(), {
    additionalDesc : [
      LineUpJS.model.createStackDesc('+ Stack')
    ],
    htmlLayout: {
      autoRotateLabels: true
    },
    body: {
      renderer: 'canvas',
      freezeCols: 3
    },
    header: {
      rankingButtons: function($node) {
        $node.append('button').text('+').on('click', function(d) {
          console.log(d);
        });
      },
      linkTemplates: ['a/$1', 'b/$1']
    },
    renderingOptions: {
      animation: false,
      histograms: true,
      meanLine: true
    }
  });
  body.update();
};
