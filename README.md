LineUp.js: Visual Analysis of Multi-Attribute Rankings
======================================================
[![License][bsd-image]][bsd-url] [![NPM version][npm-image]][npm-url] [![CircleCI][ci-image]][ci-url] [![CircleCI][ci-image-dev]][ci-url-dev] <sup>(dev)</sup>

LineUp is an interactive technique designed to create, visualize and explore rankings of items based on a set of heterogeneous attributes.

Key Features
-----------
 * scalale (~100k rows)
 * heterogenous attribute types (string, numerical, categorical, boolean, date)
 * composite column types (weighted sum, min, max, mean, median, impose, nested, ...)
 * array (multi value) and map column types (strings, stringMap, numbers, numberMap, ...)
 * filtering capabilities
 * hierarchical sorting (sort by more than one sorting criteria)
 * hierarchical grouping (split rows in multiple separate groups)
 * group aggregations (show a whole group as a single group row)
 * numerous visualizations for summaries, cells, and group aggregations
 * side panel for easy filtering and column management
 * [RShiny](#rshiny), [Juypter](#jupyter), and [Power BI](#powerbi) wrapper

Usage
-----

**Installation**

```bash
npm install --save lineupjs@next
```

```html
<link href="https://sgratzl.github.io/lineupjs_docs/master/LineUpJS.css" rel="stylesheet">
<script src="https://sgratzl.github.io/lineupjs_docs/master/LineUpJS.min.js"></script>
```

**Minimal Usage Example**

```javascript
// generate some data
const arr = [];
const cats = ['c1', 'c2', 'c3'];
for (let i = 0; i < 100; ++i) {
  arr.push({
    a: Math.random() * 10,
    d: 'Row ' + i,
    cat: cats[Math.floor(Math.random() * 3)],
    cat2: cats[Math.floor(Math.random() * 3)]
  })
}
```
```javascript
const lineup = LineUpJS.asLineUp(document.body, arr);
```

[CodePen](https://codepen.io/sgratzl/pen/Ozzbqp)

![Minimal Result](https://user-images.githubusercontent.com/4129778/34654173-32180ff8-f3f8-11e7-8469-229fa34a65dc.png)


**Advanced Usage Example**

```javascript
// arr from before
const builder = LineUpJS.builder(arr);

// manually define columns
builder
  .column(LineUpJS.buildStringColumn('d').label('Label').width(100))
  .column(LineUpJS.buildCategoricalColumn('cat', cats).color('green'))
  .column(LineUpJS.buildCategoricalColumn('cat2', cats).color('blue'))
  .column(LineUpJS.buildNumberColumn('a', [0, 10]).color('blue'));

// and two rankings
const ranking = LineUpJS.buildRanking()
  .supportTypes()
  .allColumns() // add all columns
  .impose('a+cat', 'a', 'cat2'); // create composite column
  .groupBy('cat')
  .sortBy('a', 'desc')
  

builder
  .defaultRanking()
  .ranking(ranking);

const lineup = builder.build(document.body);
```

[CodePen](https://codepen.io/sgratzl/pen/vppyML)

![Advanced Result](https://user-images.githubusercontent.com/4129778/34654174-3235f784-f3f8-11e7-9361-44f5fa068bb9.png)


Supported Browsers
------------------

 * Chrome 64+ (best performance)
 * Firefox 57+
 * Edge 16+
 

<a id="rshiny"></a>

R, RShiny, and R Markdown Support
---------------------------------

A [HTMLWidget](http://www.htmlwidgets.org/) wrapper for R is located at [lineup_htmlwidget](https://github.com/sgratzl/lineup_htmlwidget). 
It can be used within standalone [R Shiny](https://shiny.rstudio.com/) apps or [R Markdown](http://rmarkdown.rstudio.com/) files. Integrated plotting does not work due to an outdated integrated Webkit version in RStudio.
[Crosstalk](https://rstudio.github.io/crosstalk/) is supported for synching selections and filtering among widgets. 

**Installation**

```R
devtools::install_github("rstudio/crosstalk")
devtools::install_github("sgratzl/lineup_htmlwidget")
library(lineup)
```

**Examples**

```R
lineup(iris)
```

<a id="jupyter"></a>

Jupyter Widget (under development)
--------------

A [Jupyter Widget](https://jupyter.org/widgets.html) wrapper for Python is located at [lineup_widget](https://github.com/sgratzl/lineup_widget).

**Installation**

```bash
pip install -e git+https://github.com/sgratzl/lineup_widget.git@develop#egg=lineup_widget
jupyter nbextension enable --py [--sys-prefix|--user|--system] lineup_widget
```

Or, if you use jupyterlab:

```bash
pip install -e git+https://github.com/sgratzl/lineup_widget.git@develop#egg=lineup_widget
jupyter labextension install @jupyter-widgets/jupyterlab-manager
```

**Examples**

[![Launch Binder][binder-image]][binder-url]

[binder-image]: https://camo.githubusercontent.com/70c5b4d050d4019f4f20b170d75679a9316ac5e5/687474703a2f2f6d7962696e6465722e6f72672f62616467652e737667
[binder-url]: http://mybinder.org/repo/sgratzl/lineup_widget/examples


<a id="powerbi"></a>

PowerBI Custom Visual (under development)
----------------------------------------

A [PowerBI Visual](https://github.com/Microsoft/PowerBI-Visuals) wrapper is located at [lineup_powerbi](https://github.com/sgratzl/lineup_powerbi).

**Installation**

TODO

**Examples**

TODO


API Documentation
-----------------

See [API documentation](https://sgratzl.github.io/lineupjs_docs/master/docs) and [Develop API documentation](https://sgratzl.github.io/lineupjs_docs/develop/docs)


Demos
-----

See [Demos](https://sgratzl.github.io/lineupjs_docs/master), [Develop Demos](https://sgratzl.github.io/lineupjs_docs/develop), and [R Demos](https://sgratzl.github.io/lineupjs_docs/R)


Related Publications
---------------------

**LineUp: Visual Analysis of Multi-Attribute Rankings** [Paper](http://data.caleydo.org/papers/2013_infovis_lineup.pdf) [Paper Website](http://caleydo.org/publications/2013_infovis_lineup/)

Samuel Gratzl, Alexander Lex, Nils Gehlenborg, Hanspeter Pfister, and Marc Streit <br>
IEEE Transactions on Visualization and Computer Graphics (InfoVis '13), 19(12), pp. 2277–2286, doi:10.1109/TVCG.2013.173, 2013.

:trophy: [IEEE VIS](http://ieeevis.org) InfoVis 2013 Best Paper Award 

**Taggle: Scalable Visualization of Tabular Data through Aggregation** [Paper Preprint](http://sci.utah.edu/~vdl/papers/2017_preprint_taggle.pdf) [Paper Website](http://vdl.sci.utah.edu/publications/2017_preprint_taggle/)

Katarina Furmanova, Samuel Gratzl, Holger Stitz, Thomas Zichner, Miroslava Jaresova, Martin Ennemoser, Alexander Lex, and Marc Streit <br>
arXiv preprint, 2017.

Dependencies
------------

LineUp.js depends on 
 * [LineUpEngine](https://github.com/sgratzl/lineupengine) table rendering engine
 * [D3](http://d3js.org) utilities: scales, format, dragging
 * [Popper.js](https://popper.js.org) dialogs


**Development Dependencies**

[Webpack](https://webpack.github.io) is used as build tool. LineUp itself is written in [TypeScript](https://www.typescriptlang.org) and [SASS](https://sass-lang.com). 


Development Environment
-----------------------

**Installation**

```bash
git clone https://github.com/sgratzl/lineupjs.git -b develop
cd lineupjs
npm install
```

**Build distribution packages**

```bash
npm run build
```

**Run Linting**

```bash
npm run lint
```


**Serve integrated webserver**

```bash
npm run start
```


Authors
-------

 * Samuel Gratzl (@sgratzl)
 * Holger Stitz (@thinkh)
 * The Caleydo Team (@caleydo)
 * Datavisyn GmbH (@datavisyn)

***

<a href="http://caleydo.org"><img src="https://user-images.githubusercontent.com/4129778/34663868-5455cb76-f459-11e7-95db-f80db24026dc.png" align="left" width="200px" hspace="10" vspace="6"></a>
This repository was created as part of the **[The Caleydo Project](http://caleydo.org/)**.

[npm-image]: https://badge.fury.io/js/lineupjs.svg
[npm-url]: https://npmjs.org/package/lineupjs
[bsd-image]: https://img.shields.io/badge/License-BSD%203--Clause-blue.svg
[bsd-url]: https://opensource.org/licenses/BSD-3-Clause
[ci-image]: https://circleci.com/gh/sgratzl/lineupjs.svg?style=shield
[ci-url]: https://circleci.com/gh/sgratzl/lineupjs
[ci-image-dev]: https://circleci.com/gh/sgratzl/lineupjs/tree/develop.svg?style=shield
[ci-url-dev]: https://circleci.com/gh/sgratzl/lineupjs/tree/develop


 
