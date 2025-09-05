class StoreApp {
  constructor() {
    this.currentUser = null;
    this.storeData = null;
    this.products = [];
    this.orders = [];
    this.currentOrder = null;
    
    this.initEventListeners();
  }

  initEventListeners() {
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    // Updated logout function
    document.getElementById('logout-btn').addEventListener('click', () => this.logout());
    document.getElementById('back-to-dashboard').addEventListener('click', () => this.showDashboard());
    document.getElementById('back-to-dashboard-2').addEventListener('click', () => this.showDashboard());

    document.getElementById('store-toggle').addEventListener('change', (e) => {
      this.toggleStore(e.target.checked);
    });

    document.getElementById('add-product-btn').addEventListener('click', () => this.showProductModal());
    document.getElementById('add-product-btn-2').addEventListener('click', () => this.showProductModal());
    document.getElementById('view-orders-btn').addEventListener('click', () => this.showOrdersScreen());
    document.getElementById('manage-products-btn').addEventListener('click', () => this.showProductsScreen());

    document.getElementById('close-modal').addEventListener('click', () => this.hideProductModal());
    document.getElementById('cancel-product').addEventListener('click', () => this.hideProductModal());
    document.getElementById('product-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.createProduct();
    });

    document.getElementById('close-order-modal').addEventListener('click', () => this.hideOrderModal());
    document.getElementById('accept-order').addEventListener('click', () => this.acceptOrder());
    document.getElementById('reject-order').addEventListener('click', () => this.rejectOrder());
    document.getElementById('mark-ready').addEventListener('click', () => this.markOrderReady());

    document.getElementById('order-filter').addEventListener('change', (e) => {
      this.filterOrders(e.target.value);
    });

    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.hideProductModal();
        this.hideOrderModal();
      }
    });
  }

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
  }

  showError(message) {
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => {
      errorDiv.classList.add('hidden');
    }, 3000);
  }

  showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    const successText = document.getElementById('success-text');
    successText.textContent = message;
    successDiv.classList.remove('hidden');
    setTimeout(() => {
      successDiv.classList.add('hidden');
    }, 3000);
  }

  async handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('http://localhost:5050/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.user.role === 'store') {
        this.currentUser = data.user;
        await this.loadStoreData();
        this.showDashboard();
      } else {
        this.showError(data.message || 'Error de autenticación');
      }
    } catch (error) {
      console.error('Error:', error);
      this.showError('Error de conexión');
    }
  }

  async loadStoreData() {
    this.storeData = { id: 1, name: this.currentUser.name, isOpen: false };
    document.getElementById('store-name').textContent = this.currentUser.name;
    
    await this.loadProducts();
    await this.loadOrders();
    this.updateDashboard();
  }

  async loadProducts() {
    try {
      const response = await fetch(`http://localhost:5050/stores/${this.storeData.id}/products`);
      const products = await response.json();
      this.products = products;
      this.renderProducts();
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  async loadOrders() {
    try {
      const response = await fetch(`http://localhost:5050/stores/${this.storeData.id}/orders`);
      const orders = await response.json();
      this.orders = orders;
      this.renderOrders();
      this.renderRecentOrders();
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }

  updateDashboard() {
    document.getElementById('total-orders').textContent = this.orders.length;
    document.getElementById('pending-orders').textContent = 
      this.orders.filter(order => order.status === 'pending').length;
    document.getElementById('total-products').textContent = this.products.length;
  }

  async toggleStore(isOpen) {
    try {
      const response = await fetch(`http://localhost:5050/stores/${this.storeData.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isOpen })
      });

      const data = await response.json();
      
      if (response.ok) {
        this.storeData.isOpen = isOpen;
        document.getElementById('status-text').textContent = isOpen ? 'Abierta' : 'Cerrada';
        this.showSuccess(data.message);
      } else {
        document.getElementById('store-toggle').checked = !isOpen;
        this.showError(data.message || 'Error al cambiar estado de la tienda');
      }
    } catch (error) {
      console.error('Error:', error);
      document.getElementById('store-toggle').checked = !isOpen;
      this.showError('Error de conexión');
    }
  }

  showProductModal() {
    document.getElementById('product-modal').classList.remove('hidden');
  }

  hideProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
    document.getElementById('product-form').reset();
  }

  async createProduct() {
    const name = document.getElementById('product-name').value;
    const price = parseInt(document.getElementById('product-price').value);
    const category = document.getElementById('product-category').value;

    try {
      const response = await fetch(`http://localhost:5050/stores/${this.storeData.id}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, price, category })
      });

      const data = await response.json();

      if (response.ok) {
        this.showSuccess(data.message);
        this.hideProductModal();
        await this.loadProducts();
        this.updateDashboard();
      } else {
        this.showError(data.message || 'Error al crear el producto');
      }
    } catch (error) {
      console.error('Error:', error);
      this.showError('Error de conexión');
    }
  }

  renderProducts() {
    const productsContainer = document.getElementById('products-list');
    productsContainer.innerHTML = '';

    if (this.products.length === 0) {
      productsContainer.innerHTML = '<p class="no-products">No hay productos registrados</p>';
      return;
    }

    this.products.forEach(product => {
      const productCard = document.createElement('div');
      productCard.className = 'product-card';
      productCard.innerHTML = `
        <div class="product-info">
          <h4>${product.name}</h4>
          <p class="product-category">${this.getCategoryName(product.category)}</p>
          <p class="product-price">$${product.price.toLocaleString()}</p>
          <span class="product-status ${product.available ? 'available' : 'unavailable'}">
            ${product.available ? 'Disponible' : 'No disponible'}
          </span>
        </div>
        <div class="product-actions">
          <button onclick="storeApp.toggleProductAvailability(${product.id})" 
                  class="${product.available ? 'secondary' : 'primary'}">
            ${product.available ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      `;
      productsContainer.appendChild(productCard);
    });
  }

  getCategoryName(category) {
    const categories = {
      'food': 'Comida',
      'drink': 'Bebida',
      'medicine': 'Medicina',
      'grocery': 'Abarrotes',
      'electronics': 'Electrónicos',
      'other': 'Otro'
    };
    return categories[category] || category;
  }

  async toggleProductAvailability(productId) {
    const product = this.products.find(p => p.id === productId);
    if (product) {
      product.available = !product.available;
      this.renderProducts();
      this.showSuccess(`Producto ${product.available ? 'activado' : 'desactivado'}`);
    }
  }

  renderOrders() {
    const ordersContainer = document.getElementById('orders-list');
    ordersContainer.innerHTML = '';

    if (this.orders.length === 0) {
      ordersContainer.innerHTML = '<p class="no-orders">No hay órdenes</p>';
      return;
    }

    this.orders.forEach(order => {
      const orderCard = document.createElement('div');
      orderCard.className = `order-card status-${order.status}`;
      
      const orderDate = new Date(order.createdAt).toLocaleString();
      
      orderCard.innerHTML = `
        <div class="order-header">
          <h4>Orden #${order.id}</h4>
          <span class="order-status">${this.getStatusText(order.status)}</span>
        </div>
        <div class="order-info">
          <p><strong>Fecha:</strong> ${orderDate}</p>
          <p><strong>Total:</strong> $${order.total.toLocaleString()}</p>
          <p><strong>Productos:</strong> ${order.products.length} items</p>
          <p><strong>Dirección:</strong> ${order.deliveryAddress}</p>
        </div>
        <div class="order-actions">
          <button onclick="storeApp.showOrderDetails(${order.id})" class="primary">
            Ver Detalles
          </button>
        </div>
      `;
      
      ordersContainer.appendChild(orderCard);
    });
  }

  renderRecentOrders() {
    const recentContainer = document.getElementById('recent-orders-list');
    recentContainer.innerHTML = '';

    const recentOrders = this.orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);

    if (recentOrders.length === 0) {
      recentContainer.innerHTML = '<p class="no-orders">No hay órdenes recientes</p>';
      return;
    }

    recentOrders.forEach(order => {
      const orderItem = document.createElement('div');
      orderItem.className = 'recent-order-item';
      
      const orderDate = new Date(order.createdAt).toLocaleString();
      
      orderItem.innerHTML = `
        <div class="order-summary">
          <strong>Orden #${order.id}</strong> - $${order.total.toLocaleString()}
          <span class="order-date">${orderDate}</span>
        </div>
        <span class="order-status status-${order.status}">${this.getStatusText(order.status)}</span>
      `;
      
      orderItem.addEventListener('click', () => this.showOrderDetails(order.id));
      recentContainer.appendChild(orderItem);
    });
  }

  getStatusText(status) {
    const statusMap = {
      'pending': 'Pendiente',
      'accepted': 'Aceptado',
      'preparing': 'Preparando',
      'ready': 'Listo',
      'delivering': 'En camino',
      'delivered': 'Entregado',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
  }

  filterOrders(filter) {
    const filteredOrders = filter === 'all' 
      ? this.orders 
      : this.orders.filter(order => order.status === filter);
    
    const ordersContainer = document.getElementById('orders-list');
    ordersContainer.innerHTML = '';

    filteredOrders.forEach(order => {
      const orderCard = document.createElement('div');
      orderCard.className = `order-card status-${order.status}`;
      
      const orderDate = new Date(order.createdAt).toLocaleString();
      
      orderCard.innerHTML = `
        <div class="order-header">
          <h4>Orden #${order.id}</h4>
          <span class="order-status">${this.getStatusText(order.status)}</span>
        </div>
        <div class="order-info">
          <p><strong>Fecha:</strong> ${orderDate}</p>
          <p><strong>Total:</strong> $${order.total.toLocaleString()}</p>
          <p><strong>Productos:</strong> ${order.products.length} items</p>
          <p><strong>Dirección:</strong> ${order.deliveryAddress}</p>
        </div>
        <div class="order-actions">
          <button onclick="storeApp.showOrderDetails(${order.id})" class="primary">
            Ver Detalles
          </button>
        </div>
      `;
      
      ordersContainer.appendChild(orderCard);
    });
  }

  showOrderDetails(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    this.currentOrder = order;
    
    document.getElementById('order-number').textContent = order.id;
    
    const orderDetails = document.getElementById('order-details');
    orderDetails.innerHTML = `
      <div class="order-detail-section">
        <h3>Información General</h3>
        <p><strong>Estado:</strong> ${this.getStatusText(order.status)}</p>
        <p><strong>Fecha:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
        <p><strong>Total:</strong> $${order.total.toLocaleString()}</p>
        <p><strong>Método de pago:</strong> ${order.paymentMethod}</p>
        <p><strong>Dirección de entrega:</strong> ${order.deliveryAddress}</p>
      </div>
      
      <div class="order-detail-section">
        <h3>Productos</h3>
        <div class="order-products">
          ${order.products.map(product => `
            <div class="order-product-item">
              <span class="product-name">${product.name}</span>
              <span class="product-quantity">x${product.quantity}</span>
              <span class="product-price">$${(product.price * product.quantity).toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('accept-order').classList.toggle('hidden', order.status !== 'pending');
    document.getElementById('reject-order').classList.toggle('hidden', order.status !== 'pending');
    document.getElementById('mark-ready').classList.toggle('hidden', order.status !== 'accepted');

    document.getElementById('order-modal').classList.remove('hidden');
  }

  hideOrderModal() {
    document.getElementById('order-modal').classList.add('hidden');
    this.currentOrder = null;
  }

  async acceptOrder() {
    if (!this.currentOrder) return;

    try {
      this.currentOrder.status = 'accepted';
      this.showSuccess('Orden aceptada');
      this.hideOrderModal();
      await this.loadOrders();
      this.updateDashboard();
    } catch (error) {
      console.error('Error:', error);
      this.showError('Error al aceptar la orden');
    }
  }

  async rejectOrder() {
    if (!this.currentOrder) return;

    try {
      this.currentOrder.status = 'cancelled';
      this.showSuccess('Orden rechazada');
      this.hideOrderModal();
      await this.loadOrders();
      this.updateDashboard();
    } catch (error) {
      console.error('Error:', error);
      this.showError('Error al rechazar la orden');
    }
  }

  async markOrderReady() {
    if (!this.currentOrder) return;

    try {
      this.currentOrder.status = 'ready';
      this.showSuccess('Orden marcada como lista');
      this.hideOrderModal();
      await this.loadOrders();
      this.updateDashboard();
    } catch (error) {
      console.error('Error:', error);
      this.showError('Error al marcar la orden como lista');
    }
  }

  showDashboard() {
    this.updateDashboard();
    this.renderRecentOrders();
    this.showScreen('dashboard-screen');
  }

  showProductsScreen() {
    this.showScreen('products-screen');
  }

  showOrdersScreen() {
    this.showScreen('orders-screen');
  }

  logout() {
    // Redirect to main selection page
    window.location.href = '../';
  }
}

const storeApp = new StoreApp();