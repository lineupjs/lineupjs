/**
 * Created by Samuel Gratzl on 25.08.2015.
 */

window.onload = function () {


  function catdata(datapoints) {
    var temparr = [];
    for (var i = 0; i < datapoints; i++) {

      //temparr.push('c'+i,i);
      temparr.push(Math.floor(Math.random() * 2));

    }

    return (temparr);
  }

  var data;
  d3.json('data.json', function (data) {


    var newdata = [];


    data.forEach(function (b) {

      return newdata.push({
        'country': b.country,
        'iso': b.iso,
        'region': b.region,
        'PI-region': b.piregion,
        'pi_score': [b.pi_score2012, b.pi_score2013, b.pi_score2014, b.pi_score2015],
        'eco_score': [b.eco_score2012, b.eco_score2013, b.eco_score2014, b.eco_score2015],
        'eo_score': [b.eo_score2012, b.eo_score2013, b.eo_score2014, b.eo_score2015],
        'health_score': [b.health_score2012, b.health_score2013, b.health_score2014, b.health_score2015],
        'ss_score': [b.ss_score2012, b.ss_score2013, b.ss_score2014, b.ss_score2015],
        'pf_score': [b.pf_score2012, b.pf_score2013, b.pf_score2014, b.pf_score2015],
        'sk_score': [b.sk_score2012, b.sk_score2013, b.sk_score2014, b.sk_score2015]
      });

    })

    var min, max, datalength;
    newdata.forEach(function (d) {

      var tmp = (d.health_score.map(function (d) {
        return parseFloat((d));
      }))

      min = d3.min([min, d3.min(tmp)]);
      max = d3.max([max, d3.max(tmp)]);
      datalength = d3.max([datalength, tmp.length])

    })

    var arr1 = [];
    newdata.reduce(function (a, b, i) {
      var arraydata = b.health_score.map(function (x) {
        return parseFloat(x);

      });

      return arr1.push({
        country: b.country,
        heatmapcustom: arraydata,
        sparkline: arraydata,
        boxplot: arraydata,
        threshold: arraydata,
        verticalbar: arraydata,
        upset: catdata(4)

      })

    }, 0)


    var desc1 = [
      {label: 'Country', type: 'string', column: 'country'},
      {
        label: 'HeatMap',
        type: 'heatmapcustom',
        column: 'heatmapcustom',
        sdomain: [min, max],
        colorrange: ['blue', 'red'],
        sort: 'min',

        datalength: datalength
       },
      {
        label: 'upset',
        type: 'upset',
        column: 'upset',
        sdomain: [min, max],
        colorrange: ['blue', 'red'],
        sort: 'countcategory',
        datalength: datalength
      }
      // {
      //   label: 'Spark Line',
      //   type: 'sparkline',
      //   column: 'sparkline',
      //   sdomain: [min, max],
      //   colorrange: ['blue', 'red'],
      //   sort: 'min',
      //   threshold: 0,
      //   datalength: datalength
      // },
      // {
      //   label: 'Box Plot',
      //   type: 'boxplot',
      //   column: 'boxplot',
      //   sdomain: [min, max],
      //   colorrange: ['blue', 'red'],
      //   sort: 'min',
      //   threshold: 0,
      //   datalength: datalength
      // },
      // {
      //   label: 'threshold',
      //   type: 'threshold',
      //   column: 'threshold',
      //   threshold: 0,
      //   sdomain: [min, max],
      //   sort: 'min',
      //   colorrange: ['blue', 'red'],
      //   datalength: datalength
      // },
      // {
      //   label: 'verticalbar',
      //   type: 'verticalbar',
      //   column: 'verticalbar',
      //   sdomain: [min, max],
      //
      //   sort: 'min',
      //   threshold: 0,
      //   datalength: datalength
      // },
      ]


    //
    //
    // var arr = [
    //   {a: 10, b: [1,0,1], c: [30,20,10], d: 'Row1', e: false, l: {alt: 'Google', href: 'https://google.com'}, cat: 'c2'},
    //   {a: 5, b:  [1,0,1], c: [30,20,10], d: 'Row2', e: true, l: {alt: 'ORF', href: 'https://orf.at'}, cat: 'c3'},
    //   {a: 2, b:  [0,1,1], c: [30,20,10], d: 'Row3', e: false, l: {alt: 'heise.de', href: 'https://heise.de'}, cat: 'c2'},
    //   {
    //     a: 7,
    //     b:  [1,0,1],
    //     c: [30,20,10],
    //     d: 'Row 4',
    //     e: false,
    //     l: {alt: 'Google', href: 'https://google.com'},
    //     cat: 'c1;c3'
    //   },
    //   {a: 2, b:  [1,1,0], c: [30,20,10], d: 'Row5', e: false, l: {alt: 'heise.de', href: 'https://heise.de'}, cat: 'c2'},
    //   {a: NaN, b: [0,0,0], c: [30,20,10], d: 'Row 6', e: false, l: {alt: 'heise.de', href: 'https://heise.de'}, cat: 'c2'}];

    // var desc = [
    //   {label: 'Rows', type: 'string', column: 'd', cssClass: 'orange'},
    //
    //   {label: 'Heatmap', type: 'heatmapcustom', column: 'c', sdomain: [0, 100], colorrange: ['blue', 'white', 'red'], sort: 'min', datalength: 3},
    //   {label: 'Sparkline', type: 'sparkline', column: 'c', sdomain: [0, 100], colorrange: ['blue', 'white', 'red'], sort: 'min', datalength: 3},
    //   {label: 'Threshold', type: 'threshold', column: 'c', sdomain: [0, 100], threshold: 20,colorrange: ['blue', 'red'], sort: 'min', datalength: 3},
    //   {label: 'Vertical Bar', type: 'verticalbar', column: 'c', sdomain: [0, 100], threshold: 20,colorrange: ['blue', 'red'], sort: 'min', datalength: 3},
    //   {label: 'Box Plot ', type: 'boxplot', column: 'c', sdomain: [0, 100], threshold: 20,colorrange: ['blue', 'red'], sort: 'min', datalength: 3},
    //   {label: 'Upset ', type: 'upset', column: 'b', sdomain: [0, 100], threshold: 20,colorrange: ['blue', 'red'], sort: 'min', datalength: 3}
    //
    // ];
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
    var p = new LineUpJS.provider.LocalDataProvider(arr1, desc1);
    var r = p.pushRanking();

    var root = d3.select('body');
    r.insert(p.create(LineUpJS.model.createSelectionDesc()), 0);
    desc1.forEach(function (d) {

      r.push(p.create(d));
    })

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
        renderer: 'canvas',
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
  });
};
