LineUp.js: Visual Analysis of Multi-Attribute Rankings
======================================================
[![License][bsd-image]][bsd-url] [![NPM version][npm-image]][npm-url] [![CircleCI][ci-image]][ci-url] [![CircleCI][ci-image-dev]][ci-url-dev] <sup>(dev)</sup>

LineUp is an interactive technique designed to create, visualize and explore rankings of items based on a set of heterogeneous attributes.

Key Features
-----------
 * scalable (~100k rows)
 * heterogenous attribute types (string, numerical, categorical, boolean, date)
 * composite column types (weighted sum, min, max, mean, median, impose, nested, ...)
 * array (multi value) and map column types (strings, stringMap, numbers, numberMap, ...)
 * filtering capabilities
 * hierarchical sorting (sort by more than one sorting criteria)
 * hierarchical grouping (split rows in multiple separate groups)
 * group aggregations (show a whole group as a single group row)
 * numerous visualizations for summaries, cells, and group aggregations
 * side panel for easy filtering and column management
 * [React](#react), [Polymer](#polymer), [RShiny](#rshiny), [Juypter](#jupyter), and [Power BI](#powerbi) wrapper
 * [Demo Application](#demo) with CSV Import and Export Capabilities

Usage
-----

**Installation**

```bash
npm install --save lineupjs@next
```

```html
<link href="https://unpkg.com/lineupjs/build/LineUpJS.css" rel="stylesheet">
<script src="https://unpkg.com/lineupjs/build/LineUpJS.js"></script>
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

[![Minimal Result](https://user-images.githubusercontent.com/4129778/34654173-32180ff8-f3f8-11e7-8469-229fa34a65dc.png)](https://codepen.io/sgratzl/pen/Ozzbqp)


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

[![Advanced Result](https://user-images.githubusercontent.com/4129778/34654174-3235f784-f3f8-11e7-9361-44f5fa068bb9.png)](https://codepen.io/sgratzl/pen/vppyML)


Supported Browsers
------------------

 * Chrome 64+ (best performance)
 * Firefox 57+
 * Edge 16+
 
<a id="demo"></a>

Demo Application
----------------

A demo application is located at [lineup_app](https://github.com/sgratzl/lineup_app). It support CSV Import, CSV Export, JSON Export, CodePen Export, and Github Gist Export. 

The application is deployed at [https://lineup.js.org/app](https://lineup.js.org/app)

[![Screenshot](https://user-images.githubusercontent.com/4129778/36336600-8590a932-1389-11e8-8de0-269079efc37b.png)](https://lineup.js.org/app) 



<a id="react"></a>

React Support (LineUp.jsx)
--------------------------

A [React](https://reactjs.org/) wrapper is located at [lineupjsx](https://github.com/datavisyn/lineupjsx). 


**Installation**

```bash
npm install --save lineupjsx
```

```html
<link href="https://unpkg.com/lineupjsx/build/LineUpJSx.css" rel="stylesheet">
<script src="https://unpkg.com/lineupjsx/build/LineUpJSx.js"></script>
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
```jsx
<LineUp data={arr}/>
```

[CodePen](https://codepen.io/sgratzl/pen/mXEpMP)

Result is same as the builder minimal example

**Advanced Usage Example**

```jsx
// arr from before
<LineUp data={arr} defaultRanking>
  <LineUpStringColumnDesc column="d" label="Label" width={100} />
  <LineUpCategoricalColumnDesc column="cat" categories={cats} color="green" />
  <LineUpCategoricalColumnDesc column="cat2" categories={cats} color="blue" />
  <LineUpNumberColumnDesc column="a" domain={[0, 10]} color="blue" />

  <LineUpRanking groupBy="cat" sortBy="a:desc">
    <LineUpSupportColumn type="*" />
    <LineUpColumn column="*" />
    <LineUpImposeColumn label="a+cat" column="a" categeoricalColumn="cat2" />
  </LineUpRanking>
</LineUp>;
```

[CodePen](https://codepen.io/sgratzl/pen/yvJpWQ)

Result is same as the builder advanced example


<a id="polymer"></a>

Polymer Support (LineUp-Element)
--------------------------------

A [Polymer 2.0](https://www.polymer-project.org/) web component wrapper is located at [lineup-element](https://github.com/datavisyn/lineup-element). 


**Installation**

```bash
bower install https://github.com/datavisyn/lineup-element
```

```html
<link rel="import" href="bower_components/lineup-element/lineup-element.html">
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
conat data = { arr, cats };
```
```jsx
<lineup-element data="[[data.arr]]"></lineup-element>
```

TODO
[CodePen]()

Result is same as the builder minimal example

**Advanced Usage Example**

```jsx
// arr from before
<lineup-element data="[[data.arr]]" side-panel side-panel-collapsed default-ranking="true">
  <lineup-string-desc column="d" label="Label" width="100" ></lineup-string-desc>
  <lineup-categorical-desc column="cat" categories="[[cats]]" color="green" ></lineup-categorical-desc>
  <lineup-categorical-desc column="cat2" categories="[[cats]]" color="blue" ></lineup-categorical-desc>
  <lineup-number-desc column="a" domain="[0, 10]" color="blue" ></lineup-number-desc>
  <lineup-ranking group-by="cat" sort-by="a:desc">
    <lineup-support-column type="*" ></lineup-support-column>
    <lineup-column column="*" ></lineup-column>
  </lineup-ranking>
</lineup-element>
```

TODO
[CodePen]()

Result is same as the builder advanced example


<a id="rshiny"></a>

R, RShiny, and R Markdown Support
---------------------------------

A [HTMLWidget](http://www.htmlwidgets.org/) wrapper for R is located at [lineup_htmlwidget](https://github.com/datavisyn/lineup_htmlwidget). 
It can be used within standalone [R Shiny](https://shiny.rstudio.com/) apps or [R Markdown](http://rmarkdown.rstudio.com/) files. Integrated plotting does not work due to an outdated integrated Webkit version in RStudio.
[Crosstalk](https://rstudio.github.io/crosstalk/) is supported for synching selections and filtering among widgets. 

**Installation**

```R
devtools::install_github("rstudio/crosstalk")
devtools::install_github("datavisyn/lineup_htmlwidget")
library(lineup)
```

**Examples**

```R
lineup(iris)
```

![iris output](https://user-images.githubusercontent.com/4129778/34919941-fec50232-f96a-11e7-95be-9eefb213e3d6.png)


<a id="jupyter"></a>

Jupyter Widget (to be released)
--------------

A [Jupyter Widget](https://jupyter.org/widgets.html) wrapper for Python is located at [lineup_widget](https://github.com/datavisyn/lineup_widget).

**Installation**

```bash
pip install -e git+https://github.com/datavisyn/lineup_widget.git#egg=lineup_widget
jupyter nbextension enable --py [--sys-prefix|--user|--system] lineup_widget
```

Or, if you use jupyterlab:

```bash
pip install -e git+https://github.com/datavisyn/lineup_widget.git#egg=lineup_widget
jupyter labextension install @jupyter-widgets/jupyterlab-manager
```

**Examples**

[![Launch Binder][binder-image]][binder-url]

[binder-image]: https://camo.githubusercontent.com/70c5b4d050d4019f4f20b170d75679a9316ac5e5/687474703a2f2f6d7962696e6465722e6f72672f62616467652e737667
[binder-url]: http://mybinder.org/repo/datavisyn/lineup_widget/examples


```python
import lineup_widget
import pandas as pd
import numpy as np

df = pd.DataFrame(np.random.randint(0,100,size=(100, 4)), columns=list('ABCD'))

w = lineup_widget.LineUpWidget(df)
w.on_selection_changed(lambda selection: print(selection))
w
```

![simple usage](https://user-images.githubusercontent.com/4129778/35321859-7925d3a6-00e8-11e8-9884-bcbc76ae51c9.png)

```python
from __future__ import print_function
from ipywidgets import interact, interactive, interact_manual

def selection_changed(selection):
    return df.iloc[selection]

interact(selection_changed, selection=lineup_widget.LineUpWidget(df));
```

![interact example](https://user-images.githubusercontent.com/4129778/35321846-6c5b07cc-00e8-11e8-9388-0acb65cbb509.png)



<a id="powerbi"></a>

PowerBI Custom Visual (under development)
----------------------------------------

A [PowerBI Visual](https://github.com/Microsoft/PowerBI-Visuals) wrapper is located at [lineup_powerbi](https://github.com/datavisyn/lineup_powerbi).

**Installation**

TODO

**Examples**

TODO


API Documentation
-----------------

See [API documentation](https://lineup.js.org/master/docs) and [Develop API documentation](https://lineup.js.org/develop/docs)


Demos
-----

See [Demos](https://lineup.js.org/master), [Develop Demos](https://lineup.js.org/develop), and [R Demos](https://lineup.js.org/R)


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
git clone https://github.com/datavisyn/lineupjs.git -b develop
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
[ci-image]: https://circleci.com/gh/datavisyn/lineupjs.svg?style=shield
[ci-url]: https://circleci.com/gh/datavisyn/lineupjs
[ci-image-dev]: https://circleci.com/gh/datavisyn/lineupjs/tree/develop.svg?style=shield
[ci-url-dev]: https://circleci.com/gh/datavisyn/lineupjs/tree/develop


 
