const express = require("express")
const cors = require("cors")
const path = require("path")

const app = express()


app.use(cors())
app.use(express.json())


app.use("/app1", express.static(path.join(__dirname, "app1"))) // Consumidor
app.use("/app2", express.static(path.join(__dirname, "app2"))) // Tienda
app.use("/app3", express.static(path.join(__dirname, "app3"))) // Repartidor


let users = [
  { id: 1, email: "consumer@test.com", password: "123456", role: "consumer", name: "Juan Pérez" },
  { id: 2, email: "store@test.com", password: "123456", role: "store", name: "Tienda Central", address: "Calle 123" },
  { id: 3, email: "delivery@test.com", password: "123456", role: "delivery", name: "Carlos Repartidor" }
]

let stores = [
  { id: 1, name: "Restaurante Italiano", type: "restaurant", address: "Av. Principal 456", isOpen: true, products: [] },
  { id: 2, name: "Farmacia Salud", type: "pharmacy", address: "Calle Comercial 789", isOpen: true, products: [] },
  { id: 3, name: "Supermercado Fresh", type: "supermarket", address: "Plaza Mayor 321", isOpen: false, products: [] }
]

let products = [
  { id: 1, storeId: 1, name: "Pizza Margherita", price: 25000, category: "food", available: true },
  { id: 2, storeId: 1, name: "Pasta Carbonara", price: 22000, category: "food", available: true },
  { id: 3, storeId: 2, name: "Acetaminofén", price: 8000, category: "medicine", available: true },
  { id: 4, storeId: 3, name: "Leche", price: 4500, category: "grocery", available: true }
]

let orders = []
let pendingOrders = []

// ========================
// RUTAS PARA CONSUMIDORES
// ========================

// Login general
app.post("/login", (req, res) => {
  const { email, password } = req.body
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email y contraseña son requeridos" })
  }

  const user = users.find(u => u.email === email && u.password === password)
  
  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado o credenciales incorrectas" })
  }

  res.status(200).json({ 
    message: "Login exitoso",
    user: { id: user.id, email: user.email, role: user.role, name: user.name }
  })
})

// Obtener todas las tiendas disponibles
app.get("/stores", (req, res) => {
  const availableStores = stores.filter(store => store.isOpen)
  res.status(200).json(availableStores)
})

// Obtener productos de una tienda específica
app.get("/stores/:storeId/products", (req, res) => {
  const storeId = parseInt(req.params.storeId)
  const storeProducts = products.filter(p => p.storeId === storeId && p.available)
  res.status(200).json(storeProducts)
})

// Crear una nueva orden
app.post("/orders", (req, res) => {
  const { userId, storeId, products: orderProducts, deliveryAddress, paymentMethod } = req.body
  
  if (!userId || !storeId || !orderProducts || !deliveryAddress || !paymentMethod) {
    return res.status(400).json({ message: "Faltan campos requeridos" })
  }

  // Calcular total
  let total = 0
  const validProducts = []
  
  for (let orderProduct of orderProducts) {
    const product = products.find(p => p.id === orderProduct.productId && p.available)
    if (product) {
      validProducts.push({
        ...product,
        quantity: orderProduct.quantity
      })
      total += product.price * orderProduct.quantity
    }
  }

  const newOrder = {
    id: orders.length + 1,
    userId,
    storeId,
    products: validProducts,
    total,
    deliveryAddress,
    paymentMethod,
    status: "pending",
    createdAt: new Date().toISOString()
  }

  orders.push(newOrder)
  pendingOrders.push(newOrder)

  res.status(201).json({ 
    message: "Orden creada exitosamente",
    order: newOrder 
  })
})

// Obtener órdenes de un usuario
app.get("/users/:userId/orders", (req, res) => {
  const userId = parseInt(req.params.userId)
  const userOrders = orders.filter(order => order.userId === userId)
  res.status(200).json(userOrders)
})

// ========================
// RUTAS PARA TIENDAS
// ========================

// Activar/desactivar tienda
app.put("/stores/:storeId/status", (req, res) => {
  const storeId = parseInt(req.params.storeId)
  const { isOpen } = req.body
  
  const store = stores.find(s => s.id === storeId)
  if (!store) {
    return res.status(404).json({ message: "Tienda no encontrada" })
  }

  store.isOpen = isOpen
  res.status(200).json({ 
    message: `Tienda ${isOpen ? 'activada' : 'desactivada'} exitosamente`,
    store 
  })
})

// Crear producto
app.post("/stores/:storeId/products", (req, res) => {
  const storeId = parseInt(req.params.storeId)
  const { name, price, category } = req.body
  
  if (!name || !price || !category) {
    return res.status(400).json({ message: "Nombre, precio y categoría son requeridos" })
  }

  const newProduct = {
    id: products.length + 1,
    storeId,
    name,
    price,
    category,
    available: true
  }

  products.push(newProduct)
  res.status(201).json({ 
    message: "Producto creado exitosamente",
    product: newProduct 
  })
})

// Obtener órdenes de una tienda
app.get("/stores/:storeId/orders", (req, res) => {
  const storeId = parseInt(req.params.storeId)
  const storeOrders = orders.filter(order => order.storeId === storeId)
  res.status(200).json(storeOrders)
})

// ========================
// RUTAS PARA REPARTIDORES
// ========================

// Obtener órdenes pendientes
app.get("/delivery/orders", (req, res) => {
  const availableOrders = pendingOrders.filter(order => order.status === "pending")
  res.status(200).json(availableOrders)
})

// Aceptar una orden
app.put("/delivery/orders/:orderId/accept", (req, res) => {
  const orderId = parseInt(req.params.orderId)
  const { deliveryPersonId } = req.body
  
  const order = orders.find(o => o.id === orderId)
  if (!order) {
    return res.status(404).json({ message: "Orden no encontrada" })
  }

  if (order.status !== "pending") {
    return res.status(400).json({ message: "Esta orden ya no está disponible" })
  }

  order.status = "accepted"
  order.deliveryPersonId = deliveryPersonId
  order.acceptedAt = new Date().toISOString()

  // Remover de órdenes pendientes
  const pendingIndex = pendingOrders.findIndex(o => o.id === orderId)
  if (pendingIndex > -1) {
    pendingOrders.splice(pendingIndex, 1)
  }

  res.status(200).json({ 
    message: "Orden aceptada exitosamente",
    order 
  })
})

// Obtener órdenes aceptadas por un repartidor
app.get("/delivery/:deliveryPersonId/orders", (req, res) => {
  const deliveryPersonId = parseInt(req.params.deliveryPersonId)
  const deliveryOrders = orders.filter(order => order.deliveryPersonId === deliveryPersonId)
  res.status(200).json(deliveryOrders)
})

// Ruta para obtener todos los usuarios (para pruebas)
app.get("/users", (req, res) => { 
  res.status(200).json(users)
})

// Ruta para pruebas con parámetros query
app.get("/obtener", (req, res) => {
  const { search, age } = req.query
  res.status(200).json({ 
    message: "Parámetros recibidos",
    search,
    age: age ? parseInt(age) : undefined 
  })
})

// Crear usuario (para pruebas)
app.post("/crear", (req, res) => {
  const { name, age, job } = req.body
  const newUser = { id: users.length + 1, name, age, job }
  users.push(newUser)
  res.status(201).json(newUser)
})

// Actualizar usuario (para pruebas)
app.put("/actualizar/:id", (req, res) => {
  const id = parseInt(req.params.id)
  const { name, age, job } = req.body
  const userIndex = users.findIndex(u => u.id === id)
  
  if (userIndex === -1) {
    return res.status(404).json({ message: "Usuario no encontrado" })
  }
  
  users[userIndex] = { ...users[userIndex], name, age, job }
  res.status(200).json(users[userIndex])
})

const PORT = 5050
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
  console.log(`App Consumidor: http://localhost:${PORT}/app1`)
  console.log(`App Tienda: http://localhost:${PORT}/app2`) 
  console.log(`App Repartidor: http://localhost:${PORT}/app3`)
})