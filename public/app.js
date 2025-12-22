const helloOutput = document.querySelector("#hello-output");
const dbOutput = document.querySelector("#db-output");
const helloBtn = document.querySelector("#refresh-hello");
const dbBtn = document.querySelector("#refresh-db");

const setStatus = (node, status, text) => {
  node.classList.remove("success", "error");
  if (status === "success") node.classList.add("success");
  if (status === "error") node.classList.add("error");
  node.textContent = text;
};

const fetchJSON = async (url, target) => {
  setStatus(target, null, "Loading…");
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const payload = await response.json();
    setStatus(target, "success", JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error(`Failed to fetch ${url}`, error);
    setStatus(target, "error", error.message);
  }
};

helloBtn.addEventListener("click", () => fetchJSON("/api/hello", helloOutput));
dbBtn.addEventListener("click", () => fetchJSON("/db-check", dbOutput));

// Auto-load values on first paint
fetchJSON("/api/hello", helloOutput);
fetchJSON("/db-check", dbOutput);
