module.export = {
  name: 'LineUpEngine',
  mode: 'modules',
  modules: 'umd',
  theme: 'minimal',
  target: 'es6',
  hideGenerator: true,
  ignoreCompilerErrors: false,
  experimentalDecorators: true,
  emitDecoratorMetadata: true,
  preserveConstEnums: true,
  stripInternal: true,
  suppressExcessPropertyErrors: true,
  suppressImplicitAnyIndexErrors: true,
  exclude: 'tests/**/*.ts',
  excludePrivate: true,
  excludeProtected: true,
  excludeExternals: true
};
