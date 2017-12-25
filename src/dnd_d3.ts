/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {event as d3event, select, Selection} from 'd3';

/**
 * checks whether the given DragEvent has one of the given types
 * @param {DragEvent} e event to check
 * @param {string[]} typesToCheck mime types to check
 * @return {boolean} has any mime to check mime types
 */
export function hasDnDType(e: DragEvent, typesToCheck: string[]) {
  const types: any = e.dataTransfer.types;
  if (typeof types.indexOf === 'function') {
    return typesToCheck.some((type) => types.indexOf(type) >= 0);
  }
  if (typeof types.includes === 'function') {
    return typesToCheck.some((type) => types.includes(type));
  }
  if (typeof types.contains === 'function') {
    return typesToCheck.some((type) => types.contains(type));
  }
  return false;
}

/**
 * helper storage for dnd in edge since edge doesn't support custom mime-types
 * @type {Map<string, {[p: string]: string}>}
 */
const dndTransferStorage = new Map<string, { [key: string]: string }>();

function isEdgeDnD(e: DragEvent) {
  return dndTransferStorage.size > 0 && hasDnDType(e, ['text/plain']);
}


/**
 * should it be a copy dnd operation?
 * @param {DragEvent} e event to check
 * @return {boolean} whether it is a copy drag event
 */
export function copyDnD(e: DragEvent) {
  const dT = e.dataTransfer;
  return (e.ctrlKey && dT.effectAllowed.match(/copy/gi) != null) || (dT.effectAllowed.match(/move/gi) == null);
}

/**
 * updates the drop effect according to the currently selected meta keys
 * @param {DragEvent} e event to update
 */
export function updateDropEffect(e: DragEvent) {
  const dT = e.dataTransfer;
  if (copyDnD(e)) {
    dT.dropEffect = 'copy';
  } else {
    dT.dropEffect = 'move';
  }
}

export function dragAble<T extends { id: string }>(onDragStart: (d: T) => { effectAllowed: 'none' | 'copy' | 'copyLink' | 'copyMove' | 'link' | 'linkMove' | 'move' | 'all', data: { [key: string]: string } }) {
  return ($node: Selection<T>) => {
    $node.on('dragstart', (d) => {
      const e = <DragEvent>(<any>d3event);
      const payload = onDragStart(d);
      e.dataTransfer.effectAllowed = payload.effectAllowed;

      const keys = Object.keys(payload.data);
      const allSucceded = keys.every((k) => {
        try {
          e.dataTransfer.setData(k, payload.data[k]);
          return true;
        } catch (e) {
          return false;
        }
      });
      if (allSucceded) {
        return;
      }
      //compatibility mode for edge
      const text = payload.data['text/plain'] || '';
      e.dataTransfer.setData('text/plain', `${d.id}${text ? `: ${text}` : ''}`);
      dndTransferStorage.set(d.id, payload.data);
    }).on('dragend', (d) => {
      if (dndTransferStorage.size > 0) {
        //clear the id
        dndTransferStorage.delete(d.id);
      }
    });
  };
}

/**
 * returns a d3 callable function to make an element dropable, managed the class css 'drag_over' for hovering effects
 * @param mimeTypes the mime types to be dropable
 * @param onDrop: handler when an element is dropped
 */
export function dropAble<T>(mimeTypes: string[], onDrop: (data: any, d: T, copy: boolean) => boolean) {
  return ($node: d3.Selection<any>) => {
    $node.on('dragenter', function (this: HTMLElement) {
      const e = <DragEvent>(<any>d3event);
      //var xy = mouse($node.node());
      if (hasDnDType(e, mimeTypes) || isEdgeDnD(e)) {
        select(this).classed('drag_over', true);
        //sounds good
        return false;
      }
      //not a valid mime type
      select(this).classed('drag_over', false);
      return;
    }).on('dragover', function (this: HTMLElement) {
      const e = <DragEvent>(<any>d3event);
      if (hasDnDType(e, mimeTypes) || isEdgeDnD(e)) {
        e.preventDefault();
        updateDropEffect(e);
        select(this).classed('drag_over', true);
        return false;
      }
      return;
    }).on('dragleave', function (this: HTMLElement) {
      //
      select(this).classed('drag_over', false);
    }).on('drop', function (this: HTMLElement, d: T) {
      const e = <DragEvent>(<any>d3event);
      e.preventDefault();
      select(this).classed('drag_over', false);
      //var xy = mouse($node.node());
      if (isEdgeDnD(e)) {
        const base = e.dataTransfer.getData('text/plain');
        const id = base.indexOf(':') >= 0 ? base.substring(0, base.indexOf(':')) : base;
        if (dndTransferStorage.has(id)) {
          const data = dndTransferStorage.get(id);
          dndTransferStorage.delete(id);
          return onDrop(data, d, copyDnD(e));
        }
      }
      if (hasDnDType(e, mimeTypes)) {
        const data: any = {};
        //selects the data contained in the data transfer
        mimeTypes.forEach((mime) => {
          const value = e.dataTransfer.getData(mime);
          if (value !== '') {
            data[mime] = value;
          }
        });
        return onDrop(data, d, copyDnD(e));
      }
      return;
    });
  };
}

