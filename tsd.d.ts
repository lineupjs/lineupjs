//allow sass modules
declare module '*.scss' {
  const content: string;
  export default content;
}
declare module '*.png';
//allow html dependencies
declare module '*.html' {
  const content: string;
  export default content;
}
//allow json dependencies
declare module '*.json';
//allow file dependencies
declare module 'file-loader!*';
//allow file dependencies
declare module 'raw-loader!*';
//allow url dependencies
declare module 'url-loader!*';
//allow html dependencies
declare module 'imports-loader!*';
