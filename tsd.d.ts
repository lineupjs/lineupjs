//allow sass modules
declare module '*.scss' {
  const content: string;
  export default content;
}
//allow html dependencies
declare module '*.html' {
  const content: string;
  export default content;
}