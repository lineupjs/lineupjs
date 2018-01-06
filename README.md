LineUp.js: Visual Analysis of Multi-Attribute Rankings [![NPM version][npm-image]][npm-url] 
======================================================

LineUp is an interactive technique designed to create, visualize and explore rankings of items based on a set of heterogeneous attributes. 
This is a D3-based re-implementation with limited functionality relative to the original stand-alone LineUp, which you can check out at http://lineup.caleydo.org




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

 [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
