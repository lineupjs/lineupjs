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
        'sk_score': [b.sk_score2012, b.sk_score2013, b.sk_score2014, b.sk_score2015],
        'single_score': b.health_score2012
      });

    })

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

    var smiles_bm = [], smiles_cpd = [];
    d3.tsv('smiles.txt', function (smiles) {
      var smiles_data = smiles;
      // console.log(smiles)

      for (var i = 0; i < newdata.length; i++) {

        smiles_bm.push('../SMILES_BM/SMILES_BM_' + (i + 1) + '.png');

      }

      //  console.log(smiles_bm)

      var arr1 = [];
      newdata.map(function (x, i) {
        var arraydata = x.health_score.map(Number);
        return arr1.push({
          stringdata: x.country,
          multidata: arraydata,
          singledata: parseFloat(x.single_score),
          upsetdata: catdata(4),
          smiles_bm: smiles_bm[i]
        })

      });


      var boxplottestdata = [
        {
          "q1": 16.228708744,
          "q3": 40.6764354706,
          "min": 1.14364,
          "max": 112.859,
          "median": 21.1322345734,
          "id": "ENSG00000000003"
        },
        {
          "q1": 1.0,
          "q3": 1.0,
          "min": 1.0,
          "max": 1.52861,
          "median": 1.0,
          "id": "ENSG00000000005"
        }, {
          "q1": 72.3565235138,
          "q3": 128.727273941,
          "min": 43.9317,
          "max": 372.435,
          "median": 101.8650360107,
          "id": "ENSG00000000419"
        }, {
          "q1": 6.9767802954,
          "q3": 16.3615880013,
          "min": 4.04306,
          "max": 31.0283,
          "median": 12.0053138733,
          "id": "ENSG00000000457"
        }, {
          "q1": 13.5131280422,
          "q3": 22.8681511879,
          "min": 2.55096,
          "max": 37.0075,
          "median": 17.4877376556,
          "id": "ENSG00000000460"
        }, {
          "q1": 1.0209952593,
          "q3": 1.1256016791,
          "min": 1.0,
          "max": 2.68057,
          "median": 1.0507785678,
          "id": "ENSG00000000938"
        }];


      d3.json('testcancerdata.json', function (d) {

        boxplottestdata = d;

        var boxdata_minval, boxdata_maxval;

        boxdata_minval = d3.min(boxplottestdata, function (d) {
          return d.min;
        });
        boxdata_maxval = d3.max(boxplottestdata, function (d) {
          return d.max;
        });


        var arr2 = [];
        boxplottestdata.map(function (x) {

          return arr2.push({boxdata: x});

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
          }, {
            label: 'Smiles',
            type: 'smile',
            column: 'smiles_bm',
            domain: [singldata_min, singldata_max]

          }
        ];


        var desc2 = [
          {
            label: 'BoxPlot',
            type: 'boxplot',
            column: 'boxdata',
            sort: 'min',
            domain: [boxdata_minval, boxdata_maxval],
            rendererType: 'boxplot'

          }
        ];


        console.log(arr1, desc1)
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
            renderer: 'svg',
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

      });  // Cancer data

    }) //Smiles.txt

  })// Data.json
};
