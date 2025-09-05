class ConsumerApp {
  constructor() {
    this.currentUser = null;
    this.currentStore = null;
    this.cart = [];
    this.stores = [];
    this.products = [];
    this.orders = [];
    
    this.initEventListeners();
  }

  initEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    // Navigation buttons - Updated logout function
    document.getElementById('logout-btn').addEventListener('click', () => this.logout());
    document.getElementById('view-orders-btn').addEventListener('click', () => this.showOrdersScreen());
    document.getElementById('back-to-stores').addEventListener('click', () => this.showStoresScreen());
    document.getElementById('view-cart-btn').addEventListener('click', () => this.showCartScreen());
    document.getElementById('back-to-products').addEventListener('click', () => this.showProductsScreen());
    document.getElementById('back-to-cart').addEventListener('click', () => this.showCartScreen());
    document.getElementById('back-to-stores-from-orders').addEventListener('click', () => this.showStoresScreen());
    document.getElementById('checkout-btn').addEventListener('click', () => this.showCheckoutScreen());

    // Checkout form
    document.getElementById('checkout-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleCheckout();
    });

    // Success screen buttons
    document.getElementById('continue-shopping').addEventListener('click', () => this.showStoresScreen());
    document.getElementById('view-my-orders').addEventListener('click', () => this.showOrdersScreen());
  }

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
  }

  showError(message, containerId = 'login-error') {
    const errorDiv = document.getElementById(containerId);
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => {
      errorDiv.classList.add('hidden');
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

      if (response.ok && data.user.role === 'consumer') {
        this.currentUser = data.user;
        document.getElementById('user-name').textContent = data.user.name;
        this.loadStores();
        this.showStoresScreen();
      } else {
        this.showError(data.message || 'Error de autenticación');
      }
    } catch (error) {
      console.error('Error:', error);
      this.showError('Error de conexión');
    }
  }

  async loadStores() {
    try {
      const response = await fetch('http://localhost:5050/stores');
      const stores = await response.json();
      this.stores = stores;
      this.renderStores();
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  }

  renderStores() {
    const storesContainer = document.getElementById('stores-list');
    storesContainer.innerHTML = '';

    this.stores.forEach(store => {
      const storeCard = document.createElement('div');
      storeCard.className = 'store-card';
      storeCard.innerHTML = `
        <h3>${store.name}</h3>
        <p class="store-type">${store.type}</p>
        <p class="store-address">${store.address}</p>
        <div class="store-status ${store.isOpen ? 'open' : 'closed'}">
          ${store.isOpen ? 'Abierto' : 'Cerrado'}
        </div>
      `;
      
      if (store.isOpen) {
        storeCard.addEventListener('click', () => this.selectStore(store));
        storeCard.classList.add('clickable');
      }

      storesContainer.appendChild(storeCard);
    });
  }

  async selectStore(store) {
    this.currentStore = store;
    document.getElementById('store-name').textContent = store.name;
    await this.loadProducts(store.id);
    this.showProductsScreen();
  }

  async loadProducts(storeId) {
    try {
      const response = await fetch(`http://localhost:5050/stores/${storeId}/products`);
      const products = await response.json();
      this.products = products;
      this.renderProducts();
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  renderProducts() {
    const productsContainer = document.getElementById('products-list');
    productsContainer.innerHTML = '';

    this.products.forEach(product => {
      const productCard = document.createElement('div');
      productCard.className = 'product-card';
      productCard.innerHTML = `
        <h4>${product.name}</h4>
        <p class="product-category">${product.category}</p>
        <p class="product-price">${product.price.toLocaleString()}</p>
        <button class="add-to-cart-btn" onclick="app.addToCart(${product.id})">
          Agregar al Carrito
        </button>
      `;
      productsContainer.appendChild(productCard);
    });
  }

  addToCart(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = this.cart.find(item => item.productId === productId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.cart.push({
        productId: productId,
        product: product,
        quantity: 1
      });
    }

    this.updateCartDisplay();
    this.showTemporaryMessage('Producto agregado al carrito');
  }

  updateCartDisplay() {
    const cartCount = this.cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cart-count').textContent = cartCount;
  }

  showTemporaryMessage(message) {
    alert(message);
  }

  showCartScreen() {
    this.renderCart();
    this.showScreen('cart-screen');
  }

  renderCart() {
    const cartContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    cartContainer.innerHTML = '';
    let total = 0;

    if (this.cart.length === 0) {
      cartContainer.innerHTML = '<p class="empty-cart">Tu carrito está vacío</p>';
    } else {
      this.cart.forEach((item, index) => {
        const itemTotal = item.product.price * item.quantity;
        total += itemTotal;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
          <div class="item-info">
            <h4>${item.product.name}</h4>
            <p class="item-price">${item.product.price.toLocaleString()}</p>
          </div>
          <div class="item-controls">
            <button onclick="app.updateQuantity(${index}, ${item.quantity - 1})">-</button>
            <span class="quantity">${item.quantity}</span>
            <button onclick="app.updateQuantity(${index}, ${item.quantity + 1})">+</button>
          </div>
          <div class="item-total">
            ${itemTotal.toLocaleString()}
          </div>
          <button class="remove-item" onclick="app.removeFromCart(${index})">🗑️</button>
        `;
        cartContainer.appendChild(cartItem);
      });
    }

    cartTotal.textContent = total.toLocaleString();
  }

  updateQuantity(index, newQuantity) {
    if (newQuantity <= 0) {
      this.cart.splice(index, 1);
    } else {
      this.cart[index].quantity = newQuantity;
    }
    this.updateCartDisplay();
    this.renderCart();
  }

  removeFromCart(index) {
    this.cart.splice(index, 1);
    this.updateCartDisplay();
    this.renderCart();
  }

  showCheckoutScreen() {
    if (this.cart.length === 0) {
      alert('Tu carrito está vacío');
      return;
    }

    this.renderCheckoutSummary();
    this.showScreen('checkout-screen');
  }

  renderCheckoutSummary() {
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total');
    
    checkoutItems.innerHTML = '';
    let total = 0;

    this.cart.forEach(item => {
      const itemTotal = item.product.price * item.quantity;
      total += itemTotal;

      const checkoutItem = document.createElement('div');
      checkoutItem.className = 'checkout-item';
      checkoutItem.innerHTML = `
        <span>${item.product.name} x${item.quantity}</span>
        <span>${itemTotal.toLocaleString()}</span>
      `;
      checkoutItems.appendChild(checkoutItem);
    });

    checkoutTotal.textContent = total.toLocaleString();
  }

  async handleCheckout() {
    const deliveryAddress = document.getElementById('delivery-address').value;
    const paymentMethod = document.getElementById('payment-method').value;

    if (!deliveryAddress || !paymentMethod) {
      alert('Por favor completa todos los campos');
      return;
    }

    const orderData = {
      userId: this.currentUser.id,
      storeId: this.currentStore.id,
      products: this.cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      })),
      deliveryAddress,
      paymentMethod
    };

    try {
      const response = await fetch('http://localhost:5050/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (response.ok) {
        document.getElementById('order-number').textContent = data.order.id;
        document.getElementById('order-total').textContent = data.order.total.toLocaleString();
        
        this.cart = [];
        this.updateCartDisplay();
        
        this.showScreen('success-screen');
      } else {
        alert('Error al crear la orden: ' + data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    }
  }

  async showOrdersScreen() {
    await this.loadOrders();
    this.showScreen('orders-screen');
  }

  async loadOrders() {
    try {
      const response = await fetch(`http://localhost:5050/users/${this.currentUser.id}/orders`);
      const orders = await response.json();
      this.orders = orders;
      this.renderOrders();
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }

  renderOrders() {
    const ordersContainer = document.getElementById('orders-list');
    ordersContainer.innerHTML = '';

    if (this.orders.length === 0) {
      ordersContainer.innerHTML = '<p class="no-orders">No tienes órdenes aún</p>';
      return;
    }

    this.orders.forEach(order => {
      const orderCard = document.createElement('div');
      orderCard.className = `order-card status-${order.status}`;
      
      const orderDate = new Date(order.createdAt).toLocaleDateString();
      const store = this.stores.find(s => s.id === order.storeId);
      
      orderCard.innerHTML = `
        <div class="order-header">
          <h4>Orden #${order.id}</h4>
          <span class="order-status">${this.getStatusText(order.status)}</span>
        </div>
        <div class="order-info">
          <p><strong>Tienda:</strong> ${store ? store.name : 'N/A'}</p>
          <p><strong>Fecha:</strong> ${orderDate}</p>
          <p><strong>Total:</strong> ${order.total.toLocaleString()}</p>
          <p><strong>Dirección:</strong> ${order.deliveryAddress}</p>
        </div>
        <div class="order-products">
          <h5>Productos:</h5>
          ${order.products.map(p => `<span class="product-item">${p.name} x${p.quantity}</span>`).join(', ')}
        </div>
      `;
      
      ordersContainer.appendChild(orderCard);
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

  showStoresScreen() {
    this.showScreen('stores-screen');
  }

  showProductsScreen() {
    this.showScreen('products-screen');
  }

  logout() {
    // Redirect to main selection page
    window.location.href = '../';
  }
}

const app = new ConsumerApp();