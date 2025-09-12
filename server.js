// server.js - Backend + Frontend + YouTube API (Render ready)
const express = require('express');
const cors = require('cors');
const path = require('path');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Configs
const YOUTUBE_API_KEY = 'AIzaSyC8Ih8ETEbnGIDLBZxP-XmLlG4l1L9xi7g'; // ✅ Tu key actual
const client = new MercadoPagoConfig({
  accessToken: 'APP_USR-2478348030974812-091213-7332e56fc76719f66d7b22de819e94f5-2689080436'
});
const payment = new Payment(client);

// 📦 Base de datos temporal
const pagosPendientes = {};

// 🌐 Servir archivos estáticos (index.html)
app.use(express.static(__dirname));

// 🔍 Buscar canciones en YouTube (backend hace la llamada)
app.get('/buscar-canciones', async (req, res) => {
  const query = req.query.q;
  if (!query || query.length < 2) return res.json([]);

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.items) return res.json([]);

    const resultados = data.items.map(item => ({
      id: item.id.videoId,
      titulo: item.snippet.title,
      artista: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.default.url
    }));

    res.json(resultados);
  } catch (error) {
    console.error('❌ Error buscando en YouTube:', error);
    res.json([]); // Devuelve vacío si falla
  }
});

// 🔍 Verificar pago
app.post('/verificar-pago', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Falta sessionId' });

  try {
    const paymentId = pagosPendientes[sessionId];
    if (!paymentId) return res.json({ aprobado: false });

    const response = await payment.get({ id: paymentId });
    res.json({ aprobado: response.status === 'approved', monto: response.transaction_amount });
  } catch (error) {
    console.error('❌ Error al verificar:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// 💳 Registrar pago
app.post('/registrar-pago', (req, res) => {
  const { sessionId, paymentId } = req.body;
  if (!sessionId || !paymentId) return res.status(400).json({ error: 'Faltan datos' });
  pagosPendientes[sessionId] = paymentId;
  res.json({ mensaje: 'Pago registrado' });
});

// 🚀 Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor en puerto ${PORT}`));
