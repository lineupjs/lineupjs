import * as vars from 'raw-loader!./_vars.scss';

const styles = new Map<string, string>();
{
  const r = /^[$](lu_)?([\w]+): ([\w #.()'\/,-]+)( !default)?;/gmi;
  const s = String(vars);

  let m: RegExpMatchArray | null = s.match(r);
  while (m != null) {
    styles.set(m[2], m[3]);
    m = s.match(r);
  }
}

export default function getStyle(key: string, defaultValue = '') {
  if (styles.has(key)) {
    return styles.get(key)!;
  }
  return defaultValue;
}


export const COLUMN_PADDING = parseInt(getStyle('engine_grip_gap', '5px'), 10);

export const SLOPEGRAPH_WIDTH = 200;
