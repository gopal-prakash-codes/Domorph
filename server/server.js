import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import searchRoutes from './routes/search.js';

dotenv.config();
const app = express();
app.use(express.json());


app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/api', searchRoutes);


app.get('/', (req, res) => {
  res.send('Server is running properly');
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});



