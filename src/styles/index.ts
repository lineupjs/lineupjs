import * as vars from 'raw-loader!./_vars.scss';

const styles = new Map<string, string>();
{
  const r = /^[$]([\w]+): ([\w #.()'\/,-]+)( !default)?;/gmi;
  const s = String(vars);

  let m: RegExpMatchArray | null = s.match(r);
  while (m != null) {
    styles.set(m[1], m[2]);
    m = s.match(r);
  }
}

export default function getStyle(key: string, defaultValue = '') {
  if (styles.has(key)) {
    return styles.get(key)!;
  }
  return defaultValue;
}


export const COLUMN_PADDING = parseInt(getStyle('lu_engine_grip_gap', '5px'), 10);

export const DASH = {
  width: parseInt(getStyle('lu_missing_dash_width', '3px'), 10),
  height: parseInt(getStyle('lu_missing_dash_height', '10px'), 10),
  color: getStyle('lu_missing_dash_color', 'gray')
};

export const UPSET = {
  circle: getStyle('lu_renderer_upset_circle_color'),
  inactive: parseFloat(getStyle('lu_renderer_upset_inactive_opacity', '0.1')),
  stroke: getStyle('lu_renderer_upset_stroke')
};

export const DOT = {
  color: getStyle('lu_renderer_dot_color', 'gray'),
  size: parseInt(getStyle('$lu_renderer_dot_size', '5px'), 10),
  opacity: parseFloat(getStyle('$lu_renderer_dot_opacity', '0.7'))
};

export const SLOPEGRAPH_WIDTH = 200;
export const CANVAS_HEIGHT = 1;
