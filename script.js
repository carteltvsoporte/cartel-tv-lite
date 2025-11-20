const CONFIG = {
  TMDB_API_KEY: 'cdf9b6a0255cebc133ce4d9aaaee8d6d',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMG_BASE_URL: 'https://image.tmdb.org/t/p/w300', // Reducida calidad de imagen
  ACCESS_CODE: 'TV2025',
  VIEW_LIMIT: 5, // Cambiado de 3 a 5
  TIME_LIMIT: 30 * 60 * 1000 // 30 minutos en milisegundos (cambiado de 15 a 30)
};

const State = {
  currentType: 'popular_movies', // Cambiado a popular_movies por defecto
  viewCount: parseInt(localStorage.getItem('ctvl_view_count') || '0'),
  lastViewTime: parseInt(localStorage.getItem('ctvl_last_view_time') || '0'),
  isOnline: navigator.onLine,
  premiumPromoShown: parseInt(localStorage.getItem('ctvl_premium_promo_shown') || '0'),
  captchaVerified: localStorage.getItem('ctvl_captcha_verified') === 'true'
};

// Inicialización de la aplicación
function initApp() {
  setupPremiumModal();
  setupCaptchaModal();
  setupNotifications();
  setupFilters();
  setupPremiumButtons();
  updateUsageCounter();
  
  const loadBtn = document.getElementById('load-btn');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      if (!State.captchaVerified) {
        showCaptchaModal();
      } else {
        loadContent();
      }
    });
  }
  
  // Mostrar promoción premium después de cierto uso
  if (State.viewCount >= 1 && State.premiumPromoShown === 0) {
    setTimeout(() => {
      showPremiumPromo();
    }, 2000);
  }
  
  // Actualizar contador de tiempo cada minuto
  setInterval(updateUsageCounter, 60000);
}

// Configuración del modal premium
function setupPremiumModal() {
  const premiumModal = document.getElementById('premium-modal');
  const premiumLink = document.getElementById('premium-link');
  const continueLite = document.getElementById('continue-lite');
  
  const hasSeenModal = localStorage.getItem('ctvl_seen_modal');
  if (hasSeenModal === 'true') {
    premiumModal.classList.add('hidden');
    return;
  }
  
  premiumLink.addEventListener('click', () => {
    redirectToPremium();
  });
  
  continueLite.addEventListener('click', () => {
    localStorage.setItem('ctvl_seen_modal', 'true');
    premiumModal.classList.add('hidden');
    // Incrementar contador de promoción vista
    State.premiumPromoShown++;
    localStorage.setItem('ctvl_premium_promo_shown', State.premiumPromoShown.toString());
  });
}

// Configuración del modal CAPTCHA
function setupCaptchaModal() {
  const captchaModal = document.getElementById('captcha-modal');
  const captchaSubmit = document.getElementById('captcha-submit');
  const captchaInput = document.getElementById('captcha-input');
  
  // Generar CAPTCHA inicial
  generateCaptcha();
  
  captchaSubmit.addEventListener('click', verifyCaptcha);
  
  captchaInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      verifyCaptcha();
    }
  });
}

// Generar texto CAPTCHA
function generateCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let captcha = '';
  for (let i = 0; i < 5; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Guardar CAPTCHA en el estado
  State.currentCaptcha = captcha;
  
  // Mostrar CAPTCHA
  const captchaText = document.getElementById('captcha-text');
  if (captchaText) {
    captchaText.textContent = captcha;
  }
}

// Verificar CAPTCHA
function verifyCaptcha() {
  const captchaInput = document.getElementById('captcha-input');
  const userInput = captchaInput.value.trim().toUpperCase();
  
  if (userInput === State.currentCaptcha) {
    State.captchaVerified = true;
    localStorage.setItem('ctvl_captcha_verified', 'true');
    
    const captchaModal = document.getElementById('captcha-modal');
    captchaModal.classList.add('hidden');
    
    showNotification('Verificación exitosa', 2000);
    
    // Cargar contenido después de verificación
    setTimeout(() => loadContent(), 500);
  } else {
    showNotification('Código incorrecto. Intenta nuevamente.', 3000, 'warning');
    captchaInput.value = '';
    generateCaptcha();
  }
}

// Mostrar modal CAPTCHA
function showCaptchaModal() {
  const captchaModal = document.getElementById('captcha-modal');
  const captchaInput = document.getElementById('captcha-input');
  
  generateCaptcha();
  captchaInput.value = '';
  captchaModal.classList.remove('hidden');
}

// Configuración de botones premium
function setupPremiumButtons() {
  const upgradeBtn = document.getElementById('upgrade-btn');
  const premiumSmallBtns = document.querySelectorAll('.btn-premium-small');
  
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', redirectToPremium);
  }
  
  premiumSmallBtns.forEach(btn => {
    btn.addEventListener('click', redirectToPremium);
  });
}

// Redirección a premium
function redirectToPremium() {
  window.location.href = 'https://carteltvsoporte.github.io/ctvp/';
}

// Verificación de límites de uso
function canViewContent() {
  const now = Date.now();
  
  // Si han pasado más de 30 minutos desde la última vista, reiniciar contador
  if (now - State.lastViewTime > CONFIG.TIME_LIMIT) {
    State.viewCount = 0;
    State.lastViewTime = now;
    localStorage.setItem('ctvl_view_count', '0');
    localStorage.setItem('ctvl_last_view_time', now.toString());
    updateUsageCounter();
    return true;
  }
  
  // Si no ha alcanzado el límite de 5 vistas
  if (State.viewCount < CONFIG.VIEW_LIMIT) {
    return true;
  }
  
  return false;
}

// Incrementar contador de vistas
function incrementViewCount() {
  State.viewCount++;
  State.lastViewTime = Date.now();
  localStorage.setItem('ctvl_view_count', State.viewCount.toString());
  localStorage.setItem('ctvl_last_view_time', State.lastViewTime.toString());
  updateUsageCounter();
  
  // Mostrar promoción después de cierto uso
  if (State.viewCount === 3 && State.premiumPromoShown < 2) {
    setTimeout(() => {
      showPremiumPromo();
    }, 1500);
  }
}

// Actualizar contador de uso
function updateUsageCounter() {
  const usageCount = document.getElementById('usage-count');
  const timeLeft = document.getElementById('time-left');
  
  if (!usageCount || !timeLeft) return;
  
  const now = Date.now();
  const timeRemaining = State.lastViewTime + CONFIG.TIME_LIMIT - now;
  
  // Actualizar contador de vistas
  usageCount.textContent = `${State.viewCount}/${CONFIG.VIEW_LIMIT}`;
  
  // Actualizar tiempo restante
  if (State.viewCount >= CONFIG.VIEW_LIMIT && timeRemaining > 0) {
    const minutesLeft = Math.ceil(timeRemaining / 60000);
    timeLeft.textContent = `(espera ${minutesLeft} min)`;
    timeLeft.style.color = '#ef4444';
  } else {
    timeLeft.textContent = '';
  }
}

// Mostrar promoción premium
function showPremiumPromo() {
  State.premiumPromoShown++;
  localStorage.setItem('ctvl_premium_promo_shown', State.premiumPromoShown.toString());
  
  showNotification(
    '¿Cansado de límites? Obtén acceso ilimitado con CTV Premium', 
    5000,
    'premium'
  );
}

// Sistema de notificaciones
function showNotification(message, duration = 3000, type = 'info') {
  const notification = document.getElementById('notification');
  const notificationText = document.getElementById('notification-text');
  
  if (!notification || !notificationText) return;
  
  // Añadir clase de tipo si es necesario
  notification.className = 'notification';
  if (type === 'premium') {
    notification.classList.add('premium-notification');
  }
  
  notificationText.textContent = message;
  notification.classList.remove('hidden');
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.classList.add('hidden'), 300);
  }, duration);
}

function setupNotifications() {
  const closeBtn = document.getElementById('notification-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const notification = document.getElementById('notification');
      notification.classList.remove('show');
      setTimeout(() => notification.classList.add('hidden'), 300);
    });
  }
}

// Filtros de categorías
function setupFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.currentType = btn.dataset.type;
      
      showNotification(`Categoría: ${btn.textContent.trim()}`);
    });
  });
}

// Carga de contenido desde API
async function fetchContentByType(type) {
  let language = 'es-ES';
  let url = '';

  switch (type) {
    case 'popular_movies':
      url = `${CONFIG.BASE_URL}/movie/popular?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`;
      break;
    case 'popular_tv':
      url = `${CONFIG.BASE_URL}/tv/popular?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`;
      break;
    default:
      throw new Error('Tipo no soportado');
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error fetching content for ${type}:`, error);
    throw error;
  }
}

// Renderizado de contenido (sin imágenes)
function renderContent(item) {
  const container = document.getElementById('movie-container');
  if (!container) return;
  
  const title = item.title || item.name;
  const dateField = item.release_date || item.first_air_date;
  const year = dateField?.substring(0, 4) || 'N/A';
  
  // Descripción simplificada
  const overview = item.overview?.trim() || 'Sin descripción disponible.';
  const shortOverview = overview.length > 120 ? overview.substring(0, 120) + '...' : overview;
  
  container.innerHTML = `
    <div class="no-image-placeholder">
      <span>🎬</span>
      <p>Imagen no disponible en versión Lite</p>
    </div>
    <div class="movie-title">${title} (${year})</div>
    <p class="movie-overview">${shortOverview}</p>
    <div class="premium-promo">
      <p>¿Te gusta lo que ves? Disfruta de contenido completo con imágenes</p>
      <button class="btn-premium-small">Obtener Premium</button>
    </div>
    <p class="usage-info">Vistas restantes: ${CONFIG.VIEW_LIMIT - State.viewCount} / ${CONFIG.VIEW_LIMIT}</p>
  `;
  
  // Añadir evento al botón premium
  const premiumBtn = container.querySelector('.btn-premium-small');
  if (premiumBtn) {
    premiumBtn.addEventListener('click', redirectToPremium);
  }
}

// Manejo de errores
function renderError(message) {
  const container = document.getElementById('movie-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="error-content">
      <h3>Error al cargar contenido</h3>
      <p>${message}</p>
      <p class="usage-info">Vistas restantes: ${CONFIG.VIEW_LIMIT - State.viewCount} / ${CONFIG.VIEW_LIMIT}</p>
    </div>
  `;
}

// Límite alcanzado
function renderLimitReached() {
  const container = document.getElementById('movie-container');
  if (!container) return;
  
  const now = Date.now();
  const timeLeft = State.lastViewTime + CONFIG.TIME_LIMIT - now;
  const minutesLeft = Math.ceil(timeLeft / 60000);
  
  container.innerHTML = `
    <div class="limit-reached">
      <h3>Límite de vistas alcanzado</h3>
      <p>Has alcanzado el límite de ${CONFIG.VIEW_LIMIT} contenidos cada 30 minutos.</p>
      <p>Podrás ver más contenido en aproximadamente ${minutesLeft} minutos.</p>
      <div class="premium-promo">
        <p>¿No quieres esperar? Obtén acceso ilimitado ahora</p>
        <button class="btn-premium">Ir a Premium</button>
      </div>
    </div>
  `;
  
  // Añadir evento al botón premium
  const premiumBtn = container.querySelector('.btn-premium');
  if (premiumBtn) {
    premiumBtn.addEventListener('click', redirectToPremium);
  }
}

// Carga principal de contenido
async function loadContent() {
  if (!canViewContent()) {
    renderLimitReached();
    showNotification('Límite de vistas alcanzado. Intenta más tarde.', 4000, 'warning');
    return;
  }

  const btn = document.getElementById('load-btn');
  const container = document.getElementById('movie-container');

  if (btn) btn.disabled = true;
  if (container) container.innerHTML = '<p>Cargando contenido...</p>';

  try {
    const items = await fetchContentByType(State.currentType);
    if (items.length > 0) {
      const randomIndex = Math.floor(Math.random() * items.length);
      renderContent(items[randomIndex]);
      incrementViewCount();
      showNotification('Contenido cargado correctamente', 2000);
    } else {
      renderError('No se encontró contenido en esta categoría');
    }
  } catch (error) {
    console.error('Error al cargar contenido:', error);
    renderError(error.message || 'No se pudo cargar contenido. Verifica tu conexión.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Inicializar aplicación cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', initApp);