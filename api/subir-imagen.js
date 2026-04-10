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
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
}

const bucket = admin.storage().bucket();

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método no permitido" });
    }

    const form = formidable({ multiples: false });

    try {
        const { fields, files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                else resolve({ fields, files });
            });
        });

       const archivo = files.imagen;

        if (!archivo) {
            return res.status(400).json({ error: "No se envió archivo" });
        }

        const filePath = archivo.filepath;
        const fileName = `imagenes/${Date.now()}_${archivo.originalFilename}`;

        // 🔥 Subir a Firebase Storage
        await bucket.upload(filePath, {
            destination: fileName,
            metadata: {
                contentType: archivo.mimetype,
            },
        });

        const file = bucket.file(fileName);
        await file.makePublic();

        const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        fs.unlinkSync(filePath);

        return res.status(200).json({
            ok: true,
            url: url,
        });

    } catch (error) {
        console.error("🔥 ERROR REAL BACKEND:", error);
        return res.status(500).json({
            error: "Error interno",
            detalle: error.message
        });
    }
}
