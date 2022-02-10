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
export const SELECTED_COLOR = getStyle('lu_selected_color', '#ffa500');
/** @internal */
export const COLUMN_PADDING = Number.parseInt(getStyle('lu_engine_grip_gap', '5px'), 10);
/** @internal */
export const FILTERED_OPACITY = Number.parseFloat(getStyle('lu_filtered_opacity', '0.2'));
/** @internal */
export const DASH = {
  width: Number.parseInt(getStyle('lu_missing_dash_width', '2px'), 10),
  height: Number.parseInt(getStyle('lu_missing_dash_height', '10px'), 10),
  color: getStyle('lu_missing_dash_color', '#dbdbdb'),
};
/** @internal */
export const UPSET = {
  color: getStyle('lu_renderer_upset_color'),
  inactive: Number.parseFloat(getStyle('lu_renderer_upset_inactive_opacity', '0.1')),
};
/** @internal */
export const DOT = {
  color: getStyle('lu_renderer_dot_color', 'gray'),
  size: Number.parseInt(getStyle('lu_renderer_dot_size', '5px'), 10),
  opacity: Number.parseFloat(getStyle('lu_renderer_dot_opacity', '0.5')),
  opacitySingle: Number.parseFloat(getStyle('lu_renderer_dot_opacity', '1')),
};
/** @internal */
export const TICK = {
  color: getStyle('lu_renderer_tick_color', 'gray'),
  size: Number.parseInt(getStyle('lu_renderer_tick_size', '3px'), 10),
  opacity: Number.parseFloat(getStyle('lu_renderer_tick_opacity', '1')),
};
/** @internal */
export const BOX_PLOT = {
  box: getStyle('lu_renderer_boxplot_box', '#e0e0e0'),
  stroke: getStyle('lu_renderer_boxplot_stroke', 'black'),
  sort: getStyle('lu_renderer_boxplot_sort_indicator', '#ffa500'),
  outlier: getStyle('lu_renderer_boxplot_outlier', '#e0e0e0'),
};
/** @internal */
export const AGGREGATE = {
  width: Number.parseInt(getStyle('lu_aggregate_square_bracket_width', '4px'), 10),
  strokeWidth: Number.parseInt(getStyle('lu_aggregate_square_bracket_stroke_width', '2px'), 10),
  color: getStyle('lu_aggregate_square_bracket_stroke_color', '#000'),
  levelOffset: Number.parseInt(getStyle('lu_aggregate_level_offset', '2px'), 10),
  levelWidth: Number.parseInt(getStyle('lu_aggregate_level_width', '22px'), 10),
};
/** @internal */
export const SLOPEGRAPH_WIDTH = Number.parseInt(getStyle('lu_slope_width', '200px'), 10);
/** @internal */
export const CANVAS_HEIGHT = 4;

/** @internal */
export const CSS_PREFIX = getStyle('lu_css_prefix', 'lu');
/** @internal */
export const ENGINE_CSS_PREFIX = 'le';

/** @internal */
export const RESIZE_SPACE = Number.parseInt(getStyle('lu_engine_resize_space', '50px'), 10);
/** @internal */
export const RESIZE_ANIMATION_DURATION = Number.parseInt(getStyle('lu_engine_resize_animation_duration', '1000ms'), 10);

/** @internal */
export const AGGREGATION_LEVEL_WIDTH = Number.parseInt(getStyle('lu_aggregate_level_width', '22px'), 10);

/** @internal */
export function cssClass(suffix?: string) {
  return suffix ? `${CSS_PREFIX}-${suffix}` : CSS_PREFIX;
}
/** @internal */
export function engineCssClass(suffix?: string) {
  return suffix ? `${ENGINE_CSS_PREFIX}-${suffix}` : ENGINE_CSS_PREFIX;
}

/** @internal */
export function aria(text: string) {
  return `<span class="${cssClass('aria')}" aria-hidden="true">${text}</span>`;
}
