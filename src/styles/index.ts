
const styles = new Map<string, string>();
// {
//   const r = /^[$]([\w]+): ([\w #.()'\/,-]+)( !default)?;/gmi;
//   const s = String(vars);

//   let m: RegExpMatchArray | null = r.exec(s);
//   while (m != null) {
//     styles.set(m[1], m[2]);
//     m = r.exec(s);
//   }
// }

/** @internal */
export default function getStyle(key: string, defaultValue = '') {
  if (key[0] === '$') {
    key = key.slice(1);
  }
  if (styles.has(key)) {
    return styles.get(key)!;
  }
  return defaultValue;
}

/** @internal */
export const COLUMN_PADDING = parseInt(getStyle('lu_engine_grip_gap', '5px'), 10);
/** @internal */
export const FILTERED_OPACITY = parseFloat(getStyle('lu_filtered_opacity', '0.2'));
/** @internal */
export const DASH = {
  width: parseInt(getStyle('lu_missing_dash_width', '3px'), 10),
  height: parseInt(getStyle('lu_missing_dash_height', '10px'), 10),
  color: getStyle('lu_missing_dash_color', 'gray')
};
/** @internal */
export const UPSET = {
  color: getStyle('lu_renderer_upset_color'),
  inactive: parseFloat(getStyle('lu_renderer_upset_inactive_opacity', '0.1'))
};
/** @internal */
export const DOT = {
  color: getStyle('lu_renderer_dot_color', 'gray'),
  size: parseInt(getStyle('lu_renderer_dot_size', '5px'), 10),
  opacity: parseFloat(getStyle('lu_renderer_dot_opacity', '0.5'))
};
/** @internal */
export const BOX_PLOT = {
  box: getStyle('lu_renderer_boxplot_box', '#e0e0e0'),
  stroke: getStyle('lu_renderer_boxplot_stroke', 'black'),
  sort: getStyle('lu_renderer_boxplot_sort_indicator', '#ffa500'),
  outlier: getStyle('lu_renderer_boxplot_outlier', '#e0e0e0')
};
/** @internal */
export const AGGREGATE = {
  width: parseInt(getStyle('lu_aggregate_square_bracket_width', '4px'), 10),
  strokeWidth: parseInt(getStyle('lu_aggregate_square_bracket_stroke_width', '2px'), 10),
  color: getStyle('lu_aggregate_square_bracket_stroke_color', '#000'),
  levelOffset: parseInt(getStyle('lu_aggregate_level_offset', '2px'), 10),
  levelWidth: parseInt(getStyle('lu_aggregate_level_width', '22px'), 10)
};
/** @internal */
export const SLOPEGRAPH_WIDTH = parseInt(getStyle('lu_slope_width', '200px'), 10);
/** @internal */
export const CANVAS_HEIGHT = 4;

/** @internal */
export const CSS_PREFIX = getStyle('lu_css_prefix', 'lu');
/** @internal */
export const ENGINE_CSS_PREFIX = 'le';

/** @internal */
export function cssClass(suffix?: string) {
  return suffix? `${CSS_PREFIX}-${suffix}` : CSS_PREFIX;
}
/** @internal */
export function engineCssClass(suffix?: string) {
  return suffix? `${ENGINE_CSS_PREFIX}-${suffix}` : ENGINE_CSS_PREFIX;
}

/** @internal */
export function aria(text: string) {
  return `<span class="${cssClass('aria')}" aria-hidden="true">${text}</span>`;
}
