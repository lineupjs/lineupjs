import ScriptColumn from '../../model/ScriptColumn';
import ADialog, {IDialogContext} from './ADialog';
//
// const help = `<div class="script-description">
//       <p>You can write any valid JavaScript code. It will be embedded in a function. Therefore the last statement has to return a value.
//       In case of a single line statement the code piece statement <code>return</code> will be automatically prefixed.</p>
//       <p>The function signature is: <br><code>(row: any, index: number, children: Column[], values: any[], raws: (number|null)[]) => number</code>
//       <dl>
//         <dt>param: <code>row</code></dt>
//         <dd>the row in the dataset to compute the value for</dd>
//         <dt>param: <code>index</code></dt>
//         <dd>the index of the row</dd>
//         <dt>param: <code>children</code></dt>
//         <dd>the list of LineUp columns that are part of this ScriptColumn</dd>
//         <dt>param: <code>values</code></dt>
//         <dd>the computed value of each column (see <code>children</code>) for the current row</dd>
//         <dt>param: <code>raws</code></dt>
//         <dd>similar to <code>values</code>. Numeric columns return by default the normalized value, this array gives access to the original "raw" values before mapping is applied</dd>
//         <dt>returns:</dt>
//         <dd>the computed number <strong>in the range [0, 1] or NaN</strong></dd>
//       </dl>
//       <p>In addition to the standard JavaScript functions and objects (Math, ...) a couple of utility functions are available: </p>
//       <dl>
//         <dt><code>max(arr: number[]) => number</code></dt>
//         <dd>computes the maximum of the given array of numbers</dd>
//         <dt><code>min(arr: number[]) => number</code></dt>
//         <dd>computes the minimum of the given array of numbers</dd>
//         <dt><code>extent(arr: number[]) => [number, number]</code></dt>
//         <dd>computes both minimum and maximum and returning an array with the first element the minimum and the second the maximum</dd>
//         <dt><code>clamp(v: number, min: number, max: number) => number</code></dt>
//         <dd>ensures that the given value is within the given min/max value</dd>
//         <dt><code>normalize(v: number, min: number, max: number) => number</code></dt>
//         <dd>normalizes the given value <code>(v - min) / (max - min)</code></dd>
//         <dt><code>denormalize(v: number, min: number, max: number) => number</code></dt>
//         <dd>inverts a normalized value <code>v * (max - min) + min</code></dd>
//         <dt><code>linear(v: number, input: [number, number], output: [number, number]) => number</code></dt>
//         <dd>performs a linear mapping from input domain to output domain both given as an array of [min, max] values. <code>denormalize(normalize(v, input[0], input[1]), output[0], output[1])</code></dd>
//       </dl>
//       </div>`;

/** @internal */
export default class ScriptEditDialog extends ADialog {
  private readonly before: string;

  constructor(private readonly column: ScriptColumn, dialog: IDialogContext) {
    super(dialog, {
      fullDialog: true
    });
    this.before = column.getScript();
  }

  protected build(node: HTMLElement) {
    node.insertAdjacentHTML('beforeend', `<textarea autofocus="true" rows="5" autofocus="autofocus" style="width: 95%;">${this.column.getScript()}</textarea>`);
  }

  protected reset() {
    this.node.querySelector('textarea')!.value = this.before;
    this.column.setScript(this.before);
  }

  protected submit() {
    this.column.setScript(this.node.querySelector('textarea')!.value);
    return true;
  }
}
