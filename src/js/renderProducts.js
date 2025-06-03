// src/js/renderProducts.js
// Полностью переработанный модуль рендеринга таблицы товаров

import { showToast } from './utils.js';
import { addToCart } from './cart.js';
import { loadAvailability } from './availability.js';

// Конфигурация колонок таблицы
const TABLE_CONFIG = {
    columns: [
        { id: 'select', width: '50px', class: 'text-center' },
        { id: 'code', width: '120px', class: 'text-nowrap' },
        { id: 'image', width: '80px', class: 'text-center' },
        { id: 'name', width: '300px', class: '' },
        { id: 'sku', width: '100px', class: 'text-nowrap' },
        { id: 'brand', width: '150px', class: '' },
        { id: 'status', width: '100px', class: 'text-center' },
        { id: 'minSale', width: '80px', class: 'text-center' },
        { id: 'availability', width: '100px', class: 'text-center' },
        { id: 'delivery', width: '120px', class: 'text-center' },
        { id: 'price', width: '120px', class: 'text-end' },
        { id: 'retailPrice', width: '120px', class: 'text-end' },
        { id: 'cart', width: '140px', class: 'text-center' },
        { id: 'actions', width: '60px', class: 'text-center' },
        { id: 'orders', width: '80px', class: 'text-center' }
    ]
};

/**
 * Главная функция рендеринга таблицы товаров
 */
export function renderProductsTable() {
    console.log('🎨 Rendering products table...');
    
    const tbody = document.querySelector('.product-table tbody');
    if (!tbody) {
        console.error('❌ Table tbody not found!');
        return;
    }
    
    // Очищаем таблицу
    tbody.innerHTML = '';
    
    // Проверяем наличие товаров
    if (!window.productsData || window.productsData.length === 0) {
        tbody.innerHTML = createEmptyRow();
        return;
    }
    
    console.log(`📊 Rendering ${window.productsData.length} products`);
    
    // Используем DocumentFragment для производительности
    const fragment = document.createDocumentFragment();
    
    window.productsData.forEach((product, index) => {
        try {
            const row = createProductRow(product, index);
            fragment.appendChild(row);
        } catch (error) {
            console.error(`❌ Error creating row for product ${index}:`, error, product);
        }
    });
    
    tbody.appendChild(fragment);
    
    // После рендеринга
    updateTableHeaders();
    bindTableEvents();
    loadDynamicData();
    
    console.log('✅ Products table rendered successfully');
}

/**
 * Создание строки таблицы для товара
 */
function createProductRow(product, index) {
    const row = document.createElement('tr');
    row.setAttribute('data-product-id', product.product_id);
    row.className = 'product-row';
    
    // Применяем фиксированную высоту строки
    row.style.height = '80px';
    
    // 1. Чекбокс
    row.appendChild(createSelectCell(product));
    
    // 2. Код товара
    row.appendChild(createCodeCell(product));
    
    // 3. Изображение
    row.appendChild(createImageCell(product));
    
    // 4. Название
    row.appendChild(createNameCell(product));
    
    // 5. SKU
    row.appendChild(createSkuCell(product));
    
    // 6. Бренд/Серия
    row.appendChild(createBrandCell(product));
    
    // 7. Статус
    row.appendChild(createStatusCell(product));
    
    // 8. Мин. партия
    row.appendChild(createMinSaleCell(product));
    
    // 9. Наличие
    row.appendChild(createAvailabilityCell(product));
    
    // 10. Доставка
    row.appendChild(createDeliveryCell(product));
    
    // 11. Цена
    row.appendChild(createPriceCell(product));
    
    // 12. Розничная цена
    row.appendChild(createRetailPriceCell(product));
    
    // 13. Корзина
    row.appendChild(createCartCell(product));
    
    // 14. Действия
    row.appendChild(createActionsCell(product));
    
    // 15. Количество заказов
    row.appendChild(createOrdersCell(product));
    
    return row;
}

/**
 * Создание ячеек таблицы
 */
function createSelectCell(product) {
    const cell = document.createElement('td');
    cell.className = 'col-select';
    cell.style.width = TABLE_CONFIG.columns[0].width;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'product-checkbox';
    checkbox.setAttribute('data-product-id', product.product_id);
    
    cell.appendChild(checkbox);
    return cell;
}

function createCodeCell(product) {
    const cell = document.createElement('td');
    cell.className = 'col-code';
    cell.style.width = TABLE_CONFIG.columns[1].width;
    
    const code = product.external_id || product.code || '—';
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center; gap: 5px;';
    
    const text = document.createElement('span');
    text.textContent = code;
    text.title = code;
    text.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    
    const copyBtn = createCopyButton(code);
    
    wrapper.appendChild(text);
    wrapper.appendChild(copyBtn);
    cell.appendChild(wrapper);
    
    return cell;
}

function createImageCell(product) {
    const cell = document.createElement('td');
    cell.className = 'col-image';
    cell.style.width = TABLE_CONFIG.columns[2].width;
    
    const link = document.createElement('a');
    link.href = `/shop/product?id=${product.external_id || product.product_id}`;
    link.style.cssText = 'display: block; width: 60px; height: 60px; margin: 0 auto;';
    
    const img = document.createElement('img');
    img.src = getProductImage(product);
    img.alt = product.name || 'Товар';
    img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; border: 1px solid #eee; border-radius: 4px;';
    img.loading = 'lazy';
    
    // Обработка ошибки загрузки изображения
    img.onerror = () => {
        img.src = '/images/placeholder.jpg';
    };
    
    link.appendChild(img);
    cell.appendChild(link);
    
    return cell;
}

function createNameCell(product) {
    const cell = document.createElement('td');
    cell.className = 'col-name';
    cell.style.width = TABLE_CONFIG.columns[3].width;
    
    const link = document.createElement('a');
    link.href = `/shop/product?id=${product.external_id || product.product_id}`;
    link.style.cssText = 'display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; color: inherit; text-decoration: none;';
    link.title = product.name || 'Название не указано';
    
    // Если есть подсветка из поиска
    if (product._highlight && product._highlight.name) {
        link.innerHTML = product._highlight.name[0];
    } else {
        link.textContent = product.name || 'Название не указано';
    }
    
    // Добавляем hover эффект
    link.addEventListener('mouseenter', () => {
        link.style.textDecoration = 'underline';
    });
    link.addEventListener('mouseleave', () => {
        link.style.textDecoration = 'none';
    });
    
    cell.appendChild(link);
    return cell;
}

function createSkuCell(product) {
    const cell = document.createElement('td');
    cell.className = 'col-sku';
    cell.style.width = TABLE_CONFIG.columns[4].width;
    
    const sku = product.sku || '—';
    cell.textContent = sku;
    cell.title = sku;
    cell.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    
    return cell;
}

function createBrandCell(product) {
    const cell = document.createElement('td');
    cell.className = 'col-brand-series';
    cell.style.width = TABLE_CONFIG.columns[5].width;
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';
    
    if (product.brand_name) {
        const brandSpan = document.createElement('span');
        brandSpan.textContent = product.brand_name;
        brandSpan.style.cssText = 'font-weight: 500; color: #0066cc; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        brandSpan.title = product.brand_name;
        brandSpan.setAttribute('data-filter-type', 'brand');
        brandSpan.setAttribute('data-filter-value', product.brand_name);
        wrapper.appendChild(brandSpan);
    }
    
    if (product.series_name) {
        const seriesSpan = document.createElement('span');
        seriesSpan.textContent = product.series_name;
        seriesSpan.style.cssText = 'font-size: 0.85em; color: #666; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        seriesSpan.title = product.series_name;
        seriesSpan.setAttribute('data-filter-type', 'series');
        seriesSpan.setAttribute('data-filter-value', product.series_name);
        wrapper.appendChild(seriesSpan);
    }
    
    if (!product.brand_name && !product.series_name) {
        wrapper.textContent = '—';
    }
    
    cell.appendChild(wrapper);
    return cell;
}

function createStatusCell(product) {
    const cell = document.createElement('td');
    cell.className = 'col-status';
    cell.style.width = TABLE_CONFIG.columns[6].width;
    
    const badge = document.createElement('span');
    badge.style.cssText = 'display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.75em; font-weight: 500;';
    
    const status = product.status || 'active';
    switch(status.toLowerCase()) {
        case 'active':
        case 'активен':
            badge.textContent = 'Активен';
            badge.style.backgroundColor = '#d4edda';
            badge.style.color = '#155724';
            break;
        case 'inactive':
        case 'неактивен':
            badge.textContent = 'Неактивен';
            badge.style.backgroundColor = '#f8d7da';
            badge.style.color = '#721c24';
            break;
        default:
            badge.textContent = 'Активен';
            badge.style.backgroundColor = '#d4edda';
            badge.style.color = '#155724';
    }
    
    cell.appendChild(badge);
    return cell;
}

function createMinSaleCell(product) {
    const cell = document.createElement('td');
    cell.className = 'col-min-sale-unit';
    cell.style.width = TABLE_CONFIG.columns[7].width;
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'text-align: center;';
    
    const minSale = product.min_sale || 1;
    const unit = product.unit || 'шт';
    
    wrapper.innerHTML = `<strong>${minSale}</strong><br><small style="color: #666;">${unit}</small>`;
    
    cell.appendChild(wrapper);
    return cell;
}

function createAvailabilityCell(product) {
    const cell = document.createElement('td');
    cell.className = 'col-availability availability-cell';
    cell.style.width = TABLE_CONFIG.columns[8].width;
    cell.setAttribute('data-product-id', product.product_id);
    
    const badge = document.createElement('span');
    badge.style.cssText = 'display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;';
    
    // Проверяем наличие данных о складе
    if (product.stock && typeof product.stock.quantity !== 'undefined') {
        const qty = parseInt(product.stock.quantity);
        if (qty > 0) {
            badge.textContent = `${qty} шт`;
            badge.style.backgroundColor = '#d4edda';
            badge.style.color = '#155724';
        } else {
            badge.textContent = 'Нет';
            badge.style.backgroundColor = '#f8d7da';
            badge.style.color = '#721c24';
        }
    } else {
        badge.textContent = '...';
        badge.style.backgroundColor = '#e2e3e5';
        badge.style.color = '#383d41';
    }
    
    cell.appendChild(badge);
    return cell;
}

function createDeliveryCell(product) {
    const cell = document.createElement('td');
    cell.className = 'col-delivery-date delivery-date-cell';
    cell.style.width = TABLE_CONFIG.columns[9].width;
    cell.setAttribute('data-product-id', product.product_id);
    
    const text = product.delivery?.date || product.delivery?.text || '...';
    cell.textContent = text;
    cell.style.cssText = 'text-align: center; color: #666;';
    
    return cell;
}

function createPriceCell(product) {
    const cell = document.createElement('td');
    cell.className = 'col-price';
    cell.style.width = TABLE_CONFIG.columns[10].width;
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'text-align: right;';
    
    if (product.price?.final) {
        const priceSpan = document.createElement('span');
        priceSpan.textContent = `${parseFloat(product.price.final).toFixed(2)} ₽`;
        priceSpan.style.cssText = 'font-weight: 600; color: #28a745;';
        wrapper.appendChild(priceSpan);
    } else if (product.base_price) {
        const priceSpan = document.createElement('span');
        priceSpan.textContent = `${parseFloat(product.base_price).toFixed(2)} ₽`;
        priceSpan.style.cssText = 'font-weight: 600;';
        wrapper.appendChild(priceSpan);
    } else {
        wrapper.textContent = '—';
        wrapper.style.color = '#999';
    }
    
    cell.appendChild(wrapper);
    return cell;
}

function createRetailPriceCell(product) {
    const cell = document.createElement('td');
    cell.className = 'col-retail-price';
    cell.style.width = TABLE_CONFIG.columns[11].width;
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'text-align: right;';
    
    if (product.price?.base && product.price?.has_special) {
        const priceSpan = document.createElement('span');
        priceSpan.textContent = `${parseFloat(product.price.base).toFixed(2)} ₽`;
        priceSpan.style.cssText = 'text-decoration: line-through; color: #999;';
        wrapper.appendChild(priceSpan);
    } else if (product.retail_price) {
        const priceSpan = document.createElement('span');
        priceSpan.textContent = `${parseFloat(product.retail_price).toFixed(2)} ₽`;
        priceSpan.style.cssText = 'color: #666;';
        wrapper.appendChild(priceSpan);
    } else {
        wrapper.textContent = '—';
        wrapper.style.color = '#999';
    }
    
    cell.appendChild(wrapper);
    return cell;
}

function createCartCell(product) {
    const cell = document.createElement('td');
    cell.className = 'col-cart';
    cell.style.width = TABLE_CONFIG.columns[12].width;
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center; gap: 5px; justify-content: center;';
    
    // Input количества
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'quantity-input';
    input.value = product.min_sale || 1;
    input.min = product.min_sale || 1;
    input.step = product.min_sale || 1;
    input.style.cssText = 'width: 60px; padding: 4px; border: 1px solid #ccc; border-radius: 4px; text-align: center;';
    
    // Кнопка добавления в корзину
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-add-to-cart';
    button.setAttribute('data-product-id', product.product_id);
    button.style.cssText = 'padding: 4px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px;';
    button.innerHTML = '<i class="fas fa-cart-plus"></i> <span>В корзину</span>';
    
    // Обработчик клика
    button.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const productId = this.getAttribute('data-product-id');
        const quantity = parseInt(input.value) || 1;
        
        console.log(`Adding to cart: product ${productId}, quantity: ${quantity}`);
        
        try {
            // Отключаем кнопку на время запроса
            button.disabled = true;
            button.style.opacity = '0.6';
            
            await addToCart(productId, quantity);
            
            // Визуальная обратная связь
            button.innerHTML = '<i class="fas fa-check"></i> Добавлено';
            button.style.backgroundColor = '#17a2b8';
            
            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-cart-plus"></i> <span>В корзину</span>';
                button.style.backgroundColor = '#28a745';
                button.disabled = false;
                button.style.opacity = '1';
            }, 1500);
            
        } catch (error) {
            console.error('Error adding to cart:', error);
            showToast('Ошибка при добавлении в корзину', true);
            button.disabled = false;
            button.style.opacity = '1';
        }
    });
    
    wrapper.appendChild(input);
    wrapper.appendChild(button);
    cell.appendChild(wrapper);
    
    return cell;
}

function createActionsCell(product) {
    const cell = document.createElement('td');
    cell.className = 'col-additional';
    cell.style.width = TABLE_CONFIG.columns[13].width;
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative;';
    
    const button = document.createElement('button');
    button.className = 'btn-actions';
    button.style.cssText = 'padding: 4px 8px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; cursor: pointer;';
    button.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
    button.title = 'Дополнительные действия';
    
    // Простое меню действий
    button.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Показываем простой алерт с действиями
        const actions = [
            `Открыть товар: ${product.name}`,
            'Добавить в избранное',
            'Добавить в сравнение'
        ];
        
        const action = prompt('Выберите действие:\n' + actions.map((a, i) => `${i+1}. ${a}`).join('\n'));
        
        if (action === '1') {
            window.location.href = `/shop/product?id=${product.external_id || product.product_id}`;
        } else if (action === '2') {
            showToast('Товар добавлен в избранное');
        } else if (action === '3') {
            showToast('Товар добавлен в сравнение');
        }
    });
    
    wrapper.appendChild(button);
    cell.appendChild(wrapper);
    
    return cell;
}

function createOrdersCell(product) {
    const cell = document.createElement('td');
    cell.className = 'col-orders-count';
    cell.style.width = TABLE_CONFIG.columns[14].width;
    
    const count = parseInt(product.orders_count) || 0;
    const badge = document.createElement('span');
    
    if (count > 0) {
        badge.textContent = count.toString();
        badge.style.cssText = 'display: inline-block; padding: 2px 8px; background: #17a2b8; color: white; border-radius: 12px; font-size: 0.8em;';
        badge.title = `Куплено ${count} раз`;
    } else {
        badge.textContent = '0';
        badge.style.cssText = 'color: #999;';
    }
    
    cell.appendChild(badge);
    return cell;
}

/**
 * Вспомогательные функции
 */
function getProductImage(product) {
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        return product.images[0];
    }
    if (product.image_urls) {
        const urls = product.image_urls.split(',').map(u => u.trim());
        if (urls.length > 0) return urls[0];
    }
    if (product.image_url) {
        return product.image_url;
    }
    return '/images/placeholder.jpg';
}

function createCopyButton(text) {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.cssText = 'padding: 2px 6px; background: none; border: none; cursor: pointer; color: #666; font-size: 0.8em;';
    button.innerHTML = '<i class="far fa-copy"></i>';
    button.title = 'Копировать';
    
    button.addEventListener('click', function(e) {
        e.stopPropagation();
        copyToClipboard(text);
    });
    
    return button;
}

function copyToClipboard(text) {
    if (!text) return;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showToast(`Скопировано: ${text}`))
            .catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showToast(`Скопировано: ${text}`);
    } catch (err) {
        showToast('Не удалось скопировать', true);
    }
    
    document.body.removeChild(textarea);
}

function createEmptyRow() {
    return '<tr><td colspan="15" style="text-align: center; padding: 40px; color: #666;">Товары не найдены</td></tr>';
}

/**
 * Обновление заголовков таблицы
 */
function updateTableHeaders() {
    const headers = document.querySelectorAll('.product-table th');
    
    headers.forEach((header, index) => {
        if (index < TABLE_CONFIG.columns.length) {
            header.style.width = TABLE_CONFIG.columns[index].width;
            header.style.minWidth = TABLE_CONFIG.columns[index].width;
        }
    });
}

/**
 * Привязка событий к таблице
 */
function bindTableEvents() {
    const table = document.querySelector('.product-table');
    if (!table) return;
    
    // Делегирование событий для сортировки
    table.addEventListener('click', function(e) {
        const th = e.target.closest('th.sortable');
        if (th && th.dataset.column) {
            if (window.productsManager && window.productsManager.sortProducts) {
                window.productsManager.sortProducts(th.dataset.column);
            }
        }
        
        // Фильтрация по бренду/серии
        const filterElement = e.target.closest('[data-filter-type]');
        if (filterElement) {
            const filterType = filterElement.getAttribute('data-filter-type');
            const filterValue = filterElement.getAttribute('data-filter-value');
            
            if (window.productsManager && window.productsManager.handleFilterChange) {
                window.productsManager.handleFilterChange(filterType + 'Filter', filterValue);
            }
        }
    });
    
    // Обработка чекбокса "Выбрать все"
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.product-checkbox');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }
}

/**
 * Загрузка динамических данных
 */
function loadDynamicData() {
    const productIds = [];
    const rows = document.querySelectorAll('tr[data-product-id]');
    
    rows.forEach(row => {
        const productId = row.getAttribute('data-product-id');
        if (productId) {
            productIds.push(parseInt(productId));
        }
    });
    
    if (productIds.length > 0) {
        console.log(`💰 Loading dynamic data for ${productIds.length} products`);
        loadAvailability(productIds);
    }
}

// Экспорт функций для глобального использования
window.renderProductsTable = renderProductsTable;
window.copyToClipboard = copyToClipboard;