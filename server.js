// server.js - Backend para verificar pagos con Mercado Pago (versión 2025)
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Access Token (seguro en servidor)
const client = new MercadoPagoConfig({
  accessToken: 'APP_USR-2478348030974812-091213-7332e56fc76719f66d7b22de819e94f5-2689080436'
});

const payment = new Payment(client);

// 📦 Base de datos temporal
const pagosPendientes = {};

// 🔍 Ruta para verificar pago
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
