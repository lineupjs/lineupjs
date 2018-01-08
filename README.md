LineUp.js: Visual Analysis of Multi-Attribute Rankings
======================================================
[![License][bsd-image]][bsd-url] [![NPM version][npm-image]][npm-url] [![CircleCI][ci-image]][ci-url]

LineUp is an interactive technique designed to create, visualize and explore rankings of items based on a set of heterogeneous attributes. 
This is a web and generalized version of the published LineUp visualization technique by [Gratzl et.al. 2013](http://caleydo.org/publications/2013_infovis_lineup/)

Usage
-----

**Installation**

```bash
npm install --save lineupjs
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
  .groupBy('cat')
  .sortBy('a', 'desc')
  .impose('number', 'a', 'cat2'); // create composite column

builder
  .defaultRanking()
  .ranking(ranking);

const lineup = builder.build(document.body);
```

![Advanced Result](https://user-images.githubusercontent.com/4129778/34654174-3235f784-f3f8-11e7-9361-44f5fa068bb9.png)


Supported Browsers
------------------

 * Chrome 64+ (best performance)
 * Firefox 57+
 * Edge 16+
 

API Documentation
-----------------

See [Develop API documentation](https://sgratzl.github.io/lineupjs_docs/develop/docs)

Demos
-----

See [Develop Demos](https://sgratzl.github.io/lineupjs_docs/develop)


Dependencies
------------

LineUp.js depends on 
 * [LineUpEngine](https://github.com/sgratzl/lineupengine) table rendering engine
 * [D3](http://d3js.org) utilities: scales, format, dragging
 * [Popper.js](https://popper.js.org) dialogs


Development Dependencies
------------------------

[Webpack](https://webpack.github.io) is used as build tool. LineUp itself is written in [TypeScript](https://www.typescriptlang.org) and [SASS](https://sass-lang.com). 


Development Environment
-----------------------

**Installation**

```bash
git clone https://github.com/Caleydo/lineupjs.git
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


**Watch file changes**

```bash
npm run watch
```


***

<a href="https://caleydo.org"><img src="http://caleydo.org/assets/images/logos/caleydo.svg" align="left" width="200px" hspace="10" vspace="6"></a>
This repository is created as part of the **[The Caleydo Project](http://caleydo.org/)**.

[npm-image]: https://badge.fury.io/js/lineupjs.svg
[npm-url]: https://npmjs.org/package/lineupjs
[bsd-image]: https://img.shields.io/badge/License-BSD%203--Clause-blue.svg
[bsd-url]: https://opensource.org/licenses/BSD-3-Clause
[ci-image]: https://circleci.com/gh/Caleydo/lineupjs.svg?style=shield
[ci-url]: https://circleci.com/gh/Caleydo/lineupjs


 
