const viewerLanguage = document.documentElement.lang;
const viewerLabels = {
  ja: { open: "画面を拡大", close: "閉じる" },
  en: { open: "Enlarge screen", close: "Close" },
  ko: { open: "화면 확대", close: "닫기" },
}[viewerLanguage] || { open: "Enlarge screen", close: "Close" };
const imageDialog = document.createElement("dialog");
imageDialog.className = "image-dialog";
imageDialog.setAttribute("aria-label", viewerLabels.open);
const dialogClose = document.createElement("button");
dialogClose.type = "button";
dialogClose.className = "dialog-close";
dialogClose.textContent = "×";
dialogClose.setAttribute("aria-label", viewerLabels.close);
const dialogImages = document.createElement("div");
dialogImages.className = "dialog-images";
imageDialog.append(dialogClose, dialogImages);
document.body.append(imageDialog);
dialogClose.addEventListener("click", () => imageDialog.close());
imageDialog.addEventListener("click", (event) => {
  if (event.target !== imageDialog) return;
  const bounds = imageDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) imageDialog.close();
});
const screenFigures = document.querySelectorAll(".experience-screen figure, .interface-gallery figure, .visual-band, .feature-media, .navigation-after-shot, figure.project-hero-visual, .product-shot, .design-system-shot");
screenFigures.forEach((figure) => {
  const images = [...figure.querySelectorAll("img")];
  if (!images.length) return;
  figure.classList.add("zoom-surface");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "screen-zoom";
  button.title = viewerLabels.open;
  button.setAttribute("aria-label", `${viewerLabels.open}: ${images[0].alt}`);
  button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  button.addEventListener("click", () => {
    dialogImages.replaceChildren(...images.map((source) => {
      const image = document.createElement("img");
      image.src = source.currentSrc || source.src;
      image.alt = source.alt;
      return image;
    }));
    imageDialog.showModal();
  });
  figure.append(button);
});
