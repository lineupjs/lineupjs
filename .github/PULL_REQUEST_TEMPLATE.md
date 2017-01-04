related issues:   

### Pre merge/review checklist
* [ ] branch is up-to-date with the branch to be merged with, i.e. master
* [ ] travis build works
* [ ] internal code review by requester is done:
  * [ ] code is formatted
  * [ ] removed debug output `console.log`, ...
  * [ ] use of `readonly` for readonly fields and interfaces fields
  * [ ] parameters, fields, variables that are not initialized are typed, e.g.,  `function f(a)` => `function f(a: number)` 
  * [ ] optional options objects are typed using option interfaces, see e.g. `ILineUpConfig`
  * [ ] code is formatted using your preferred editor formatting tool (e.g. atom beautifier, WebStorm Format Code,...)
  * [ ] use of meaningful names in camelCase especially for public functions and fields
  * [ ] file structure: avoid of large code files containing multiple elements (classes, functions) better to create a nested structure, e.g., `model`
  * [ ] in case of DOM elements: assigning the `id` is avoided or the prefix in the lineup config is prepended
  * [ ] in case of css styles: global classes prepended with `lu-` or within a `lu-` namespace
  * [ ] public fields/function those purpose is not obvious are documented
  * [ ] complex code is documented
  * [ ] code is well structured regarding use of variable names, complexity
  * [ ] public interfaces (e.g. public interface of a class) are minimal, no superfluous fields, functions
  * [ ] complex code is not duplicated. Otherwise justified within the code, why needed
 * [ ] code reviewer is assigned
 * [ ] in case of second review round: review comments are justified or implemented
 
