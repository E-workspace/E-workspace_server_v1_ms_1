const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const protectedRoutes = require('./routes/protectedRoutes');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const xss = require('xss-clean');
const csurf = require('csurf');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const limiter = require('./middlewares/rateLimiter');

dotenv.config();
connectDB();
const app = express();

// Security middlewares
app.use(helmet());
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", 'https://apis.google.com'],
            styleSrc: ["'self'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:'],
            connectSrc: ["'self'"],
        },
    })
);
app.use(hpp());
app.use(xss());

// CORS configuration for live and local environments
const corsOptions = {
    origin: [
        'https://e-workspace-peach.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'csrf-token'],
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: 'none', // Ensures compatibility in cross-origin requests
            maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
        },
    })
);

// CSRF protection middleware configuration
const csrfProtection = csurf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
    },
});
app.use(csrfProtection);

// Log CSRF token for debugging
app.use((req, res, next) => {
    console.log('Session Details:', req.session);
    console.log('CSRF Token:', req.csrfToken());
    res.cookie('XSRF-TOKEN', req.csrfToken(), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
    });
    next();
});

// Rate limiter middleware
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);

// CSRF token route for frontend retrieval
app.get('/api/csrf-token', (req, res) => {
    const csrfToken = req.csrfToken();
    res.cookie('XSRF-TOKEN', csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
    });
    res.json({ csrfToken });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
