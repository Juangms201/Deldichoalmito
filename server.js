const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear cuerpos JSON y formularios URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Directorios para almacenar los archivos subidos
const IMAGE_UPLOAD_PATH = path.join(__dirname, 'uploads', 'images');
const VIDEO_UPLOAD_PATH = path.join(__dirname, 'uploads', 'videos');

// Asegurarse de que los directorios existen
fs.mkdirSync(IMAGE_UPLOAD_PATH, { recursive: true });
fs.mkdirSync(VIDEO_UPLOAD_PATH, { recursive: true });

// Configuración de multer para almacenar archivos según su campo
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'forumImageUpload') {
      cb(null, IMAGE_UPLOAD_PATH);
    } else if (file.fieldname === 'forumVideoUpload') {
      cb(null, VIDEO_UPLOAD_PATH);
    } else {
      cb(null, 'uploads/others'); // Opción por defecto
    }
  },
  filename: function (req, file, cb) {
    // Genera un nombre único usando la fecha
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, basename + '-' + Date.now() + ext);
  }
});

const upload = multer({ storage });

// "Base de datos" en memoria para almacenar las publicaciones del foro
let forumPosts = [];

/**
 * Endpoint para gestionar la subida de contenido desde el foro.
 * Espera:
 *  - Un campo 'forumImageUpload' (archivo de imagen) (opcional)
 *  - Un campo 'forumVideoUpload' (archivo de video) (opcional)
 *  - Un campo 'forumLink' (string, URL) (opcional)
 */
app.post('/api/forum/upload', upload.fields([
  { name: 'forumImageUpload', maxCount: 1 },
  { name: 'forumVideoUpload', maxCount: 1 }
]), (req, res) => {
  const { forumLink } = req.body;
  const imageFile = req.files['forumImageUpload'] ? req.files['forumImageUpload'][0] : null;
  const videoFile = req.files['forumVideoUpload'] ? req.files['forumVideoUpload'][0] : null;

  // Crear un registro de publicación pendiente de moderación
  const newPost = {
    id: forumPosts.length + 1,
    image: imageFile ? imageFile.filename : null,
    video: videoFile ? videoFile.filename : null,
    link: forumLink || null,
    pending: true,
    createdAt: new Date()
  };

  forumPosts.push(newPost);
  console.log('Nueva publicación en el foro:', newPost);

  res.json({ message: 'Tu publicación ha sido enviada para moderación.', post: newPost });
});

/**
 * Endpoint para obtener las publicaciones (útil para moderación o visualización).
 */
app.get('/api/forum/posts', (req, res) => {
  res.json({ posts: forumPosts });
});

/**
 * Endpoint para aprobar una publicación (cambia su estado de "pendiente" a aprobada).
 * NOTA: Este endpoint es muy básico y no incluye autenticación.
 */
app.post('/api/forum/approve/:id', (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const post = forumPosts.find(p => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Publicación no encontrada.' });
  }
  post.pending = false;
  res.json({ message: 'Publicación aprobada.', post });
});

// Servir archivos estáticos de las carpetas de uploads (para acceder a imágenes y videos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
