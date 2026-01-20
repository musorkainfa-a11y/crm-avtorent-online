// auth.js - Управление аутентификацией пользователей

// Проверяем, есть ли сохраненная сессия
async function checkAuth() {
    try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Ошибка проверки сессии:', error);
            return false;
        }
        
        if (data.session) {
            // Пользователь авторизован
            await handleSuccessfulAuth(data.session.user);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
        return false;
    }
}

// Обработка входа
async function handleLogin() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    
    errorEl.classList.add('hidden');
    
    if (!email || !password) {
        errorEl.textContent = 'Заполните email и пароль';
        errorEl.classList.remove('hidden');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        await handleSuccessfulAuth(data.user);
        hideAuthModal();
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        errorEl.textContent = error.message || 'Ошибка входа';
        errorEl.classList.remove('hidden');
    }
}

// Обработка регистрации
async function handleSignup() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    
    errorEl.classList.add('hidden');
    
    if (!email || !password) {
        errorEl.textContent = 'Заполните email и пароль';
        errorEl.classList.remove('hidden');
        return;
    }
    
    if (password.length < 6) {
        errorEl.textContent = 'Пароль должен быть минимум 6 символов';
        errorEl.classList.remove('hidden');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        
        if (error) throw error;
        
        // Для Supabase требуется подтверждение email
        // Но можно отключить в настройках проекта
        if (data.user?.identities?.length === 0) {
            errorEl.textContent = 'Пользователь с таким email уже существует';
            errorEl.classList.remove('hidden');
        } else {
            alert('Регистрация успешна! Проверьте email для подтверждения (если включено).');
            await handleSuccessfulAuth(data.user);
            hideAuthModal();
        }
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        errorEl.textContent = error.message || 'Ошибка регистрации';
        errorEl.classList.remove('hidden');
    }
}

// Успешная авторизация
async function handleSuccessfulAuth(user) {
    console.log('Пользователь авторизован:', user.email);
    
    // Сохраняем пользователя в Store
    window.AppStore.user = user;
    
    // Показываем информацию о пользователе
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('auth-buttons').classList.add('hidden');
    
    // Загружаем данные пользователя
    const success = await window.AppStore.loadUserData(user.id);
    
    if (success) {
        // Загружаем основное приложение
        loadMainApp();
    }
}

// Выход
async function logout() {
    try {
        await supabase.auth.signOut();
        
        // Сбрасываем Store
        window.AppStore.user = null;
        window.AppStore.cars = [];
        window.AppStore.bookings = [];
        window.AppStore.transactions = [];
        
        // Показываем экран приветствия
        document.getElementById('user-info').classList.add('hidden');
        document.getElementById('auth-buttons').classList.remove('hidden');
        document.getElementById('main-content').innerHTML = `
            <div class="text-center py-20">
                <h2 class="text-2xl font-bold mb-4">Вы вышли из системы</h2>
                <button onclick="showAuthModal()" class="px-6 py-3 bg-blue-500 text-white rounded-lg">
                    Войти снова
                </button>
            </div>
        `;
        
    } catch (error) {
        console.error('Ошибка выхода:', error);
        alert('Ошибка при выходе: ' + error.message);
    }
}

// Загрузка основного приложения
async function loadMainApp() {
    // Здесь будет загружено ваше оригинальное приложение
    // Пока что покажем простое сообщение
    
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="fade-in">
            <div class="flex justify-between items-center mb-8">
                <h2 class="text-2xl font-bold">Ваш автопарк</h2>
                <button class="px-4 py-2 bg-blue-500 text-white rounded-lg">
                    <i class="fas fa-plus mr-2"></i>Добавить авто
                </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6" id="cars-grid">
                <!-- Автомобили будут здесь -->
            </div>
            
            <div class="mt-12">
                <h3 class="text-xl font-bold mb-4">Статистика</h3>
                <div class="grid grid-cols-3 gap-4">
                    <div class="bg-white dark:bg-dark p-4 rounded-xl">
                        <div class="text-sm text-gray-500">Автомобилей</div>
                        <div class="text-2xl font-bold">${window.AppStore.cars.length}</div>
                    </div>
                    <div class="bg-white dark:bg-dark p-4 rounded-xl">
                        <div class="text-sm text-gray-500">Активных броней</div>
                        <div class="text-2xl font-bold">${window.AppStore.bookings.length}</div>
                    </div>
                    <div class="bg-white dark:bg-dark p-4 rounded-xl">
                        <div class="text-sm text-gray-500">Транзакций</div>
                        <div class="text-2xl font-bold">${window.AppStore.transactions.length}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Отображаем автомобили
    renderCars();
}

// Рендер автомобилей
function renderCars() {
    const grid = document.getElementById('cars-grid');
    if (!grid) return;
    
    grid.innerHTML = window.AppStore.cars.map(car => `
        <div class="bg-white dark:bg-dark rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h4 class="font-bold">${car.make} ${car.model}</h4>
                    <div class="text-sm text-gray-500">${car.plate}</div>
                </div>
                <span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">${car.year}</span>
            </div>
            <div class="text-sm text-gray-600 mb-3">
                ${car.mileage ? car.mileage.toLocaleString() + ' км' : 'Пробег не указан'}
            </div>
            <div class="flex justify-between text-sm">
                <span class="text-gray-500">Тариф:</span>
                <span class="font-bold">${car.price1?.toLocaleString()} ₽/сут</span>
            </div>
        </div>
    `).join('');
    
    if (window.AppStore.cars.length === 0) {
        grid.innerHTML = `
            <div class="col-span-3 text-center py-12">
                <div class="text-4xl mb-4">🚗</div>
                <h4 class="text-lg font-bold mb-2">Автомобилей пока нет</h4>
                <p class="text-gray-500 mb-4">Добавьте первый автомобиль в автопарк</p>
                <button class="px-6 py-3 bg-blue-500 text-white rounded-lg">
                    Добавить первый автомобиль
                </button>
            </div>
        `;
    }
}

// Проверяем авторизацию при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
});