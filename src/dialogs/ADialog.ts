import {offset} from '../utils';
import {Selection, select, event as d3event, behavior} from 'd3';


abstract class ADialog {

  constructor(readonly attachment: Selection<any>, private readonly title: string) {
  }

  abstract openDialog();

  /**
   * creates a simple popup dialog under the given attachment
   * @param body
   * @returns {Selection<any>}
   */
  makePopup(body: string) {
    const pos = offset(<Element>this.attachment.node());
    const $popup = select('body').append('div')
      .attr({
        'class': 'lu-popup2'
      }).style({
        left: pos.left + 'px',
        top: pos.top + 'px'
      }).html(this.dialogForm(body));

    function movePopup() {
      //.style("left", (this.parentElement.offsetLeft + (<any>event).dx) + 'px')
      //.style("top", (this.parentElement.offsetTop + event.dy) + 'px');
      //const mouse = d3.mouse(this.parentElement);
      $popup.style({
        left: (this.parentElement.offsetLeft + (<any>d3event).dx) + 'px',
        top: (this.parentElement.offsetTop + (<any>d3event).dy) + 'px'
      });
    }

    $popup.select('span.lu-popup-title').call(behavior.drag().on('drag', movePopup));
    $popup.on('keydown', () => {
      if ((<KeyboardEvent>d3event).which === 27) {
        $popup.remove();
      }
    });
    const auto = <HTMLInputElement>$popup.select('input[autofocus]').node();
    if (auto) {
      auto.focus();
    }
    return $popup;
  }

  makeChoosePopup(body: string) {
    const pos = offset(<Element>this.attachment.node());
    const $popup = select('body').append('div')
      .attr({
        'class': 'lu-popup2 chooser'
      }).style({
        left: pos.left + 'px',
        top: pos.top + 'px'
      }).html(this.basicDialog(body));

    this.hidePopupOnClickOutside($popup);
    return $popup;

  }

  dialogForm(body: string) {
    return this.basicDialog(body + `<button type = "submit" class="ok fa fa-check" title="ok"></button>
        <button type = "reset" class="cancel fa fa-times" title="cancel"></button>
        <button type = "button" class="reset fa fa-undo" title="reset"></button>`);
  }

  protected onButton($popup: Selection<any>, handler: {submit: ()=>boolean, reset: ()=>void, cancel: ()=>void}) {
    $popup.select('.cancel').on('click', () => {
      handler.cancel();
      $popup.remove();
    });
    $popup.select('.reset').on('click', () => {
      handler.reset();
    });
    $popup.select('.ok').on('click', () => {
      if (handler.submit()) {
        $popup.remove();
      }
    });
  }

  private basicDialog(body: string) {
    return `<span style="font-weight: bold" class="lu-popup-title">${this.title}</span>
            <form onsubmit="return false">
                ${body}
            </form>`;
  }

  private hidePopupOnClickOutside(popup: Selection<any>) {
    const body = select('body');
    popup.on('click', () => {
      // don't bubble up click events within the popup
      (<MouseEvent>d3event).stopPropagation();
    });
    body.on('click', () => {
      // we have a click event which was not in the popup
      popup.remove();
      body.on('click', null);
    });
  }
}

export function sortByProperty(prop: string) {
  return (a: any, b: any) => {
    const av = a[prop],
      bv = b[prop];
    return av.toLowerCase().localeCompare(bv.toLowerCase());
  };
}

export default ADialog;
