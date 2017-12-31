/**
 * Created by Samuel Gratzl on 02.08.2017.
 */
import {IFilterDialog} from '../interfaces';
import BooleanFilterDialog from './BooleanFilterDialog';
import CategoricalFilterDialog from './CategoricalFilterDialog';
import CategoricalMappingFilterDialog from './CategoricalMappingFilterDialog';
import MappingsFilterDialog from './MappingsFilterDialog';
import StringFilterDialog from './StringFilterDialog';


export const filters = <{ [type: string]: IFilterDialog }>{
  stringLike: StringFilterDialog,
  boolean: BooleanFilterDialog,
  categorical: CategoricalFilterDialog,
  number: MappingsFilterDialog,
  ordinal: CategoricalMappingFilterDialog,
  boxplot: MappingsFilterDialog,
  numbers: MappingsFilterDialog
};
