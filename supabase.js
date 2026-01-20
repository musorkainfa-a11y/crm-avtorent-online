// supabase.js - Подключение к облачной базе данных

// ЗАМЕНИТЕ ЭТИ КЛЮЧИ НА ВАШИ С SUPABASE
const SUPABASE_URL = 'https://ВАШ_ПРОЕКТ.supabase.co';
const SUPABASE_ANON_KEY = 'ВАШ_ANON_KEY';

// Инициализация Supabase клиента
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Глобальный Store для данных (синхронизируется с Supabase)
window.AppStore = {
    user: null,
    cars: [],
    bookings: [],
    transactions: [],
    settings: {
        startingBalance: 0,
        categories: ['Аренда', 'ТО', 'Ремонт', 'Страховка', 'Зарплата', 'Мойка', 'Кредит', 'Прочее', 'Возврат залога'],
        subcategories: ['Запчасти', 'Работа', 'Штрафы', 'Оплата', 'Доплата']
    },
    
    // Загрузка всех данных пользователя
    async loadUserData(userId) {
        try {
            console.log('Загрузка данных для пользователя:', userId);
            
            // Загружаем автомобили
            const { data: cars, error: carsError } = await supabase
                .from('cars')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (carsError) throw carsError;
            this.cars = cars || [];
            
            // Загружаем бронирования
            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select('*')
                .eq('user_id', userId)
                .order('start_date', { ascending: false });
            
            if (bookingsError) throw bookingsError;
            this.bookings = bookings || [];
            
            // Загружаем транзакции
            const { data: transactions, error: transError } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false });
            
            if (transError) throw transError;
            this.transactions = transactions || [];
            
            // Загружаем настройки
            const { data: settings, error: settingsError } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            if (!settingsError && settings) {
                this.settings.startingBalance = settings.starting_balance || 0;
                this.settings.categories = settings.categories || this.settings.categories;
                this.settings.subcategories = settings.subcategories || this.settings.subcategories;
            } else if (settingsError && settingsError.code !== 'PGRST116') {
                // PGRST116 = "не найдено", это нормально для нового пользователя
                throw settingsError;
            }
            
            console.log('Данные загружены:', {
                cars: this.cars.length,
                bookings: this.bookings.length,
                transactions: this.transactions.length
            });
            
            return true;
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            alert('Ошибка загрузки данных: ' + error.message);
            return false;
        }
    },
    
    // Сохранение автомобиля
    async saveCar(carData) {
        try {
            if (!this.user) throw new Error('Пользователь не авторизован');
            
            const carToSave = {
                ...carData,
                user_id: this.user.id,
                updated_at: new Date().toISOString()
            };
            
            // Удаляем лишние поля
            delete carToSave.id;
            
            const { data, error } = await supabase
                .from('cars')
                .upsert(carToSave)
                .select()
                .single();
            
            if (error) throw error;
            
            // Обновляем локальный Store
            const index = this.cars.findIndex(c => c.id === data.id);
            if (index >= 0) {
                this.cars[index] = data;
            } else {
                this.cars.unshift(data);
            }
            
            return data;
        } catch (error) {
            console.error('Ошибка сохранения автомобиля:', error);
            throw error;
        }
    },
    
    // Удаление автомобиля
    async deleteCar(carId) {
        try {
            const { error } = await supabase
                .from('cars')
                .delete()
                .eq('id', carId)
                .eq('user_id', this.user.id);
            
            if (error) throw error;
            
            this.cars = this.cars.filter(c => c.id !== carId);
            return true;
        } catch (error) {
            console.error('Ошибка удаления автомобиля:', error);
            throw error;
        }
    },
    
    // Сохранение бронирования
    async saveBooking(bookingData) {
        try {
            if (!this.user) throw new Error('Пользователь не авторизован');
            
            const bookingToSave = {
                ...bookingData,
                user_id: this.user.id,
                start_date: bookingData.start_date,
                end_date: bookingData.end_date,
                created_at: new Date().toISOString()
            };
            
            delete bookingToSave.id;
            
            const { data, error } = await supabase
                .from('bookings')
                .upsert(bookingToSave)
                .select()
                .single();
            
            if (error) throw error;
            
            // Обновляем локальный Store
            const index = this.bookings.findIndex(b => b.id === data.id);
            if (index >= 0) {
                this.bookings[index] = data;
            } else {
                this.bookings.unshift(data);
            }
            
            return data;
        } catch (error) {
            console.error('Ошибка сохранения бронирования:', error);
            throw error;
        }
    },
    
    // Удаление бронирования
    async deleteBooking(bookingId) {
        try {
            const { error } = await supabase
                .from('bookings')
                .delete()
                .eq('id', bookingId)
                .eq('user_id', this.user.id);
            
            if (error) throw error;
            
            this.bookings = this.bookings.filter(b => b.id !== bookingId);
            return true;
        } catch (error) {
            console.error('Ошибка удаления бронирования:', error);
            throw error;
        }
    },
    
    // Сохранение транзакции
    async saveTransaction(transactionData) {
        try {
            if (!this.user) throw new Error('Пользователь не авторизован');
            
            const transactionToSave = {
                ...transactionData,
                user_id: this.user.id,
                created_at: new Date().toISOString()
            };
            
            delete transactionToSave.id;
            
            const { data, error } = await supabase
                .from('transactions')
                .upsert(transactionToSave)
                .select()
                .single();
            
            if (error) throw error;
            
            // Обновляем локальный Store
            const index = this.transactions.findIndex(t => t.id === data.id);
            if (index >= 0) {
                this.transactions[index] = data;
            } else {
                this.transactions.unshift(data);
            }
            
            return data;
        } catch (error) {
            console.error('Ошибка сохранения транзакции:', error);
            throw error;
        }
    },
    
    // Сохранение настроек
    async saveSettings() {
        try {
            if (!this.user) throw new Error('Пользователь не авторизован');
            
            const settingsToSave = {
                user_id: this.user.id,
                starting_balance: this.settings.startingBalance,
                categories: this.settings.categories,
                subcategories: this.settings.subcategories,
                updated_at: new Date().toISOString()
            };
            
            const { error } = await supabase
                .from('user_settings')
                .upsert(settingsToSave, { onConflict: 'user_id' });
            
            if (error) throw error;
            
            return true;
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
            throw error;
        }
    }
};

// Экспортируем для использования в других файлах
window.supabaseClient = supabase;