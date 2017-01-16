import {offset} from '../utils';
import {Selection, select, event as d3event, behavior} from 'd3';


abstract class ADialog {

  constructor(readonly attachment: Selection<any>, private readonly title: string) {}

  abstract openDialog();

  sortByName(prop: string) {
    return function (a, b) {
      const av = a[prop],
        bv = b[prop];
      if (av.toLowerCase() < bv.toLowerCase()) {
        return -1;
      }
      if (av.toLowerCase() > bv.toLowerCase()) {
        return 1;
      }
      return 0;
    };
  }

  /**
   * creates a simple popup dialog under the given attachment
   * @param attachment
   * @param title
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

  makeSortPopup(body: string) {
    const pos = offset(<Element>this.attachment.node());
    const $popup = select('body').append('div')
      .attr({
        'class': 'lu-popup2'
      }).style({
        left: pos.left + 'px',
        top: pos.top + 'px'
      }).html(this.sortDialogForm(body));

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

  sortDialogForm(body: string) {
    return this.dialogForm(body, false);
  }

  hidePopupOnClickOutside(popup: Selection<any>, rendererContent: Selection<any>) {
    select('body').on('click', function () {
      const target = (<MouseEvent>d3event).target;
      // is none of the content element clicked?
      const outside = rendererContent.filter(function () {
        return this === target;
      }).empty();
      if (outside) {
        popup.remove();
        select(this).on('click', null);
      }
    });
  }
}

export default ADialog;
