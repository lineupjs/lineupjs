import {offset} from '../utils';
import {Selection, select, event as d3event, scale as d3scale, behavior} from 'd3';
import * as d3 from 'd3';


abstract class ADialog {

  constructor(private readonly attachment, private readonly title: string) {}

  abstract openDialog();

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
        }).html(this.dialogForm(this.title, body));

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
      }).html(this.sortDialogForm(this.title, body));

    return $popup;

  }

  dialogForm(title: string, body: string, addCloseButtons = true) {
    return `<span style="font-weight: bold" class="lu-popup-title">${title}</span>
            <form onsubmit="return false">
                ${body}
                ${addCloseButtons ?
      '<button type = "submit" class="ok fa fa-check" title="ok"></button>' +
      '<button type = "reset" class="cancel fa fa-times" title="cancel">' +
      '</button><button type = "button" class="reset fa fa-undo" title="reset"></button></form>' : ''}
            </form>`;
  }

  sortDialogForm(title: string, body: string) {
    return this.dialogForm(title, body, false);
  }

  hidePopupOnClickOutside(popup: d3.Selection<any>, rendererContent: d3.Selection<any>) {
    d3.select('body').on('click', function () {
      const target = (<MouseEvent>d3.event).target;
      // is none of the content element clicked?
      const outside = rendererContent.filter(function () {
        return this === target;
      }).empty();
      if (outside) {
        popup.remove();
        d3.select(this).on('click', null);
      }
    });
  }
}

export default ADialog;
