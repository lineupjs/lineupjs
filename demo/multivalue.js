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
  d3.json('multivalue.json', function (data) {


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
        'sk_score': [b.sk_score2012, b.sk_score2013, b.sk_score2014, b.sk_score2015],
        'single_score': b.health_score2012
      });

    });

    var multidata_min, multidata_max, multidata_length, singldata_min, singldata_max;
    newdata.forEach(function (d) {

      var tmp = (d.health_score.map(function (d) {
        return parseFloat((d));
      }));

      multidata_min = d3.min([multidata_min, d3.min(tmp)]);
      multidata_max = d3.max([multidata_max, d3.max(tmp)]);
      multidata_length = d3.max([multidata_length, tmp.length]);
      singldata_min = d3.min([singldata_min, parseFloat(d.single_score)])
      singldata_max = d3.max([singldata_max, parseFloat(d.single_score)])
    });


    var arr1 = [];
    newdata.map(function (x, i) {
      var arraydata = x.health_score.map(Number);
      return arr1.push({
        stringdata: x.country,
        multidata: arraydata,
        singledata: parseFloat(x.single_score),
        upsetdata: catdata(4)
      })

    });

    var desc1 = [
      {label: 'Country', type: 'string', column: 'stringdata'},
      {
        label: 'MultiValue',
        type: 'multiValue',
        column: 'multidata',
        domain: [multidata_min, multidata_max],
        colorRange: ['blue', 'white', 'red'],
        sort: 'min',
        threshold: 0,
        dataLength: multidata_length,
        rendererType: 'boxplot'
      },
      {
        label: 'upset',
        type: 'set',
        column: 'upsetdata',
        sdomain: [multidata_min, multidata_max],
        colorrange: ['blue', 'red'],
        sort: 'countcategory',
        dataLength: multidata_length

      },
      {
        label: 'Number',
        type: 'number',
        column: 'singledata',
        domain: [singldata_min, singldata_max]
      }
    ];


    console.log(arr1, desc1);
    var p = new LineUpJS.provider.LocalDataProvider(arr1, desc1);

    var r = p.pushRanking();

    var root = d3.select('body');
    r.insert(p.create(LineUpJS.model.createSelectionDesc()), 0);
    desc1.forEach(function (d) {
      r.push(p.create(d));
    });

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
  })
};
