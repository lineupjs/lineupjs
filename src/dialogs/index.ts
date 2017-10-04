/**
 * Created by Samuel Gratzl on 02.08.2017.
 */
import {IFilterDialog} from './AFilterDialog';
import StringFilterDialog from './StringFilterDialog';
import BooleanFilterDialog from './BooleanFilterDialog';
import CategoricalFilterDialog from './CategoricalFilterDialog';
import MappingsFilterDialog from './MappingsFilterDialog';
import CategoricalMappingFilterDialog from './CategoricalMappingFilterDialog';


export const filters = <{ [type: string]: IFilterDialog }>{
  stringLike: StringFilterDialog,
  boolean: BooleanFilterDialog,
  categorical: CategoricalFilterDialog,
  number: MappingsFilterDialog,
  ordinal: CategoricalMappingFilterDialog,
  boxplot: MappingsFilterDialog,
  numbers: MappingsFilterDialog
};
