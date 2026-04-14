import formidable from "formidable";
import fs from "fs";
import admin from "firebase-admin";

// 🔥 Desactivar bodyParser de Vercel
export const config = {
    api: {
        bodyParser: false,
    },
};

// 🔐 Inicializar Firebase Admin SOLO una vez
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        storageBucket: "studio-hair-demo.firebasestorage.app",
    });
}

// ⚠️ Usamos explícitamente el bucket correcto
const bucket = admin.storage().bucket("studio-hair-demo.firebasestorage.app");

export default async function handler(req, res) {
    console.log("🚀 Entró al handler de subir-video");

    if (req.method !== "POST") {
        console.log("❌ Método incorrecto:", req.method);
        return res.status(405).json({ error: "Método no permitido" });
    }

    const form = formidable({ multiples: false });

    try {
        console.log("📥 Parseando form de video...");

        const { files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) {
                    console.error("❌ Error en form.parse:", err);
                    reject(err);
                } else {
                    resolve({ fields, files });
                }
            });
        });

        console.log("📦 Files recibidos:", files);

        let archivo = files.video || files.file;

        if (Array.isArray(archivo)) {
            archivo = archivo[0];
        }

        if (!archivo) {
            console.log("❌ No llegó video");
            return res.status(400).json({ error: "No se envió video" });
        }

        console.log("📄 Video detectado:", archivo);

        const filePath = archivo.filepath;

        if (!filePath) {
            console.log("❌ filePath undefined");
            return res.status(400).json({ error: "Archivo inválido (sin filepath)" });
        }

        // 🔥 VALIDACIÓN MIME
        if (!archivo.mimetype || !archivo.mimetype.includes("mp4")) {
            console.log("❌ Tipo inválido:", archivo.mimetype);
            return res.status(400).json({ error: "Solo se permiten videos MP4" });
        }

        const fileName = `videos/hero_${Date.now()}_${archivo.originalFilename || "video.mp4"}`;

        console.log("☁️ Subiendo video a Firebase:", fileName);

        await bucket.upload(filePath, {
            destination: fileName,
            metadata: {
                contentType: archivo.mimetype,
            },
        });

        const file = bucket.file(fileName);

        console.log("🌍 Haciendo público...");
        await file.makePublic();

        const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        console.log("✅ URL generada:", url);

        fs.unlinkSync(filePath);

        return res.status(200).json({
            ok: true,
            url: url,
        });

    } catch (error) {
        console.error("🔥 ERROR BACKEND REAL SUBIR VIDEO:", error);

        return res.status(500).json({
            error: "Error interno",
            detalle: error.message,
            stack: error.stack
        });
    }
}
