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
        showError('❌ Invalid city name. Only letters, spaces, apostrophes, periods, and hyphens are allowed.');
        return;
    }

    try {
        toggleLoading(true);
        const data = await fetchWeatherData(city);

        displayWeather(data);
        addToRecentSearches(city);
    } catch (error) {
        console.error(error);
        showError(error.message);
    } finally {
        toggleLoading(false);
    }
}


async function fetchWeatherData(city) {
    try {
        // First check if city is provided
        if (!city) {
            throw new Error('City parameter is required');
        }

        // Get config with error handling
        const configResponse = await fetch('https://weather-api-ex1z.onrender.com/config');
        if (!configResponse.ok) {
            throw new Error('Failed to load configuration');
        }

        const config = await configResponse.json();
        
        // Check if URL exists in config
        if (!config.API_URL) {
            throw new Error('API URL not configured');
        }

       
       const URL = config.API_URL || 'https://weather-api-ex1z.onrender.com'
        
        // Encode the city name for the URL
        const encodedCity = encodeURIComponent(city);
        
        const response = await fetch(`${URL}/api/weather/${encodedCity}`);
        console.log('response status',response.status)
        if (!response.ok) {
            const contentType = response.headers.get('Content-Type');

            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                const errorMessage = errorData.error || 'Failed to fetch weather data';

                if (response.status === 404) {
                    throw new Error('City not found. Please check the city name.');
                }

                throw new Error(errorMessage);
            } else {
                throw new Error(`Unexpected error: ${response.status} ${response.statusText}`);
            }
        }

        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw new Error(error.message || 'An unexpected error occurred');
    }
}

function toggleLoading(isLoading) {
    weatherBtn.disabled = isLoading;
    searchBtn.disabled = isLoading;
    spinner.classList.toggle('hidden', !isLoading);
}

function displayWeather(data) {
    if (!data || !data.temperature) {
        showError('Failed to retrieve weather data. Please try again.');
        return;
    }

    // Determine emoji based on condition
    let emoji = '';
    const condition = data.condition?.toLowerCase() || '';
    if (condition.includes('sun')) emoji = '☀️';
    else if (condition.includes('rain')) emoji = '🌧️';
    else if (condition.includes('cloud')) emoji = '☁️';
    else if (condition.includes('snow')) emoji = '❄️';
    else if (condition.includes('storm')) emoji = '⛈️';
    else emoji = '🌈';

    // Show emoji at the top
    const weatherIcon = document.getElementById('weather-icon');
    if (weatherIcon) {
        weatherIcon.textContent = emoji;
        weatherIcon.style.display = 'block'; // in case it's hidden
        weatherIcon.classList.remove('hidden');
    }

    // Clear old cards but keep emoji
    Array.from(weatherData.children).forEach(child => {
        if (child.id !== 'weather-icon') child.remove();
    });

    const template = `
        <div class="weather-card">
            <div class="weather-details">
                <p><strong>Temp:</strong> ${sanitizeHTML(data.temperature || 'N/A')}°C</p>
                <p><strong>Date:</strong> ${sanitizeHTML(data.date || 'N/A')}</p>
                <p><strong>Condition:</strong> ${sanitizeHTML(data.condition || 'N/A')}</p>
                <p><strong>Min Temp:</strong> ${sanitizeHTML(data.minTemperature || 'N/A')}°C</p>
                <p><strong>Max Temp:</strong> ${sanitizeHTML(data.maxTemperature || 'N/A')}°C</p>
                <p><strong>Humidity:</strong> ${sanitizeHTML(data.humidity || 'N/A')}%</p>
                <p><strong>Pressure:</strong> ${sanitizeHTML(data.pressure || 'N/A')}</p> 
            </div>
        </div>
    `;

    weatherData.insertAdjacentHTML('beforeend', template);
    weatherData.classList.remove('hidden');
}

function isValidInput(city) {
    // Allow letters, spaces, apostrophes, hyphens, and periods
    return /^[\p{L}\p{M}\s'’.-]{2,50}$/u.test(city);
}

function showError(message) {
    errorElement.textContent = message;
    errorElement.classList.add('visible');

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.classList.add('close-btn');
    closeBtn.setAttribute('aria-label', 'Close error message');
    closeBtn.onclick = () => clearError();

    // Append close button to the error message
    errorElement.innerHTML = '';
    errorElement.appendChild(document.createTextNode(message));
    errorElement.appendChild(closeBtn);


    errorElement.setAttribute('tabindex', '-1');
    errorElement.focus();

    weatherData.innerHTML = ''; // Clear previous data

    // setTimeout(() => { errorElement.classList.remove('visible');
    //     errorElement.removeAttribute('tabindex');
    // }, 5000);
}

function clearError() {
    errorElement.textContent = '';
    errorElement.classList.remove('visible');
}

function sanitizeHTML(str) {
    return DOMPurify.sanitize(str);
}

function isLocalStorageAvailable() {
    try {
        const testKey = '__test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        return true;
    } catch (error) {
        console.warn("⚠️ localStorage not available. Using in-memory fallback.");
        return false;
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
