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

// 📦 Base de datos temporal con limpieza automática
const pagosPendientes = {};
const LIMPIEZA_INTERVALO = 60 * 60 * 1000; // 1 hora en milisegundos

// Función para limpiar pagos pendientes antiguos
function limpiarPagosAntiguos() {
  const ahora = Date.now();
  Object.keys(pagosPendientes).forEach(sessionId => {
    // Eliminar pagos pendientes de más de 24 horas
    if (ahora - sessionId > 24 * 60 * 60 * 1000) {
      delete pagosPendientes[sessionId];
    }
  });
  console.log('✅ Limpieza de pagos pendientes completada');
}

// Configurar limpieza periódica
setInterval(limpiarPagosAntiguos, LIMPIEZA_INTERVALO);

// 🌐 Servir archivos estáticos (index.html)
app.use(express.static(__dirname));

// 🔍 Buscar canciones en YouTube (backend hace la llamada)
app.get('/buscar-canciones', async (req, res) => {
  const query = req.query.q;
  
  // Validación más robusta
  if (!query || query.length < 2) {
    return res.status(400).json({ 
      error: 'La consulta debe tener al menos 2 caracteres',
      resultados: [] 
    });
  }
  
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error en la respuesta de YouTube: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return res.json({ 
        mensaje: 'No se encontraron resultados',
        resultados: [] 
      });
    }
    
    const resultados = data.items.map(item => ({
      id: item.id.videoId,
      titulo: item.snippet.title,
      artista: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.default.url
    }));
    
    res.json({ resultados });
  } catch (error) {
    console.error('❌ Error buscando en YouTube:', error);
    res.status(500).json({ 
      error: 'Error al buscar canciones en YouTube',
      resultados: [] 
    });
  }
});

// 🔍 Verificar pago
app.post('/verificar-pago', async (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ 
      error: 'Falta sessionId',
      aprobado: false 
    });
  }
  
  try {
    const paymentId = pagosPendientes[sessionId];
    
    if (!paymentId) {
      return res.json({ 
        mensaje: 'No hay un pago pendiente para esta sesión',
        aprobado: false 
      });
    }
    
    const response = await payment.get({ id: paymentId });
    
    // Verificar si el pago está aprobado
    const aprobado = response.status === 'approved';
    
    // Si el pago está aprobado, eliminamos de pendientes
    if (aprobado) {
      delete pagosPendientes[sessionId];
    }
    
    res.json({ 
      aprobado, 
      monto: response.transaction_amount,
      estado: response.status,
      fechaActualizacion: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error al verificar pago:', error);
    res.status(500).json({ 
      error: 'Error interno al verificar el pago',
      aprobado: false 
    });
  }
});

// 💳 Registrar pago
app.post('/registrar-pago', (req, res) => {
  const { sessionId, paymentId } = req.body;
  
  if (!sessionId || !paymentId) {
    return res.status(400).json({ 
      error: 'Faltan datos requeridos',
      registrado: false 
    });
  }
  
  // Registrar el pago pendiente
  pagosPendientes[sessionId] = paymentId;
  
  console.log(`✅ Pago registrado: ${paymentId} para sesión ${sessionId}`);
  
  res.json({ 
    mensaje: 'Pago registrado correctamente',
    registrado: true,
    sessionId
  });
});

// 🚀 Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor en puerto ${PORT}`));