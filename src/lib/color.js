/**
 * 색 유틸.
 * tint(color, percent): 주어진 색을 percent%만 남기고 투명하게 섞는다.
 * `${color}22`처럼 hex 뒤에 알파를 이어 붙이던 방식은 color가 var(--x)일 때 깨지므로
 * CSS color-mix를 쓴다. hex, rgb(), var() 어느 값이 와도 동작한다.
 */
export function tint(color, percent) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
