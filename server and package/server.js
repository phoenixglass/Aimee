const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Simple in-memory database (will reset when server restarts)
// In production, you'd use a real database like PostgreSQL
let wines = [
    {
        id: 1,
        wine_name: "Pinot Noir",
        price: "$18",
        inventory: 120,
        customer_last_ordered: "Thompson Restaurant"
    },
    {
        id: 2,
        wine_name: "Cabernet Sauvignon",
        price: "$35",
        inventory: 12,
        customer_last_ordered: "Johnson Winery"
    },
    {
        id: 3,
        wine_name: "Syrah",
        price: "$25",
        inventory: 0,
        customer_last_ordered: "Westport Spirits"
    }
];

let queryLogs = [];
let nextWineId = 4;

// Simple authentication (replace with real auth in production)
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Middleware to verify token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Routes

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'Wine Inventory API is running!' });
});

// Login (simple auth - replace with real authentication)
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    // Simple hardcoded auth (replace with real user database)
    if (username === 'admin' && password === 'wine123') {
        const token = jwt.sign({ username, id: 1 }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ 
            token, 
            user: { username, id: 1 }
        });
    } else {
        res.status(401).json({ error: 'Invalid username or password' });
    }
});

// Get all wines
app.get('/api/inventory', authenticateToken, (req, res) => {
    res.json(wines);
});

// Add new wine
app.post('/api/inventory', authenticateToken, (req, res) => {
    const { wine_name, price, inventory, customer_last_ordered } = req.body;
    
    if (!wine_name || !price || inventory === undefined || !customer_last_ordered) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    const newWine = {
        id: nextWineId++,
        wine_name,
        price,
        inventory: parseInt(inventory),
        customer_last_ordered
    };
    
    wines.push(newWine);
    res.json(newWine);
});

// Update wine
app.put('/api/inventory/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const { wine_name, price, inventory, customer_last_ordered } = req.body;
    
    const wineIndex = wines.findIndex(w => w.id === id);
    if (wineIndex === -1) {
        return res.status(404).json({ error: 'Wine not found' });
    }
    
    wines[wineIndex] = {
        id,
        wine_name,
        price,
        inventory: parseInt(inventory),
        customer_last_ordered
    };
    
    res.json(wines[wineIndex]);
});

// Delete wine
app.delete('/api/inventory/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const wineIndex = wines.findIndex(w => w.id === id);
    
    if (wineIndex === -1) {
        return res.status(404).json({ error: 'Wine not found' });
    }
    
    wines.splice(wineIndex, 1);
    res.json({ message: 'Wine deleted successfully' });
});

// Log query
app.post('/api/logs', authenticateToken, (req, res) => {
    const { query, response, timestamp } = req.body;
    
    const logEntry = {
        id: Date.now(),
        query,
        response,
        timestamp: timestamp || new Date().toISOString(),
        userId: req.user.id
    };
    
    queryLogs.unshift(logEntry);
    
    // Keep only last 100 logs
    if (queryLogs.length > 100) {
        queryLogs = queryLogs.slice(0, 100);
    }
    
    res.json(logEntry);
});

// Get query history
app.get('/api/logs', authenticateToken, (req, res) => {
    res.json(queryLogs);
});

// Get analytics
app.get('/api/analytics', authenticateToken, (req, res) => {
    const totalQueries = queryLogs.length;
    const totalWines = wines.length;
    const totalBottles = wines.reduce((sum, wine) => sum + wine.inventory, 0);
    const totalValue = wines.reduce((sum, wine) => {
        const price = parseFloat(wine.price.replace('$', ''));
        return sum + (price * wine.inventory);
    }, 0);
    
    res.json({
        totalQueries,
        totalWines,
        totalBottles,
        totalValue: Math.round(totalValue)
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🍷 Wine Inventory API running on port ${PORT}`);
    console.log(`📍 API URL: http://localhost:${PORT}`);
    console.log(`🔑 Login credentials: admin / wine123`);
});