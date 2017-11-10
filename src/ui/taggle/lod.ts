export const GROUP_SPACING = 5;

export function levelOfDetailInner(height: number): 'high' | 'medium' | 'low' {
  if (height >= 35) {
    return 'high';
  }
  if (height >= 15) {
    return 'medium';
  }
  return 'low';
}

export function levelOfDetailLeaf(height: number): 'high' | 'medium' | 'low' {
  if (height >= 18) {
    return 'high';
  }
  if (height >= 10) {
    return 'medium';
  }
  return 'low';
}
