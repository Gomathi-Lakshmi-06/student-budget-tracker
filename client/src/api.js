const API_BASE_URL = (
  process.env.REACT_APP_API_URL ||
  "https://student-budget-tracker-6uv1.onrender.com"
).replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const entriesApi = {
  getEntries: () => request("/api/entries"),
  createEntry: (entry) => request("/api/entries", {
    method: "POST",
    body: JSON.stringify(entry),
  }),
  deleteEntry: (id) => request(`/api/entries/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }),
};

export { API_BASE_URL };
