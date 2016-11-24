/**
 * Created by Samuel Gratzl on 25.08.2015.
 */

window.onload = function () {
  var arr = [
    {a: 10, b: [1,0,1], c: [30,20,10], d: 'Row1', e: false, l: {alt: 'Google', href: 'https://google.com'}, cat: 'c2'},
    {a: 5, b:  [1,0,1], c: [30,20,10], d: 'Row2', e: true, l: {alt: 'ORF', href: 'https://orf.at'}, cat: 'c3'},
    {a: 2, b:  [0,1,1], c: [30,20,10], d: 'Row3', e: false, l: {alt: 'heise.de', href: 'https://heise.de'}, cat: 'c2'},
    {
      a: 7,
      b:  [1,0,1],
      c: [30,20,10],
      d: 'Row 4',
      e: false,
      l: {alt: 'Google', href: 'https://google.com'},
      cat: 'c1;c3'
    },
    {a: 2, b:  [1,1,0], c: [30,20,10], d: 'Row5', e: false, l: {alt: 'heise.de', href: 'https://heise.de'}, cat: 'c2'},
    {a: NaN, b: [0,0,0], c: [30,20,10], d: 'Row 6', e: false, l: {alt: 'heise.de', href: 'https://heise.de'}, cat: 'c2'}];
  var desc = [
    {label: 'Rows', type: 'string', column: 'd', cssClass: 'orange'},

    {label: 'Heatmap', type: 'heatmapcustom', column: 'c', sdomain: [0, 100], colorrange: ['blue', 'white', 'red'], sort: 'min', datalength: 3},
    {label: 'Sparkline', type: 'sparkline', column: 'c', sdomain: [0, 100], colorrange: ['blue', 'white', 'red'], sort: 'min', datalength: 3},
    {label: 'Threshold', type: 'threshold', column: 'c', sdomain: [0, 100], threshold: 20,colorrange: ['blue', 'red'], sort: 'min', datalength: 3},
    {label: 'Vertical Bar', type: 'verticalbar', column: 'c', sdomain: [0, 100], threshold: 20,colorrange: ['blue', 'red'], sort: 'min', datalength: 3},
    {label: 'Box Plot ', type: 'boxplot', column: 'c', sdomain: [0, 100], threshold: 20,colorrange: ['blue', 'red'], sort: 'min', datalength: 3},
    {label: 'Upset ', type: 'upset', column: 'b', sdomain: [0, 100], threshold: 20,colorrange: ['blue', 'red'], sort: 'min', datalength: 3}

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
  r.insert(p.create(LineUpJS.model.createSelectionDesc()), 0);
  r.push(p.create(desc[0]));
  r.push(p.create(desc[1]));
  r.push(p.create(desc[2]));
  r.push(p.create(desc[3]));
  r.push(p.create(desc[4]));
  r.push(p.create(desc[5]));
  r.push(p.create(desc[6]));

  // r.push(p.create(desc[9]));
  // r.push(p.create(desc[10]));
  // r.push(p.create(desc[11]));
  // var rstack = p.create(LineUpJS.model.createStackDesc('Stack'));
  // r.push(rstack);
  // rstack.push(p.create(desc[1]));
  // rstack.push(p.create(desc[2]));
  // rstack.push(p.create(desc[3]));
  // rstack.setWeights([0.2, 0.4]);
  // r.push(p.create(desc[4]));
  // var rscript = p.create(LineUpJS.model.createScriptDesc('Script'));
  // r.push(p.create(desc[1]));
  // r.push(p.create(desc[2]));
  // r.push(p.create(desc[3]));
  // r.push(rscript);
  // rscript.push(p.create(desc[1]));
  // rscript.push(p.create(desc[2]));
  // rscript.push(p.create(desc[3]));
  // var rnested = p.create(LineUpJS.model.createNestedDesc('Nested'));
  // r.push(rnested);
  // rnested.push(p.create(desc[1]));
  // rnested.push(p.create(desc[2]));
  // rscript.push(p.create(desc[0]));
  //
  // var r2 = p.pushRanking();
  // r2.push(p.create(desc[1]));
  // r2.push(p.create(desc[0]));
  // r2.push(p.create(desc[5]));
  // r2.push(p.create(desc[6]));
  // r2.push(p.create(desc[7]));

  var body = LineUpJS.create(p, root.node(), {
    additionalDesc: [
      LineUpJS.model.createStackDesc('+ Stack')
    ],
    htmlLayout: {
      autoRotateLabels: true
    },
    body: {
      renderer: 'SVG',
      freezeCols: 3
    },
    header: {
      rankingButtons: function ($node) {
        $node.append('button').text('+').on('click', function (d) {
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
