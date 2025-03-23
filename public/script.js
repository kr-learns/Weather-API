// Function to log selector failures
function logSelectorFailure(selector) {
    console.error(`Selector failure: ${selector}`);
    alert(`Failed to find element with selector: ${selector}. Please check the selector or update it if the target website has changed.`);
}

// Function to get element by selector with logging
function getElement(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        logSelectorFailure(selector);
    }
    return element;
}

// Update existing code to use getElement function
const form = getElement('#weather-form');
const cityInput = getElement('#city');
const weatherData = getElement('#weather-data');
const submitBtn = getElement('#submit-btn');
const spinner = getElement('.spinner');
const errorElement = getElement('#city-error');

let recentSearches = [];

form.addEventListener('submit', handleSubmit);

function initialize() {
    loadRecentSearches();
    setupServiceWorker();
}

async function handleSubmit(e) {
    e.preventDefault();
    const city = cityInput.value.trim();

    // Clear the previous error message when a new search starts
    clearError();

    if (!isValidInput(city)) {
        showError('Please enter a valid city name (e.g., São Paulo, O\'Fallon).');
        return;
    }

    try {
        toggleLoading(true);
        const data = await fetchWeatherData(city);
        displayWeather(data);
        addToRecentSearches(city);
    } catch (error) {
        showError(error.message);
    } finally {
        toggleLoading(false);
    }
}

async function fetchWeatherData(city) {
    const URL = 'https://weather-api-ex1z.onrender.com';

    try {
        const response = await fetch(`${URL}/api/weather/${city}`);

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.error || 'Failed to fetch weather data';

            if (response.status === 404) {
                throw new Error('City not found. Please enter a valid city name.');
            }

            throw new Error(errorMessage);
        }

        return await response.json();
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error('Network error. Please check your connection and try again.');
        }
        throw new Error(error.message || 'An unexpected error occurred');
    }
}

function toggleLoading(isLoading) {
    submitBtn.disabled = isLoading;
    spinner.classList.toggle('hidden', !isLoading);
}

function displayWeather(data) {
    if (!data || !data.temperature) {
        showError('Failed to retrieve weather data. Please try again.');
        return;
    }

    // Fix the -0 issue for minTemperature
    const minTemperature = parseTemperature(data.minTemperature);

    // Clean the maxTemperature to remove any extra characters after the degree symbol
    const maxTemperature = parseTemperature(data.maxTemperature);

    // Parse humidity and pressure correctly
    const parsedData = parseHumidityPressure(data.humidity, data.pressure);

    // Create the template for displaying weather data
    const template = `
        <div class="weather-card">
            <div class="weather-main">
                <div class="temp-container">
                    <span class="temperature">Temp: ${data.temperature || 'N/A'}</span>
                </div>
            </div>
            <div class="weather-details">
                <p><strong>Date:</strong> ${data.date || 'N/A'}</p>
                <p><strong>Condition:</strong> ${data.condition || 'N/A'}</p>
                <p><strong>Min Temp:</strong> ${`${minTemperature}` || 'N/A'}</p>
                <p><strong>Max Temp:</strong> ${`${maxTemperature}C` || 'N/A'}</p>
                <p><strong>Humidity:</strong> ${parsedData.humidity || 'N/A'}%</p>
                <p><strong>Pressure:</strong> ${parsedData.pressure || 'N/A'}</p>
            </div>
        </div>
    `;

    weatherData.innerHTML = template;
    weatherData.classList.remove('hidden');
}

function isValidInput(city) {
    // Updated regex to support international city names with special characters
    return /^[\p{L}\s'’-]{2,50}$/u.test(city);
}

function showError(message) {
    errorElement.textContent = message;
    errorElement.classList.add('visible');
    weatherData.innerHTML = ''; // Clear previous data

    setTimeout(() => {
        errorElement.classList.remove('visible');
    }, 5000);
}

function clearError() {
    errorElement.textContent = '';
    errorElement.classList.remove('visible');
}

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
}

function addToRecentSearches(city) {
    if (isLocalStorageAvailable()) {
        let recent = JSON.parse(localStorage.getItem('recentSearches')) || [];
        recent = [city, ...recent.filter(c => c !== city)].slice(0, 5);
        localStorage.setItem('recentSearches', JSON.stringify(recent));
    } else {
        recentSearches = [city, ...recentSearches.filter(c => c !== city)].slice(0, 5);
    }
    displayRecentSearches();
}

function displayRecentSearches() {
    const recent = isLocalStorageAvailable()
        ? JSON.parse(localStorage.getItem('recentSearches')) || []
        : recentSearches;
    const list = document.getElementById('recent-list');
    list.innerHTML = recent
        .map(city => `
            <button class="recent-item" data-city="${sanitizeHTML(city)}">
                ${sanitizeHTML(city)}
            </button>`)
        .join('');
    list.style.display = 'flex';
    list.style.flexWrap = 'wrap';

    document.querySelectorAll('.recent-item').forEach(button => {
        button.addEventListener('click', function () {
            cityInput.value = this.dataset.city;  // Set input value to clicked city
            handleSubmit(new Event('submit'));    // Trigger search
        });
    });
}

function loadRecentSearches() {
    displayRecentSearches();
}

function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./sw.js')  // Use relative path for service worker
            .then(() => console.log('Service Worker registered'))
            .catch(err => console.log('SW registration failed:', err));
    }
}

function parseHumidityPressure(humidity, pressure) {
    // Handle if the humidity and pressure are direct numeric values from API
    const parsedHumidity = humidity || "N/A";

    const parsePressure = (rawPressure) => {
        // Convert the raw pressure value to float
        const pressure = parseFloat(rawPressure);

        // If the pressure value seems unusually high (greater than 10000), divide it to normalize it to a realistic range
        if (pressure > 10000) {
            return `${(pressure / 100).toFixed(2)} hPa`;  // Scale it down by dividing by 100
        }

        // If the pressure value is large but not too big, divide by 10 to bring it into a more standard range
        if (pressure > 1000) {
            return `${(pressure / 10).toFixed(2)} hPa`;  // Divide by 10 for pressure within a realistic atmospheric range
        }

        // Otherwise, just return the pressure as is, rounded to the nearest integer
        return `${pressure} Pa`;
    };

    const parsedPressure = parsePressure(pressure);
    return { humidity: parsedHumidity, pressure: parsedPressure };
}

function parseTemperature(temp) {
    if (!temp) return 'N/A';
    // Use regular expression to only capture numbers and the degree symbol (°)
    const match = temp.match(/-?\d+°/);
    return match ? match[0] : 'N/A';
}

// Documentation for updating CSS selectors
/**
 * If the target website changes its structure, the CSS selectors used in this script may need to be updated.
 * To update the selectors:
 * 1. Identify the new structure of the target website.
 * 2. Update the selectors in the getElement function calls.
 * 3. Test the application to ensure the new selectors work correctly.
 */

// Initialize the app
initialize();

export {
    fetchWeatherData,
    isValidInput,
    addToRecentSearches
};