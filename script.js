document.documentElement.classList.add("js");

const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const projectToggle = document.querySelector("[data-project-toggle]");
const projectCollapse = document.querySelector("[data-project-collapse]");
const projectDetails = document.querySelector("[data-project-details]");
const githubChart = document.querySelector("[data-github-chart]");
const githubFallback = document.querySelector("[data-github-fallback]");
const techIcons = document.querySelectorAll(".tech-icon");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 8);
}

function setMenu(open) {
  if (!menuButton || !mobileNav || !header) {
    return;
  }

  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  mobileNav.dataset.open = String(open);
  header.classList.toggle("menu-open", open);
}

function setProjectDetails(open, source = "main") {
  if (!projectToggle || !projectDetails) {
    return;
  }

  projectDetails.dataset.state = open ? "open" : "closed";
  projectDetails.setAttribute("aria-hidden", String(!open));
  projectToggle.setAttribute("aria-expanded", String(open));

  const label = projectToggle.querySelector("[data-toggle-label]");
  if (label) {
    label.textContent = open ? "상세 내용 접기" : "상세 내용 펼치기";
  }

  if (!open && source === "bottom") {
    projectToggle.focus({ preventScroll: true });
    document.querySelector("#airs-project")?.scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "start"
    });
  }
}

function showGithubFallback() {
  if (!githubChart || !githubFallback) {
    return;
  }

  githubChart.hidden = true;
  githubFallback.hidden = false;
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

menuButton?.addEventListener("click", () => {
  setMenu(menuButton.getAttribute("aria-expanded") !== "true");
});

mobileNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton?.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menuButton.focus();
  }
});

document.addEventListener("click", (event) => {
  if (!header || !(event.target instanceof Node)) {
    return;
  }

  if (!header.contains(event.target) && menuButton?.getAttribute("aria-expanded") === "true") {
    setMenu(false);
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 820) {
    setMenu(false);
  }
});

projectToggle?.addEventListener("click", () => {
  setProjectDetails(projectToggle.getAttribute("aria-expanded") !== "true");
});

projectCollapse?.addEventListener("click", () => setProjectDetails(false, "bottom"));

setProjectDetails(false);

techIcons.forEach((icon) => {
  const hideUnavailableIcon = () => {
    icon.hidden = true;
  };

  icon.addEventListener("error", hideUnavailableIcon, { once: true });
  if (icon.complete && icon.naturalWidth === 0) {
    hideUnavailableIcon();
  }
});

githubChart?.addEventListener("error", showGithubFallback);
if (githubChart?.complete && githubChart.naturalWidth === 0) {
  showGithubFallback();
}
