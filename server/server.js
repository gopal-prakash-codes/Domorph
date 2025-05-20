import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import searchRoutes from './routes/search.js';

dotenv.config();
const app = express();
app.use(express.json())

const allowedOrigins = [process.env.CLIENT_URL, process.env.DEV_URL, process.env.EXTRA_URL];

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed'));
        }
      },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/api', searchRoutes);

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});



