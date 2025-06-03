// src/js/ProductsManager.js
// Оптимизированный менеджер товаров с правильной пагинацией и сортировкой

import { showToast, showLoadingIndicator, hideLoadingIndicator } from './utils.js';
import { renderProductsTable } from './renderProducts.js';
import { loadAvailability } from './availability.js';

export class ProductsManager {
    constructor() {
        // Синглтон паттерн
        if (window.__productsManagerInstance) {
            return window.__productsManagerInstance;
        }

        console.log('🚀 Initializing ProductsManager...');
        
        // Состояние
        this.products = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalProducts = 0;
        this.totalPages = 0;
        this.sortColumn = 'relevance';
        this.sortDirection = 'asc';
        this.filters = {};
        this.isLoading = false;
        this.lastSearchQuery = '';
        this.searchDebounceTimer = null;
        
        // Кеш
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 минут
        
        // DOM элементы
        this.elements = {};
        
        window.__productsManagerInstance = this;
    }

    /**
     * Инициализация
     */
    async init() {
        console.log('📋 ProductsManager initializing...');
        
        try {
            // Находим элементы
            this.findElements();
            
            // Восстанавливаем состояние
            this.restoreState();
            
            // Привязываем события
            this.bindEvents();
            
            // Синхронизируем глобальные переменные
            this.syncGlobalVariables();
            
            // Проверяем URL параметры
            this.checkUrlParams();
            
            // Загружаем начальные данные
            await this.loadInitialData();
            
            console.log('✅ ProductsManager initialized');
            
        } catch (error) {
            console.error('❌ ProductsManager init failed:', error);
        }
    }

    /**
     * Поиск DOM элементов
     */
    findElements() {
        // Основные элементы
        this.elements.searchInput = document.getElementById('searchInput');
        this.elements.searchButton = document.getElementById('searchButton');
        this.elements.clearFiltersBtn = document.getElementById('clearFiltersBtn');
        
        // Пагинация
        this.elements.prevBtns = document.querySelectorAll('.prev-btn');
        this.elements.nextBtns = document.querySelectorAll('.next-btn');
        this.elements.pageInputs = document.querySelectorAll('#pageInput, #pageInputBottom');
        this.elements.itemsPerPageSelects = document.querySelectorAll('#itemsPerPageSelect, #itemsPerPageSelectBottom');
        
        // Таблица
        this.elements.productTable = document.querySelector('.product-table');
        this.elements.tbody = document.querySelector('.product-table tbody');
    }

    /**
     * Восстановление состояния из localStorage
     */
    restoreState() {
        const savedState = localStorage.getItem('productsManagerState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                this.currentPage = state.currentPage || 1;
                this.itemsPerPage = state.itemsPerPage || 20;
                this.sortColumn = state.sortColumn || 'relevance';
                this.sortDirection = state.sortDirection || 'asc';
                this.filters = state.filters || {};
                console.log('📦 State restored:', state);
            } catch (e) {
                console.warn('Failed to restore state:', e);
            }
        }
    }

    /**
     * Сохранение состояния
     */
    saveState() {
        const state = {
            currentPage: this.currentPage,
            itemsPerPage: this.itemsPerPage,
            sortColumn: this.sortColumn,
            sortDirection: this.sortDirection,
            filters: this.filters
        };
        localStorage.setItem('productsManagerState', JSON.stringify(state));
    }

    /**
     * Привязка обработчиков событий
     */
    bindEvents() {
        // Поиск
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchDebounceTimer);
                this.searchDebounceTimer = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });
            
            this.elements.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(this.searchDebounceTimer);
                    this.handleSearch(e.target.value);
                }
            });
        }
        
        // Кнопка поиска
        if (this.elements.searchButton) {
            this.elements.searchButton.addEventListener('click', () => {
                const query = this.elements.searchInput?.value || '';
                this.handleSearch(query);
            });
        }
        
        // Очистка фильтров
        if (this.elements.clearFiltersBtn) {
            this.elements.clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
        
        // Пагинация
        this.elements.prevBtns.forEach(btn => {
            btn.addEventListener('click', () => this.changePage(this.currentPage - 1));
        });
        
        this.elements.nextBtns.forEach(btn => {
            btn.addEventListener('click', () => this.changePage(this.currentPage + 1));
        });
        
        this.elements.pageInputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const page = parseInt(e.target.value) || 1;
                    this.changePage(page);
                }
            });
        });
        
        this.elements.itemsPerPageSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                this.changeItemsPerPage(parseInt(e.target.value));
            });
        });
        
        // Город
        const citySelect = document.getElementById('citySelect');
        if (citySelect) {
            citySelect.addEventListener('change', () => {
                this.clearCache();
                this.fetchProducts();
            });
        }
    }

    /**
     * Проверка URL параметров
     */
    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        
        const searchParam = urlParams.get('search');
        if (searchParam) {
            console.log('📌 Found search param in URL:', searchParam);
            this.filters.search = searchParam;
            this.lastSearchQuery = searchParam;
            
            if (this.elements.searchInput) {
                this.elements.searchInput.value = searchParam;
            }
            
            // Очищаем URL
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('search');
            window.history.replaceState({}, '', newUrl);
        }
    }

    /**
     * Загрузка начальных данных
     */
    async loadInitialData() {
        if (this.elements.productTable) {
            await this.fetchProducts();
        }
    }

    /**
     * Обработка поиска
     */
    handleSearch(query) {
        query = query.trim();
        
        if (query === this.lastSearchQuery) {
            return;
        }
        
        console.log('🔍 Search query:', query);
        
        this.lastSearchQuery = query;
        
        if (query) {
            this.filters.search = query;
        } else {
            delete this.filters.search;
        }
        
        this.currentPage = 1;
        this.saveState();
        this.fetchProducts();
    }

    /**
     * Загрузка товаров
     */
    async fetchProducts() {
        if (this.isLoading) {
            console.log('⏳ Already loading...');
            return;
        }
        
        this.isLoading = true;
        showLoadingIndicator();
        
        try {
            // Параметры запроса
            const params = {
                page: this.currentPage,
                limit: this.itemsPerPage,
                sort: this.sortColumn,
                city_id: document.getElementById('citySelect')?.value || '1'
            };
            
            // Добавляем фильтры
            if (this.filters.search) {
                params.q = this.filters.search;
            }
            
            Object.keys(this.filters).forEach(key => {
                if (key !== 'search' && this.filters[key]) {
                    params[key] = this.filters[key];
                }
            });
            
            console.log('📤 API params:', params);
            
            // Проверяем кеш
            const cacheKey = JSON.stringify(params);
            const cached = this.getFromCache(cacheKey);
            
            if (cached) {
                console.log('📦 Using cached data');
                this.handleSearchResult(cached);
                return;
            }
            
            // Делаем запрос
            const response = await this.makeApiRequest(params);
            
            // Сохраняем в кеш
            this.saveToCache(cacheKey, response);
            
            // Обрабатываем результат
            this.handleSearchResult(response);
            
        } catch (error) {
            console.error('❌ Fetch error:', error);
            showToast('Ошибка при загрузке товаров', true);
            this.renderEmptyState();
        } finally {
            this.isLoading = false;
            hideLoadingIndicator();
        }
    }

    /**
     * API запрос
     */
    async makeApiRequest(params) {
        const url = new URL('/api/search', window.location.origin);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                url.searchParams.append(key, value);
            }
        });
        
        console.log('🌐 Request URL:', url.toString());
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    }

    /**
     * Обработка результатов поиска
     */
    handleSearchResult(response) {
        if (response.success && response.data) {
            const data = response.data;
            
            this.products = data.products || [];
            this.totalProducts = data.total || 0;
            this.totalPages = Math.ceil(this.totalProducts / this.itemsPerPage);
            
            console.log(`✅ Found ${this.products.length} products (total: ${this.totalProducts})`);
            
            // Синхронизируем глобальные переменные
            this.syncGlobalVariables();
            
            // Рендерим таблицу
            this.renderProducts();
            
            // Обновляем UI
            this.updateUI();
            
            // Загружаем динамические данные
            if (this.products.length > 0) {
                this.loadDynamicData();
            }
        } else {
            console.error('❌ Invalid response:', response);
            this.renderEmptyState();
        }
    }

    /**
     * Рендеринг товаров
     */
    renderProducts() {
        if (typeof renderProductsTable === 'function') {
            renderProductsTable();
        }
    }

    /**
     * Рендеринг пустого состояния
     */
    renderEmptyState() {
        if (this.elements.tbody) {
            this.elements.tbody.innerHTML = '<tr><td colspan="15" style="text-align: center; padding: 40px;">Товары не найдены</td></tr>';
        }
    }

    /**
     * Загрузка динамических данных
     */
    async loadDynamicData() {
        const productIds = this.products.map(p => p.product_id).filter(id => id > 0);
        
        if (productIds.length === 0) return;
        
        console.log('💰 Loading dynamic data for', productIds.length, 'products');
        
        try {
            await loadAvailability(productIds);
        } catch (error) {
            console.error('Failed to load dynamic data:', error);
        }
    }

    /**
     * Обновление UI
     */
    updateUI() {
        this.updatePagination();
        this.updateCounters();
        this.updateActiveFilters();
    }

    /**
     * Обновление пагинации
     */
    updatePagination() {
        // Текст
        document.querySelectorAll('#currentPage, #currentPageBottom').forEach(el => {
            if (el) el.textContent = this.currentPage;
        });
        
        document.querySelectorAll('#totalPages, #totalPagesBottom').forEach(el => {
            if (el) el.textContent = this.totalPages;
        });
        
        // Поля ввода
        this.elements.pageInputs.forEach(input => {
            if (input) input.value = this.currentPage;
        });
        
        this.elements.itemsPerPageSelects.forEach(select => {
            if (select) select.value = this.itemsPerPage;
        });
        
        // Кнопки
        this.elements.prevBtns.forEach(btn => {
            if (btn) btn.disabled = this.currentPage <= 1;
        });
        
        this.elements.nextBtns.forEach(btn => {
            if (btn) btn.disabled = this.currentPage >= this.totalPages;
        });
    }

    /**
     * Обновление счетчиков
     */
    updateCounters() {
        document.querySelectorAll('#totalProductsText, #totalProductsTextBottom').forEach(el => {
            if (el) el.textContent = `Найдено товаров: ${this.totalProducts}`;
        });
    }

    /**
     * Обновление активных фильтров
     */
    updateActiveFilters() {
        const filtersContainer = document.getElementById('filters');
        if (!filtersContainer) return;
        
        filtersContainer.innerHTML = '';
        
        Object.entries(this.filters).forEach(([key, value]) => {
            if (value) {
                const badge = document.createElement('span');
                badge.className = 'filter-badge';
                badge.style.cssText = 'display: inline-block; margin: 2px; padding: 4px 8px; background: #e9ecef; border-radius: 4px; font-size: 0.85em;';
                badge.innerHTML = `${key}: ${value} <button onclick="window.productsManager.removeFilter('${key}')" style="border: none; background: none; cursor: pointer;">&times;</button>`;
                filtersContainer.appendChild(badge);
            }
        });
    }

    /**
     * Изменение страницы
     */
    changePage(page) {
        page = Math.max(1, Math.min(page, this.totalPages));
        
        if (page === this.currentPage) return;
        
        this.currentPage = page;
        this.saveState();
        this.fetchProducts();
    }

    /**
     * Изменение количества товаров на странице
     */
    changeItemsPerPage(itemsPerPage) {
        if (itemsPerPage === this.itemsPerPage) return;
        
        this.itemsPerPage = itemsPerPage;
        this.currentPage = 1;
        this.saveState();
        this.fetchProducts();
    }

    /**
     * Сортировка
     */
    sortProducts(column) {
        console.log('🔄 Sort by column:', column);
        
        const sortMap = {
            'name': 'name',
            'external_id': 'external_id',
            'price': 'price_asc',
            'availability': 'availability',
            'orders_count': 'popularity'
        };
        
        const newSort = sortMap[column] || 'relevance';
        
        if (this.sortColumn === newSort && newSort.includes('price')) {
            this.sortColumn = this.sortColumn === 'price_asc' ? 'price_desc' : 'price_asc';
        } else {
            this.sortColumn = newSort;
        }
        
        this.currentPage = 1;
        this.saveState();
        this.fetchProducts();
    }

    /**
     * Обработка изменения фильтра
     */
    handleFilterChange(filterName, value) {
        console.log(`🎯 Filter changed: ${filterName} = ${value}`);
        
        if (value) {
            this.filters[filterName] = value;
        } else {
            delete this.filters[filterName];
        }
        
        this.currentPage = 1;
        this.saveState();
        this.fetchProducts();
    }

    /**
     * Удаление фильтра
     */
    removeFilter(filterName) {
        delete this.filters[filterName];
        this.currentPage = 1;
        this.saveState();
        this.fetchProducts();
    }

    /**
     * Очистка всех фильтров
     */
    clearAllFilters() {
        console.log('🧹 Clearing all filters');
        
        this.filters = {};
        this.lastSearchQuery = '';
        
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        
        this.currentPage = 1;
        this.saveState();
        this.fetchProducts();
    }

    /**
     * Синхронизация с глобальными переменными
     */
    syncGlobalVariables() {
        window.productsData = this.products;
        window.currentPage = this.currentPage;
        window.itemsPerPage = this.itemsPerPage;
        window.totalProducts = this.totalProducts;
        window.sortColumn = this.sortColumn;
        window.sortDirection = this.sortDirection;
        window.appliedFilters = this.filters;
    }

    /**
     * Работа с кешем
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    saveToCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // Ограничиваем размер кеша
        if (this.cache.size > 50) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    clearCache() {
        this.cache.clear();
    }

    /**
     * Публичные методы для обратной совместимости
     */
    async loadPage(page) {
        this.changePage(page);
    }
}

// Создаем экземпляр
export const productsManager = new ProductsManager();

// Глобальный доступ
window.productsManager = productsManager;