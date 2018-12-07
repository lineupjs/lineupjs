import {IStatistics, ICategoricalStatistics, IDateStatistics, IAdvancedBoxPlotData, computeDateStats, computeNormalizedStats, computeHist, LazyBoxPlotData} from '../internal/math';
import {IDataRow, INumberColumn, IDateColumn, ISetColumn, IOrderedGroup, IndicesArray} from '../model';
import Column from '../model/Column';
import {ISequence, lazySeq} from '../internal/interable';
import {IAbortAblePromise} from 'lineupengine';

export {IAbortAblePromise} from 'lineupengine';


export interface IRenderTasks {
  groupRows<T>(col: Column, group: IOrderedGroup, compute: (rows: ISequence<IDataRow>) => T, render: (value: T) => void): IAbortAblePromise<void> | void;
  groupExampleRows<T>(col: Column, group: IOrderedGroup, compute: (rows: ISequence<IDataRow>) => T, render: (value: T) => void): IAbortAblePromise<void> | void;

  groupBoxPlotStats(col: Column & INumberColumn, group: IOrderedGroup, render: (group: IAdvancedBoxPlotData, summary: IAdvancedBoxPlotData, data: IAdvancedBoxPlotData) => void): IAbortAblePromise<void> | void;
  groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup, render: (group: IStatistics, summary: IStatistics, data: IStatistics) => void): IAbortAblePromise<void> | void;
  groupCategoricalStats(col: Column & ISetColumn, group: IOrderedGroup, render: (group: ICategoricalStatistics, summary: ICategoricalStatistics, data: ICategoricalStatistics) => void): IAbortAblePromise<void> | void;
  groupDateStats(col: Column & IDateColumn, group: IOrderedGroup, render: (group: IDateStatistics, summary: IDateStatistics, data: IDateStatistics) => void): IAbortAblePromise<void> | void;

  summaryBoxPlotStats(col: Column & INumberColumn, render: (summary: IAdvancedBoxPlotData, data: IAdvancedBoxPlotData) => void): IAbortAblePromise<void> | void;
  summaryNumberStats(col: Column & INumberColumn, render: (summary: IStatistics, data: IStatistics) => void): IAbortAblePromise<void> | void;
  summaryCategoricalStats(col: Column & ISetColumn, render: (summary: ICategoricalStatistics, data: ICategoricalStatistics) => void): IAbortAblePromise<void> | void;
  summaryDateStats(col: Column & IDateColumn, render: (summary: IDateStatistics, data: IDateStatistics) => void): IAbortAblePromise<void> | void;
}


export class DirectRenderTasks implements IRenderTasks {
  private readonly byIndex = (i: number) => this.data[i];

  private readonly dataCache = new Map<string, any>();

  constructor(private data: IDataRow[]) {

  }

  setData(data: IDataRow[]) {
    this.data = data;
    this.dataCache.clear();
  }

  private byOrder(indices: IndicesArray) {
    return lazySeq(indices).map(this.byIndex);
  }

  groupRows<T>(_col: Column, group: IOrderedGroup, compute: (rows: ISequence<IDataRow>) => T, render: (value: T) => void) {
    render(compute(this.byOrder(group.order)));
  }

  groupExampleRows<T>(_col: Column, group: IOrderedGroup, compute: (rows: ISequence<IDataRow>) => T, render: (value: T) => void) {
    render(compute(this.byOrder(group.order.slice(0, 5))));
  }

  groupBoxPlotStats(col: Column & INumberColumn, group: IOrderedGroup, render: (group: IAdvancedBoxPlotData & IStatistics, summary: IAdvancedBoxPlotData & IStatistics, data: IAdvancedBoxPlotData & IStatistics) => void) {
    this.groupNumberStats(col, group, render);
  }

  groupNumberStats(col: Column & INumberColumn, group: IOrderedGroup, render: (group: IAdvancedBoxPlotData & IAdvancedBoxPlotData & IStatistics, summary: IAdvancedBoxPlotData & IStatistics, data: IAdvancedBoxPlotData & IStatistics) => void) {
    this.summaryNumberStats(col, (summary, data) => {
      render(computeNormalizedStats(this.byOrder(group.order).map((d) => col.getNumber(d))), summary, data);
    });
  }

  groupCategoricalStats(col: Column & ISetColumn, group: IOrderedGroup, render: (group: ICategoricalStatistics, summary: ICategoricalStatistics, data: ICategoricalStatistics) => void) {
    this.summaryCategoricalStats(col, (summary, data) => {
      render(computeHist(this.byOrder(group.order).map((d) => col.getSet(d)), col.categories), summary, data);
    });
  }

  groupDateStats(col: Column & IDateColumn, group: IOrderedGroup, render: (group: IDateStatistics, summary: IDateStatistics, data: IDateStatistics) => void) {
    this.summaryDateStats(col, (summary, data) => {
      render(computeDateStats(this.byOrder(group.order).map((d) => col.getDate(d))), summary, data);
    });
  }

  summaryBoxPlotStats(col: Column & INumberColumn, render: (summary: IAdvancedBoxPlotData & IStatistics, data: IAdvancedBoxPlotData & IStatistics) => void) {
    this.summaryNumberStats(col, render);
  }

  summaryNumberStats(col: Column & INumberColumn, render: (summary: IAdvancedBoxPlotData & IStatistics, data: IAdvancedBoxPlotData & IStatistics) => void) {
    const ranking = col.findMyRanker()!.getOrder();
    this.dataNumberStats(col, (data) => {
      render(computeNormalizedStats(this.byOrder(ranking).map((d) => col.getNumber(d)), data.hist.length), data);
    });
  }

  summaryCategoricalStats(col: Column & ISetColumn, render: (summary: ICategoricalStatistics, data: ICategoricalStatistics) => void) {
    const ranking = col.findMyRanker()!.getOrder();
    this.dataCategoricalStats(col, (data) => {
      render(computeHist(this.byOrder(ranking).map((d) => col.getSet(d)), col.categories), data);
    });
  }

  summaryDateStats(col: Column & IDateColumn, render: (summary: IDateStatistics, data: IDateStatistics) => void) {
    const ranking = col.findMyRanker()!.getOrder();
    this.dataDateStats(col, (data) => {
      render(computeDateStats(this.byOrder(ranking).map((d) => col.getDate(d)), data), data);
    });
  }


  dataBoxPlotStats(col: Column & INumberColumn, render: (data: IAdvancedBoxPlotData & IStatistics) => void) {
    this.dataNumberStats(col, render);
  }

  dataNumberStats(col: Column & INumberColumn, render: (data: IAdvancedBoxPlotData & IStatistics) => void) {
    if (this.dataCache.has(col.id)) {
      render(this.dataCache.get(col.id)!);
      return;
    }
    const s = computeNormalizedStats(lazySeq(this.data).map((d) => col.getNumber(d)));
    this.dataCache.set(col.id, s);
    render(s);
  }

  dataCategoricalStats(col: Column & ISetColumn, render: (data: ICategoricalStatistics) => void) {
    if (this.dataCache.has(col.id)) {
      render(this.dataCache.get(col.id)!);
      return;
    }
    const s = computeHist(lazySeq(this.data).map((d) => col.getSet(d)), col.categories);
    this.dataCache.set(col.id, s);
    render(s);
  }

  dataDateStats(col: Column & IDateColumn, render: (data: IDateStatistics) => void) {
    if (this.dataCache.has(col.id)) {
      return render(this.dataCache.get(col.id)!);
    }
    const s = computeDateStats(lazySeq(this.data).map((d) => col.getDate(d)));
    this.dataCache.set(col.id, s);
    render(s);
  }

}
