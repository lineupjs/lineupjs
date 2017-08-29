import {offset} from '../utils';
import {behavior, event as d3event, select, Selection} from 'd3';


abstract class ADialog {

  protected static readonly visiblePopups: Selection<any>[] = [];

  private static removeAllPopups() {
    ADialog.visiblePopups.splice(0, ADialog.visiblePopups.length).forEach((d) => {
      d.remove();
    });
  }

  protected static registerPopup($popup: Selection<any>) {
    ADialog.removeAllPopups();
    ADialog.visiblePopups.push($popup);
  }

  constructor(readonly attachment: Selection<any>, private readonly title: string) {
  }

  abstract openDialog(): void;

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
        left: `${pos.left}px`,
        top: `${pos.top}px`
      }).html(this.dialogForm(body));

    function movePopup(this: Element) {
      //.style("left", (this.parentElement.offsetLeft + (<any>event).dx) + 'px')
      //.style("top", (this.parentElement.offsetTop + event.dy) + 'px');
      //const mouse = d3.mouse(this.parentElement);
      $popup.style({
        left: `${this.parentElement!.offsetLeft + (<any>d3event).dx}px`,
        top: `${this.parentElement!.offsetTop + (<any>d3event).dy}px`
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
    ADialog.registerPopup($popup);
    return $popup;
  }

  makeChoosePopup(body: string) {
    const pos = offset(<Element>this.attachment.node());
    const $popup = select('body').append('div')
      .attr({
        'class': 'lu-popup2 chooser'
      }).style({
        left: `${pos.left}px`,
        top: `${pos.top}px`
      }).html(this.basicDialog(body));

    ADialog.registerPopup($popup);
    return $popup;
  }

  dialogForm(body: string, addCloseButtons: boolean = true) {
    return `<span style="font-weight: bold" class="lu-popup-title">${this.title}</span>
            <form onsubmit="return false">
                ${body}
                ${addCloseButtons ?
      '<button type = "submit" class="ok fa fa-check" title="ok"></button>' +
      '<button type = "reset" class="cancel fa fa-times" title="cancel">' +
      '</button><button type = "button" class="reset fa fa-undo" title="reset"></button></form>' : ''}
            </form>`;
  }

  protected onButton($popup: Selection<any>, handler: { submit: () => boolean, reset: () => void, cancel: () => void }) {
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

  hidePopupOnClickOutside(rendererContent: Selection<any>) {
    //clean up old
    select('body').on('click', function (this: HTMLElement) {
      const target = (<MouseEvent>d3event).target;
      // is none of the content element clicked?
      const outside = rendererContent.filter(function (this: Element) {
        return this === target;
      }).empty();
      if (outside) {
        //delete all
        ADialog.removeAllPopups();
        select(this).on('click', null!);
      }
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
