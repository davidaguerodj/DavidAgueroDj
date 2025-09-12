const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Configura tu Access Token (esto es seguro aquí)
mercadopago.configurations.setAccessToken('APP_USR-2478348030974812-091213-7332e56fc76719f66d7b22de819e94f5-2689080436');

// 📦 Simulación de base de datos temporal (en producción usa MongoDB, Firebase, etc.)
const pagosPendientes = {};

// 🔍 Ruta para verificar si un pago fue aprobado
app.post('/verificar-pago', async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Falta sessionId' });
  }

  try {
    // 🔍 Buscar el ID de pago asociado al sessionId
    const paymentId = pagosPendientes[sessionId];

    if (!paymentId) {
      return res.json({ aprobado: false, mensaje: 'No se encontró pago con ese sessionId' });
    }

    // ✅ Consultar el estado del pago en Mercado Pago
    const response = await mercadopago.payment.findById(paymentId);
    const pago = response.body;

    if (pago.status === 'approved') {
      res.json({ aprobado: true, monto: pago.transaction_amount });
    } else {
      res.json({ aprobado: false, estado: pago.status });
    }
  } catch (error) {
    console.error('❌ Error al verificar pago:', error);
    res.status(500).json({ error: 'Error interno al verificar pago' });
  }
});

// 💳 Ruta para registrar un pago (cuando se crea)
app.post('/registrar-pago', (req, res) => {
  const { sessionId, paymentId } = req.body;

  if (!sessionId || !paymentId) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  pagosPendientes[sessionId] = paymentId;
  res.json({ mensaje: 'Pago registrado correctamente' });
});

// 🚀 Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
