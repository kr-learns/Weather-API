// public/script.js

function isValidInput(city) {
  // Accepts letters (including accented), spaces, apostrophes, periods, and hyphens
  const cityRegex = /^[\p{L}\s.'-]{2,}$/u;
  return cityRegex.test(city.trim());
}

function fetchWeatherData(city) {
  return fetch(`/weather/${encodeURIComponent(city)}`).then(
    async (response) => {
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Something went wrong");
      }
      return response.json();
    },
  );
}

function addToRecentSearches(city) {
  try {
    const stored = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    const updated = [city, ...stored.filter((c) => c !== city)].slice(0, 5);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to access localStorage:", e);
  }
}

function init() {
  const form = document.getElementById("weather-form");
  const input = document.getElementById("city");
  const errorDiv = document.getElementById("city-error");
  const resultDiv = document.getElementById("weather-data");

  document.getElementById("submit-btn").addEventListener("click", async (e) => {
    e.preventDefault();
    const city = input.value.trim();

    if (!isValidInput(city)) {
      errorDiv.textContent = "Please enter a valid city name.";
      resultDiv.textContent = "";
      return;
    }

    try {
      const data = await fetchWeatherData(city);
      resultDiv.textContent = `${data.temperature}, ${data.condition}`;
      errorDiv.textContent = "";
      addToRecentSearches(city);
    } catch (err) {
      errorDiv.textContent = err.message;
      resultDiv.textContent = "";
    }
  });
}

// Only export if running in a test (CommonJS)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    isValidInput,
    fetchWeatherData,
    addToRecentSearches,
    init,
  };
}
