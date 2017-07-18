/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

//allow sass modules
declare module "*.scss" {
  const content:string;
  export default content;
}
declare module "*.png";
//allow html dependencies
declare module "*.html" {
  const content:string;
  export default content;
}
//allow json dependencies
declare module "*.json";
//allow file dependencies
declare module "file-loader!*";
//allow file dependencies
declare module "raw-loader!*";
//allow url dependencies
declare module "url-loader!*";
//allow html dependencies
declare module "imports-loader!*";
