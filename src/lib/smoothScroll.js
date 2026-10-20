/**
 * smoothScroll
 * ------------
 * anchor href 클릭 시 부드럽게 스크롤합니다.
 *
 * 사용법:
 *   <a href="#agents" onClick={smoothScroll("#agents")}>기능</a>
 */
export function smoothScroll(id) {
  return (e) => {
    e.preventDefault();
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };
}
