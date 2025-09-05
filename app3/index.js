class DeliveryApp {
  constructor() {
    this.currentUser = null;
    this.availableOrders = [];
    this.myDeliveries = [];
    this.currentOrder = null;
    this.isAvailable = false;
    this.earnings = { today: 0, total: 0, deliveries: [] };
    
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
    document.getElementById('back-to-dashboard-3').addEventListener('click', () => this.showDashboard());

    document.getElementById('availability-toggle').addEventListener('change', (e) => {
      this.toggleAvailability(e.target.checked);
    });

    document.getElementById('view-available-btn').addEventListener('click', () => this.showAvailableOrders());
    document.getElementById('my-deliveries-btn').addEventListener('click', () => this.showMyDeliveries());
    document.getElementById('earnings-btn').addEventListener('click', () => this.showEarnings());
    document.getElementById('refresh-orders').addEventListener('click', () => this.loadAvailableOrders());

    document.getElementById('close-order-modal').addEventListener('click', () => this.hideOrderModal());
    document.getElementById('accept-delivery').addEventListener('click', () => this.acceptDelivery());
    document.getElementById('pickup-order').addEventListener('click', () => this.pickupOrder());
    document.getElementById('complete-delivery').addEventListener('click', () => this.completeDelivery());

    document.getElementById('delivery-filter').addEventListener('change', (e) => {
      this.filterDeliveries(e.target.value);
    });

    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.hideOrderModal();
      }
    });

    setInterval(() => {
      if (this.isAvailable && document.getElementById('available-screen').classList.contains('active')) {
        this.loadAvailableOrders();
      }
    }, 30000);
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

  showLoading() {
    document.getElementById('loading').classList.remove('hidden');
  }

  hideLoading() {
    document.getElementById('loading').classList.add('hidden');
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

      if (response.ok && data.user.role === 'delivery') {
        this.currentUser = data.user;
        document.getElementById('delivery-name').textContent = data.user.name;
        await this.loadDeliveryData();
        this.showDashboard();
      } else {
        this.showError(data.message || 'Error de autenticación');
      }
    } catch (error) {
      console.error('Error:', error);
      this.showError('Error de conexión');
    }
  }

  async loadDeliveryData() {
    await Promise.all([
      this.loadMyDeliveries(),
      this.loadAvailableOrders(),
      this.calculateEarnings()
    ]);
    this.updateDashboard();
  }

  async loadAvailableOrders() {
    try {
      this.showLoading();
      const response = await fetch('http://localhost:5050/delivery/orders');
      const orders = await response.json();
      this.availableOrders = orders;
      this.renderAvailableOrders();
    } catch (error) {
      console.error('Error loading available orders:', error);
    } finally {
      this.hideLoading();
    }
  }

  async loadMyDeliveries() {
    try {
      const response = await fetch(`http://localhost:5050/delivery/${this.currentUser.id}/orders`);
      const deliveries = await response.json();
      this.myDeliveries = deliveries;
      this.renderMyDeliveries();
    } catch (error) {
      console.error('Error loading my deliveries:', error);
    }
  }

  calculateEarnings() {
    const completedDeliveries = this.myDeliveries.filter(d => d.status === 'delivered');
    const todayDeliveries = completedDeliveries.filter(d => {
      const deliveryDate = new Date(d.createdAt).toDateString();
      const today = new Date().toDateString();
      return deliveryDate === today;
    });

    const todayEarnings = todayDeliveries.reduce((sum, d) => sum + (d.total * 0.1), 0);
    const totalEarnings = completedDeliveries.reduce((sum, d) => sum + (d.total * 0.1), 0);

    this.earnings = {
      today: todayEarnings,
      total: totalEarnings,
      deliveries: completedDeliveries,
      todayCount: todayDeliveries.length,
      totalCount: completedDeliveries.length
    };
  }

  updateDashboard() {
    const activeDeliveries = this.myDeliveries.filter(d => 
      ['accepted', 'picked-up', 'delivering'].includes(d.status)
    );

    document.getElementById('total-deliveries').textContent = this.earnings.totalCount;
    document.getElementById('active-deliveries').textContent = activeDeliveries.length;
    document.getElementById('earnings').textContent = `$${Math.round(this.earnings.today).toLocaleString()}`;

    const currentDelivery = activeDeliveries[0];
    if (currentDelivery) {
      this.showCurrentDelivery(currentDelivery);
    } else {
      this.hideCurrentDelivery();
    }
  }

  showCurrentDelivery(delivery) {
    const currentDeliveryDiv = document.getElementById('current-delivery');
    const deliveryInfo = document.getElementById('current-delivery-info');
    
    deliveryInfo.innerHTML = `
      <div class="current-delivery-header">
        <h4>Orden #${delivery.id}</h4>
        <span class="delivery-status status-${delivery.status}">${this.getStatusText(delivery.status)}</span>
      </div>
      <div class="current-delivery-details">
        <p><strong>Total:</strong> $${delivery.total.toLocaleString()}</p>
        <p><strong>Dirección:</strong> ${delivery.deliveryAddress}</p>
        <p><strong>Ganancia:</strong> $${Math.round(delivery.total * 0.1).toLocaleString()}</p>
      </div>
      <div class="current-delivery-actions">
        <button onclick="deliveryApp.showOrderDetails(${delivery.id})" class="primary">Ver Detalles</button>
        ${delivery.status === 'accepted' ? 
          `<button onclick="deliveryApp.pickupOrder(${delivery.id})" class="success">Marcar Recogido</button>` : 
          ''}
        ${delivery.status === 'picked-up' ? 
          `<button onclick="deliveryApp.completeDelivery(${delivery.id})" class="success">Completar Entrega</button>` : 
          ''}
      </div>
    `;
    
    currentDeliveryDiv.classList.remove('hidden');
  }

  hideCurrentDelivery() {
    document.getElementById('current-delivery').classList.add('hidden');
  }

  toggleAvailability(isAvailable) {
    this.isAvailable = isAvailable;
    document.getElementById('availability-text').textContent = 
      isAvailable ? 'Disponible' : 'No Disponible';
    
    if (isAvailable) {
      this.loadAvailableOrders();
      this.showSuccess('Ahora estás disponible para recibir órdenes');
    } else {
      this.showSuccess('Ya no estás disponible para nuevas órdenes');
    }
  }

  renderAvailableOrders() {
    const ordersContainer = document.getElementById('available-orders-list');
    ordersContainer.innerHTML = '';

    if (this.availableOrders.length === 0) {
      ordersContainer.innerHTML = `
        <div class="no-orders">
          <h3>No hay órdenes disponibles</h3>
          <p>Las nuevas órdenes aparecerán aquí automáticamente</p>
        </div>
      `;
      return;
    }

    this.availableOrders.forEach(order => {
      const orderCard = document.createElement('div');
      orderCard.className = 'order-card available-order';
      
      const orderDate = new Date(order.createdAt).toLocaleString();
      const estimatedEarning = Math.round(order.total * 0.1);
      
      orderCard.innerHTML = `
        <div class="order-header">
          <h4>Orden #${order.id}</h4>
          <span class="order-earning">+$${estimatedEarning.toLocaleString()}</span>
        </div>
        <div class="order-info">
          <p><strong>Total del pedido:</strong> $${order.total.toLocaleString()}</p>
          <p><strong>Productos:</strong> ${order.products.length} items</p>
          <p><strong>Dirección:</strong> ${order.deliveryAddress}</p>
          <p><strong>Creado:</strong> ${orderDate}</p>
        </div>
        <div class="order-actions">
          <button onclick="deliveryApp.showOrderDetails(${order.id})" class="secondary">Ver Detalles</button>
          <button onclick="deliveryApp.acceptDelivery(${order.id})" class="primary">Aceptar Entrega</button>
        </div>
      `;
      
      ordersContainer.appendChild(orderCard);
    });
  }

  renderMyDeliveries() {
    const deliveriesContainer = document.getElementById('deliveries-list');
    deliveriesContainer.innerHTML = '';

    if (this.myDeliveries.length === 0) {
      deliveriesContainer.innerHTML = `
        <div class="no-orders">
          <h3>No tienes entregas asignadas</h3>
          <p>Las entregas que aceptes aparecerán aquí</p>
        </div>
      `;
      return;
    }

    this.myDeliveries.forEach(delivery => {
      const deliveryCard = document.createElement('div');
      deliveryCard.className = `order-card delivery-card status-${delivery.status}`;
      
      const orderDate = new Date(delivery.createdAt).toLocaleString();
      const earning = Math.round(delivery.total * 0.1);
      
      deliveryCard.innerHTML = `
        <div class="order-header">
          <h4>Orden #${delivery.id}</h4>
          <span class="delivery-status">${this.getStatusText(delivery.status)}</span>
        </div>
        <div class="order-info">
          <p><strong>Total:</strong> $${delivery.total.toLocaleString()}</p>
          <p><strong>Ganancia:</strong> $${earning.toLocaleString()}</p>
          <p><strong>Dirección:</strong> ${delivery.deliveryAddress}</p>
          <p><strong>Fecha:</strong> ${orderDate}</p>
        </div>
        <div class="order-actions">
          <button onclick="deliveryApp.showOrderDetails(${delivery.id})" class="secondary">Ver Detalles</button>
          ${this.getDeliveryActionButton(delivery)}
        </div>
      `;
      
      deliveriesContainer.appendChild(deliveryCard);
    });
  }

  getDeliveryActionButton(delivery) {
    switch (delivery.status) {
      case 'accepted':
        return `<button onclick="deliveryApp.pickupOrder(${delivery.id})" class="success">Marcar Recogido</button>`;
      case 'picked-up':
        return `<button onclick="deliveryApp.completeDelivery(${delivery.id})" class="success">Completar Entrega</button>`;
      case 'delivered':
        return `<span class="completed-badge">✅ Completada</span>`;
      default:
        return '';
    }
  }

  getStatusText(status) {
    const statusMap = {
      'pending': 'Pendiente',
      'accepted': 'Aceptada',
      'picked-up': 'Recogida',
      'delivering': 'En camino',
      'delivered': 'Entregada',
      'cancelled': 'Cancelada'
    };
    return statusMap[status] || status;
  }

  filterDeliveries(filter) {
    const filteredDeliveries = filter === 'all' 
      ? this.myDeliveries 
      : this.myDeliveries.filter(delivery => delivery.status === filter);
    
    const deliveriesContainer = document.getElementById('deliveries-list');
    deliveriesContainer.innerHTML = '';

    filteredDeliveries.forEach(delivery => {
      const deliveryCard = document.createElement('div');
      deliveryCard.className = `order-card delivery-card status-${delivery.status}`;
      
      const orderDate = new Date(delivery.createdAt).toLocaleString();
      const earning = Math.round(delivery.total * 0.1);
      
      deliveryCard.innerHTML = `
        <div class="order-header">
          <h4>Orden #${delivery.id}</h4>
          <span class="delivery-status">${this.getStatusText(delivery.status)}</span>
        </div>
        <div class="order-info">
          <p><strong>Total:</strong> $${delivery.total.toLocaleString()}</p>
          <p><strong>Ganancia:</strong> $${earning.toLocaleString()}</p>
          <p><strong>Dirección:</strong> ${delivery.deliveryAddress}</p>
          <p><strong>Fecha:</strong> ${orderDate}</p>
        </div>
        <div class="order-actions">
          <button onclick="deliveryApp.showOrderDetails(${delivery.id})" class="secondary">Ver Detalles</button>
          ${this.getDeliveryActionButton(delivery)}
        </div>
      `;
      
      deliveriesContainer.appendChild(deliveryCard);
    });
  }

  showOrderDetails(orderId) {
    const order = this.availableOrders.find(o => o.id === orderId) || 
                   this.myDeliveries.find(o => o.id === orderId);
    if (!order) return;

    this.currentOrder = order;
    
    document.getElementById('modal-order-number').textContent = order.id;
    
    const orderDetails = document.getElementById('modal-order-details');
    const earning = Math.round(order.total * 0.1);
    
    orderDetails.innerHTML = `
      <div class="order-detail-section">
        <h3>Información de la Entrega</h3>
        <p><strong>Estado:</strong> ${this.getStatusText(order.status)}</p>
        <p><strong>Fecha:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
        <p><strong>Total del pedido:</strong> $${order.total.toLocaleString()}</p>
        <p><strong>Tu ganancia:</strong> $${earning.toLocaleString()}</p>
        <p><strong>Método de pago:</strong> ${order.paymentMethod}</p>
      </div>
      
      <div class="order-detail-section">
        <h3>Dirección de Entrega</h3>
        <p class="delivery-address">${order.deliveryAddress}</p>
      </div>
      
      <div class="order-detail-section">
        <h3>Productos a Entregar</h3>
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

    const isAvailable = this.availableOrders.some(o => o.id === orderId);
    const isMyDelivery = this.myDeliveries.some(o => o.id === orderId);
    
    document.getElementById('accept-delivery').classList.toggle('hidden', !isAvailable);
    document.getElementById('pickup-order').classList.toggle('hidden', 
      !(isMyDelivery && order.status === 'accepted'));
    document.getElementById('complete-delivery').classList.toggle('hidden', 
      !(isMyDelivery && order.status === 'picked-up'));

    document.getElementById('order-modal').classList.remove('hidden');
  }

  hideOrderModal() {
    document.getElementById('order-modal').classList.add('hidden');
    this.currentOrder = null;
  }

  async acceptDelivery(orderId = null) {
    const orderToAccept = orderId ? 
      this.availableOrders.find(o => o.id === orderId) : this.currentOrder;
    
    if (!orderToAccept) return;

    try {
      const response = await fetch(`http://localhost:5050/delivery/orders/${orderToAccept.id}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deliveryPersonId: this.currentUser.id })
      });

      const data = await response.json();

      if (response.ok) {
        this.showSuccess('Entrega aceptada exitosamente');
        this.hideOrderModal();
        await this.loadDeliveryData();
      } else {
        this.showError(data.message || 'Error al aceptar la entrega');
      }
    } catch (error) {
      console.error('Error:', error);
      this.showError('Error de conexión');
    }
  }

  async pickupOrder(orderId = null) {
    const orderToPickup = orderId ? 
      this.myDeliveries.find(o => o.id === orderId) : this.currentOrder;
    
    if (!orderToPickup) return;

    try {
      orderToPickup.status = 'picked-up';
      this.showSuccess('Orden marcada como recogida');
      this.hideOrderModal();
      await this.loadDeliveryData();
    } catch (error) {
      console.error('Error:', error);
      this.showError('Error al marcar como recogida');
    }
  }

  async completeDelivery(orderId = null) {
    const orderToComplete = orderId ? 
      this.myDeliveries.find(o => o.id === orderId) : this.currentOrder;
    
    if (!orderToComplete) return;

    try {
      orderToComplete.status = 'delivered';
      orderToComplete.deliveredAt = new Date().toISOString();
      
      const earning = Math.round(orderToComplete.total * 0.1);
      this.showSuccess(`Entrega completada! Ganaste $${earning.toLocaleString()}`);
      this.hideOrderModal();
      await this.loadDeliveryData();
    } catch (error) {
      console.error('Error:', error);
      this.showError('Error al completar la entrega');
    }
  }

  showAvailableOrders() {
    this.loadAvailableOrders();
    this.showScreen('available-screen');
  }

  showMyDeliveries() {
    this.loadMyDeliveries();
    this.showScreen('deliveries-screen');
  }

  showEarnings() {
    this.renderEarnings();
    this.showScreen('earnings-screen');
  }

  renderEarnings() {
    document.getElementById('completed-today').textContent = this.earnings.todayCount;
    document.getElementById('total-earnings').textContent = `$${Math.round(this.earnings.today).toLocaleString()}`;
    document.getElementById('average-earning').textContent = this.earnings.todayCount > 0 ? 
      `$${Math.round(this.earnings.today / this.earnings.todayCount).toLocaleString()}` : '$0';

    const earningsContainer = document.getElementById('earnings-list');
    earningsContainer.innerHTML = '';

    if (this.earnings.deliveries.length === 0) {
      earningsContainer.innerHTML = `
        <div class="no-earnings">
          <h3>No hay entregas completadas</h3>
          <p>Tus entregas completadas aparecerán aquí</p>
        </div>
      `;
      return;
    }

    this.earnings.deliveries.forEach(delivery => {
      const earning = Math.round(delivery.total * 0.1);
      const deliveryDate = new Date(delivery.deliveredAt || delivery.createdAt);
      
      const earningItem = document.createElement('div');
      earningItem.className = 'earning-item-card';
      
      earningItem.innerHTML = `
        <div class="earning-header">
          <h4>Orden #${delivery.id}</h4>
          <span class="earning-amount">+$${earning.toLocaleString()}</span>
        </div>
        <div class="earning-details">
          <p><strong>Total del pedido:</strong> $${delivery.total.toLocaleString()}</p>
          <p><strong>Fecha:</strong> ${deliveryDate.toLocaleDateString()}</p>
          <p><strong>Dirección:</strong> ${delivery.deliveryAddress}</p>
        </div>
      `;
      
      earningsContainer.appendChild(earningItem);
    });
  }

  showDashboard() {
    this.updateDashboard();
    this.showScreen('dashboard-screen');
  }

  logout() {
    // Vuelve a la main
    window.location.href = '../';
  }
}

const deliveryApp = new DeliveryApp();